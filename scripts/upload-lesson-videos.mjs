#!/usr/bin/env node
// Lesson videos on Cloudflare R2 (prompts/15).
//
//   npm run upload:lesson-videos -- --check            licence, author and length of each clip (no upload)
//   npm run upload:lesson-videos                       convert + upload missing clips, write the seed SQL
//   npm run upload:lesson-videos -- --only react-native-basics/1
//   npm run upload:lesson-videos -- --sql-only         rewrite the seed SQL from what's already in R2
//
// Reads supabase/seeds/source/lesson-videos.json (one Wikimedia Commons file per chapter),
// keeps only CC0 / CC BY / CC BY-SA / public domain clips, converts each to MP4 (H.264 + AAC,
// at most 720p, `+faststart`) with ffmpeg-static, uploads it to the private bucket with
// aws4fetch, and writes supabase/seeds/lesson-videos.sql (video_key + a credit line in each
// lesson's notes). `npm run db:push` then applies it, like the other seeds.
//
// Lesson resources (prompts/16): a chapter's optional `resources` list (Commons PDFs/SVGs…)
// is licence-checked the same way, uploaded as is to `resources/<course>-<chapter>-<n>.<ext>`
// and written as lesson_resources rows for every lesson of the chapter, with a plain-text credit.
//
// R2 keys come from .env.local WITHOUT the EXPO_PUBLIC_ prefix (scripts only, never bundled):
// R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.
import { spawn } from "node:child_process";
import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { fileURLToPath } from "node:url";

import { AwsClient } from "aws4fetch";
import ffmpegPath from "ffmpeg-static";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.join(root, "supabase/seeds/source/lesson-videos.json");
const SEED = path.join(root, "supabase/seeds/lesson-videos.sql");
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
// Wikimedia asks every client to identify itself.
const USER_AGENT = "SylloLessonVideos/1.0 (https://github.com/Kronium345; educational app seed script)";
const ALLOWED_LICENCE = /^(cc0|cc[ -]by(-sa)?([ -][\d.]+)?|public domain)\b/i;
const DEFAULT_MAX_SECONDS = 600;

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const sqlOnly = args.includes("--sql-only");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const stripHtml = (html) => (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const sqlString = (text) => `'${String(text).replace(/'/g, "''")}'`;
const keyFor = (entry) => `clips/${entry.course}-${entry.chapter}.mp4`;
const label = (entry) => `${entry.course}/${entry.chapter}`;

/** Commons metadata for up to 10 files per request, retrying politely when rate-limited. */
async function commonsInfo(titles) {
  const info = new Map();
  for (let i = 0; i < titles.length; i += 10) {
    const batch = titles.slice(i, i + 10);
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      prop: "videoinfo",
      viprop: "extmetadata|size|url|mime|derivatives",
      viextmetadatafilter: "LicenseShortName|LicenseUrl|Artist",
      titles: batch.join("|"),
    });
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(`${COMMONS_API}?${params}`, { headers: { "User-Agent": USER_AGENT } });
      const text = await response.text();
      if (text.startsWith("{")) {
        const pages = Object.values(JSON.parse(text).query?.pages ?? {});
        for (const page of pages) {
          const video = page.videoinfo?.[0];
          if (!video) continue;
          const meta = video.extmetadata ?? {};
          info.set(page.title, {
            title: page.title,
            licence: stripHtml(meta.LicenseShortName?.value),
            licenceUrl: stripHtml(meta.LicenseUrl?.value) || null,
            author: stripHtml(meta.Artist?.value) || "Unknown author",
            seconds: Math.round(video.duration ?? 0),
            mime: video.mime ?? "application/octet-stream",
            bytes: video.size ?? 0,
            url: video.url,
            pageUrl: video.descriptionurl,
            derivatives: video.derivatives ?? [],
          });
        }
        break;
      }
      if (attempt >= 4) throw new Error(`Commons kept refusing: ${text.slice(0, 120)}`);
      const wait = 15_000 * (attempt + 1);
      console.log(`  Commons is rate-limiting; waiting ${wait / 1000}s…`);
      await sleep(wait);
    }
    await sleep(3000);
  }
  return info;
}

/** The smallest Commons transcode that's at least 480p (else the original). */
function bestSource(clip) {
  const candidates = clip.derivatives
    .filter((d) => d.type?.startsWith("video/webm") && d.height >= 480 && d.height <= 720)
    .sort((a, b) => a.height - b.height);
  return candidates[0]?.src ?? clip.url;
}

function r2Client() {
  const missing = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"].filter(
    (name) => !process.env[name]?.trim(),
  );
  if (missing.length) {
    throw new Error(`Add ${missing.join(", ")} to .env.local (no EXPO_PUBLIC_ prefix). See prompts/15 step 1.`);
  }
  const client = new AwsClient({
    accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(),
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim(),
    service: "s3",
    region: "auto",
  });
  const base = `https://${process.env.R2_ACCOUNT_ID.trim()}.r2.cloudflarestorage.com/${process.env.R2_BUCKET.trim()}`;
  return {
    async exists(key) {
      const response = await client.fetch(`${base}/${key}`, { method: "HEAD" });
      if (response.status === 404) return false;
      if (!response.ok) throw new Error(`R2 HEAD ${key} → ${response.status}`);
      return true;
    },
    async put(key, file, contentType = "video/mp4") {
      const body = await fsp.readFile(file);
      const response = await client.fetch(`${base}/${key}`, {
        method: "PUT",
        body,
        headers: { "Content-Type": contentType },
      });
      if (!response.ok) throw new Error(`R2 PUT ${key} → ${response.status} ${await response.text()}`);
    },
  };
}

function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => (stderr = (stderr + chunk).slice(-2000)));
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}: ${stderr}`))));
  });
}

async function convert(sourceUrl, maxSeconds, workDir) {
  const input = path.join(workDir, "source.webm");
  const output = path.join(workDir, "clip.mp4");
  const response = await fetch(sourceUrl, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok || !response.body) throw new Error(`Download failed: ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(input));
  await run(ffmpegPath, [
    "-y", "-i", input, "-t", String(maxSeconds),
    "-vf", "scale=-2:'min(720,ih)'",
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-maxrate", "1500k", "-bufsize", "3000k", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k", "-ac", "2",
    "-movflags", "+faststart",
    output,
  ]);
  return output;
}

function creditLine(clip) {
  // Plain text: the lesson notes renderer (src/screens/lesson/markdown.tsx) has no links.
  const name = clip.title.replace(/^File:/, "").replace(/\.(webm|ogv|ogg)$/i, "");
  const author = clip.author.replace(/[*_]/g, "");
  return `*Video: "${name}" by ${author}, ${clip.licence}, via Wikimedia Commons.*`;
}

const RESOURCE_MAX_BYTES = 25 * 1024 * 1024;
const extensionOf = (title) => (title.match(/\.([a-z0-9]+)$/i)?.[1] ?? "bin").toLowerCase();
const resourceKey = (entry, index, clip) => `resources/${entry.course}-${entry.chapter}-${index + 1}.${extensionOf(clip.title)}`;
/** "Flowchart-If Then Else.svg" → "Flowchart If Then Else". */
const resourceTitle = (clip) =>
  clip.title.replace(/^File:/, "").replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
const resourceCredit = (clip) =>
  `File: "${clip.title.replace(/^File:/, "")}" by ${clip.author.replace(/[*_]/g, "")}, ${clip.licence}, via Wikimedia Commons.`;

async function downloadTo(url, file) {
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok || !response.body) throw new Error(`Download failed: ${response.status}`);
  await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(file));
}

function resourcesSql(resources) {
  const lines = [
    "",
    "-- Lesson resources (prompts/16): rebuilt from scratch on every run.",
    "delete from public.lesson_resources where storage_key like 'resources/%';",
  ];
  for (const row of resources) {
    lines.push(
      "",
      `-- ${row.entry.course} / chapter ${row.entry.chapter}: ${row.clip.title}, ${row.clip.licence}`,
      "insert into public.lesson_resources (lesson_id, position, title, file_name, size_bytes, mime_type, storage_key, credit)",
      `select l.id, ${row.position}, ${sqlString(resourceTitle(row.clip))}, ${sqlString(row.clip.title.replace(/^File:/, ""))}, ${Number(row.clip.bytes)}, ${sqlString(row.clip.mime)}, ${sqlString(row.key)}, ${sqlString(resourceCredit(row.clip))}`,
      "from public.lessons l",
      "join public.chapters ch on ch.id = l.chapter_id",
      "join public.courses c on c.id = ch.course_id",
      `where c.slug = ${sqlString(row.entry.course)} and ch.position = ${Number(row.entry.chapter)};`,
    );
  }
  return lines.join("\n");
}

function seedSql(rows) {
  const keys = rows.map((row) => sqlString(row.key)).join(", ") || "''";
  const lines = [
    "-- Generated by scripts/upload-lesson-videos.mjs (prompts/15). Do not edit by hand:",
    "-- change supabase/seeds/source/lesson-videos.json and run `npm run upload:lesson-videos`.",
    "-- Points each chapter's lessons at its clip in the private R2 bucket and ends their notes",
    "-- with the clip's credit. Safe to re-run.",
    "",
    "-- Chapters no longer in the list go back to their placeholder video_url.",
    "update public.lesson_contents",
    "set video_key = null,",
    "    body = regexp_replace(body, E'\\n\\n\\\\*Video: [^\\n]*\\\\*$', '')",
    `where video_key like 'clips/%' and video_key not in (${keys});`,
  ];
  for (const row of rows) {
    lines.push(
      "",
      `-- ${row.entry.course} / chapter ${row.entry.chapter} (${row.entry.topic}): ${row.clip.title}, ${row.clip.licence}`,
      "update public.lesson_contents lc",
      `set video_key = ${sqlString(row.key)},`,
      `    body = regexp_replace(coalesce(lc.body, ''), E'\\n\\n\\\\*Video: [^\\n]*\\\\*$', '') || E'\\n\\n' || ${sqlString(creditLine(row.clip))}`,
      "from public.lessons l",
      "join public.chapters ch on ch.id = l.chapter_id",
      "join public.courses c on c.id = ch.course_id",
      `where lc.lesson_id = l.id and c.slug = ${sqlString(row.entry.course)} and ch.position = ${Number(row.entry.chapter)};`,
    );
  }
  return `${lines.join("\n")}\n`;
}

async function main() {
  try {
    process.loadEnvFile(path.join(root, ".env.local"));
  } catch {
    // No .env.local: --check still works.
  }
  const { chapters } = JSON.parse(await fsp.readFile(SOURCE, "utf8"));
  const entries = chapters.filter((entry) => entry.file && (!only || label(entry) === only));
  console.log(`${entries.length} clip(s) to look up on Wikimedia Commons…`);
  const info = await commonsInfo(entries.map((entry) => entry.file));

  const usable = [];
  for (const entry of entries) {
    const clip = info.get(entry.file);
    if (!clip) {
      console.log(`✗ ${label(entry)}: ${entry.file} not found on Commons`);
      continue;
    }
    const allowed = ALLOWED_LICENCE.test(clip.licence);
    const minutes = `${Math.floor(clip.seconds / 60)}m${String(clip.seconds % 60).padStart(2, "0")}s`;
    console.log(`${allowed ? "✓" : "✗"} ${label(entry)} (${entry.topic}): ${clip.title} | ${clip.licence} | ${clip.author} | ${minutes}`);
    if (allowed) usable.push({ entry, clip, key: keyFor(entry) });
  }
  // Resources: every chapter's optional `resources` list.
  const resourceEntries = chapters
    .filter((entry) => Array.isArray(entry.resources) && entry.resources.length && (!only || label(entry) === only))
    .flatMap((entry) => entry.resources.map((file, index) => ({ entry, file, index })));
  const resourceInfo = resourceEntries.length ? await commonsInfo(resourceEntries.map((item) => item.file)) : new Map();
  const usableResources = [];
  for (const item of resourceEntries) {
    const clip = resourceInfo.get(item.file);
    if (!clip) {
      console.log(`✗ resource ${label(item.entry)}: ${item.file} not found on Commons`);
      continue;
    }
    const allowed = ALLOWED_LICENCE.test(clip.licence) && clip.bytes <= RESOURCE_MAX_BYTES;
    const size = `${(clip.bytes / 1e6).toFixed(2)} MB`;
    console.log(`${allowed ? "✓" : "✗"} resource ${label(item.entry)}: ${clip.title} | ${clip.licence} | ${clip.author} | ${clip.mime} | ${size}`);
    if (allowed) usableResources.push({ entry: item.entry, clip, key: resourceKey(item.entry, item.index, clip), position: item.index + 1 });
  }
  if (checkOnly) return;

  const r2 = r2Client();
  const rows = [];
  for (const row of usable) {
    if (await r2.exists(row.key)) {
      console.log(`  ${row.key} already in R2`);
      rows.push(row);
      continue;
    }
    if (sqlOnly) {
      console.log(`  ${row.key} not in R2 yet; left out of the SQL`);
      continue;
    }
    const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "syllo-clip-"));
    try {
      console.log(`  converting ${row.clip.title}…`);
      const file = await convert(bestSource(row.clip), row.entry.maxSeconds ?? DEFAULT_MAX_SECONDS, workDir);
      const megabytes = ((await fsp.stat(file)).size / 1e6).toFixed(1);
      console.log(`  uploading ${row.key} (${megabytes} MB)…`);
      await r2.put(row.key, file);
      rows.push(row);
    } catch (error) {
      console.error(`✗ ${label(row.entry)}: ${error.message}`);
    } finally {
      await fsp.rm(workDir, { recursive: true, force: true });
    }
  }

  const resourceRows = [];
  for (const row of usableResources) {
    if (await r2.exists(row.key)) {
      console.log(`  ${row.key} already in R2`);
      resourceRows.push(row);
      continue;
    }
    if (sqlOnly) {
      console.log(`  ${row.key} not in R2 yet; left out of the SQL`);
      continue;
    }
    const workDir = await fsp.mkdtemp(path.join(os.tmpdir(), "syllo-resource-"));
    try {
      const file = path.join(workDir, `file.${extensionOf(row.clip.title)}`);
      await downloadTo(row.clip.url, file);
      row.clip.bytes = (await fsp.stat(file)).size;
      console.log(`  uploading ${row.key} (${(row.clip.bytes / 1e6).toFixed(2)} MB)…`);
      await r2.put(row.key, file, row.clip.mime);
      resourceRows.push(row);
    } catch (error) {
      console.error(`✗ resource ${label(row.entry)}: ${error.message}`);
    } finally {
      await fsp.rm(workDir, { recursive: true, force: true });
    }
  }

  if (only) {
    console.log("--only: the seed SQL is left as it is; run without --only (or with --sql-only) to rewrite it.");
    return;
  }
  await fsp.writeFile(SEED, seedSql(rows) + resourcesSql(resourceRows) + "\n");
  console.log(`  …and ${resourceRows.length} resource file(s).`);
  console.log(`Wrote ${path.relative(root, SEED)} for ${rows.length} chapter(s). Next: npm run db:push`);
}

main().catch((error) => {
  console.error(error.message ?? error);
  process.exit(1);
});
