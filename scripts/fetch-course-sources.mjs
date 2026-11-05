// Fetches the course-content sources at their pinned commits (prompts/19) and writes
// supabase/seeds/source/course-sources.lock.json (every file's pin and SHA-256).
//
//   node scripts/fetch-course-sources.mjs                   # all sources used by lessons
//   node scripts/fetch-course-sources.mjs --course react-native-basics
//   node scripts/fetch-course-sources.mjs --inspect         # resolve and report, don't write the lock
//   node scripts/fetch-course-sources.mjs --check-urls      # also request every public page URL
//
// For each source: a shallow, blob-less fetch of exactly the pinned commit (no history, no file
// contents until needed), then the licence file is read at the pin and must contain the expected
// fragment, or the run stops. Only then are the mapped files read (git show <pin>:<file>) and
// copied to scratchpad/course-sources/texts/. Nothing is scraped from live websites.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { args, CACHE, LOCK, loadRegistry, pageUrl, referencedSources, textPath } from "./course-content/sources.mjs";

const flags = args();
const registry = loadRegistry();
const problems = [];

const git = (cwd, gitArgs) =>
  execFileSync("git", gitArgs, { cwd, encoding: "utf8", maxBuffer: 256 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });

/** A shallow, blob-less checkout of exactly the pin; returns the commit sha. */
function prepare(id, source) {
  const dir = path.join(CACHE, "repos", id);
  const marker = path.join(dir, ".syllo-pin");
  if (existsSync(marker)) {
    const [pin, rev] = readFileSync(marker, "utf8").trim().split(" ");
    if (pin === source.pin) return { dir, rev };
  }
  mkdirSync(dir, { recursive: true });
  if (!existsSync(path.join(dir, ".git"))) {
    git(dir, ["init", "--quiet"]);
    git(dir, ["remote", "add", "origin", source.repo]);
  }
  process.stdout.write(`  fetching ${id} @ ${source.pin.slice(0, 12)}… `);
  for (let attempt = 1; ; attempt++) {
    try {
      git(dir, ["-c", "protocol.version=2", "fetch", "--quiet", "--depth", "1", "--filter=blob:none", "origin", source.pin]);
      break;
    } catch (error) {
      if (attempt >= 5) throw error;
      execFileSync(process.execPath, ["-e", `setTimeout(() => {}, ${attempt * 5000})`]);
    }
  }
  const rev = git(dir, ["rev-parse", "FETCH_HEAD^{commit}"]).trim();
  writeFileSync(marker, `${source.pin} ${rev}\n`);
  console.log(rev.slice(0, 12));
  return { dir, rev };
}

/** A file at the pin. Blobs download on first read, so transient network errors are retried. */
function show(repo, file) {
  for (let attempt = 1; ; attempt++) {
    try {
      return git(repo.dir, ["show", `${repo.rev}:${file}`]);
    } catch (error) {
      if (attempt >= 5) throw error;
      execFileSync(process.execPath, ["-e", `setTimeout(() => {}, ${attempt * 4000})`]);
    }
  }
}
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

const trees = new Map();
function filesUnder(id, repo, base) {
  const key = `${id}:${base}`;
  if (!trees.has(key)) {
    const out = git(repo.dir, ["ls-tree", "-r", "--name-only", repo.rev, "--", base || "."]);
    trees.set(key, new Set(out.split("\n").filter(Boolean)));
  }
  return trees.get(key);
}

const INDEX_NAMES = ["index.md", "index.mdx", "index.md.njk", "index.njk", "index.html", "README.md"];
const EXTENSIONS = [".md", ".mdx", ".rst", ".njk", ".md.njk"];

/** The repo files a registry path stands for, or a problem message. */
function resolve(id, source, repo, requested) {
  const base = source.basePath ? `${source.basePath}/` : "";
  if (requested.startsWith("chapter:")) return resolveOpenstaxChapter(source, repo, Number(requested.slice(8)));
  const files = filesUnder(id, repo, source.basePath);
  const full = `${base}${requested}`.replace(/\/$/, "");
  if (files.has(full)) return [full];
  if (requested.endsWith("/")) {
    const all = [...files].filter((f) => f.startsWith(`${full}/`) && /\.(mdx?|njk)$/.test(f)).sort();
    return all.length ? all : `no .md/.mdx/.njk files under ${full}/`;
  }
  for (const name of INDEX_NAMES) if (files.has(`${full}/${name}`)) return [`${full}/${name}`];
  for (const ext of EXTENSIONS) if (files.has(`${full}${ext}`)) return [`${full}${ext}`];
  const near = [...files].filter((f) => f.startsWith(full)).slice(0, 5);
  return `not found: ${full}${near.length ? ` (did you mean: ${near.join(", ")})` : ""}`;
}

/** OpenStax chapters: the Nth chapter (subcollection) in the collection XML → its module files. */
const collections = new Map();
function resolveOpenstaxChapter(source, repo, n) {
  if (!collections.has(source.collection)) {
    const xml = show(repo, source.collection);
    const chapters = [...xml.matchAll(/<col:subcollection>([\s\S]*?)<\/col:subcollection>/g)].map((m) =>
      [...m[1].matchAll(/<col:module document="([^"]+)"/g)].map((d) => `modules/${d[1]}/index.cnxml`),
    );
    collections.set(source.collection, chapters);
  }
  const modules = collections.get(source.collection)[n - 1];
  return modules?.length ? modules : `the collection has no chapter ${n}`;
}

/** CNXML → readable text (titles, paragraphs, code, lists), dropping markup and media. */
function cnxmlToText(xml) {
  return xml
    .replace(/<media[\s\S]*?<\/media>/g, "")
    .replace(/<title>([\s\S]*?)<\/title>/g, "\n\n## $1\n\n")
    .replace(/<code[^>]*display="block"[^>]*>([\s\S]*?)<\/code>/g, "\n```\n$1\n```\n")
    .replace(/<item>/g, "\n- ")
    .replace(/<\/?(para|section|list|note|example|exercise|problem|solution)[^>]*>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function checkUrl(url) {
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15_000) });
    return response.status;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------------------------

const refs = referencedSources(registry, { course: flags.course });
const ids = [...new Set([...refs.map((r) => r.id), ...(flags.course ? [] : ["mdn"])])];
const repos = {};
const sources = {};

console.log(`Checking ${ids.length} sources…`);
for (const id of ids) {
  const source = registry.sources[id];
  if (!source) {
    problems.push(`unknown source id: ${id}`);
    continue;
  }
  if (source.role === "link-only" && flags.course) continue;
  try {
    const repo = prepare(id, source);
    const licence = show(repo, source.licenceFile);
    if (!licence.includes(source.licenceFragment)) {
      problems.push(`${id}: ${source.licenceFile} at ${source.pin} doesn't contain "${source.licenceFragment}"`);
      if (flags.inspect) console.log(`  ${id} licence file starts:\n    ${licence.slice(0, 400).replace(/\n/g, "\n    ")}`);
      continue;
    }
    console.log(`  ✓ ${id}: ${source.licence} (${source.licenceFile})`);
    repos[id] = repo;
    sources[id] = { pin: source.pin, rev: repo.rev, licenceFile: source.licenceFile, licenceSha256: sha256(licence) };
    if (source.fullLicenceText) {
      mkdirSync(path.join(CACHE, "licences"), { recursive: true });
      writeFileSync(path.join(CACHE, "licences", `${id}.txt`), licence);
    }
  } catch (error) {
    problems.push(`${id}: ${String(error.stderr || error.message).trim().split("\n").pop()}`);
  }
}

const files = {};
for (const ref of refs) {
  const source = registry.sources[ref.id];
  const repo = repos[ref.id];
  if (!source || !repo) continue;
  if (source.role === "link-only") {
    problems.push(`${ref.id}:${ref.path}: link-only sources can't be adapted`);
    continue;
  }
  const resolved = resolve(ref.id, source, repo, ref.path);
  if (typeof resolved === "string") {
    problems.push(`${ref.id}:${ref.path}: ${resolved}`);
    continue;
  }
  const entries = [];
  for (const file of resolved) {
    let text;
    try {
      text = show(repo, file);
    } catch (error) {
      problems.push(`${ref.id}:${file}: ${String(error.stderr || error.message).trim().split("\n").pop()}`);
      continue;
    }
    if (file.endsWith(".cnxml")) text = cnxmlToText(text);
    const out = textPath(ref.id, file);
    mkdirSync(path.dirname(out), { recursive: true });
    writeFileSync(out, text);
    entries.push({ file, bytes: Buffer.byteLength(text), sha256: sha256(text) });
  }
  // A Jekyll/Eleventy permalink in the first file's front matter beats the path rule.
  const firstText = entries.length ? readFileSync(textPath(ref.id, entries[0].file), "utf8") : "";
  const frontMatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(firstText)?.[1] ?? "";
  const permalink = /^permalink:\s*["']?([^"'\r\n]+)["']?\s*$/m.exec(frontMatter)?.[1]?.trim();
  const origin = /^(https?:\/\/[^/]+)/.exec(source.pageUrl)?.[1];
  const url = permalink && origin && permalink.startsWith("/") ? `${origin}${permalink}` : pageUrl(source, ref.path);
  files[`${ref.id}:${ref.path}`] = {
    url,
    // The exact licensed text we adapted, always available: used when the live page is gone.
    repoUrl: `${source.repo}/blob/${repo.rev}/${resolved[0]}`,
    files: entries,
  };
  if (flags.inspect) console.log(`  ${ref.id}:${ref.path} → ${resolved.length === 1 ? resolved[0] : `${resolved.length} files`}`);
}

if (flags["check-urls"]) {
  console.log("Checking public page URLs…");
  for (const [key, entry] of Object.entries(files)) {
    const status = await checkUrl(entry.url);
    if (status === 200) {
      if (flags.inspect) console.log(`  ✓ ${entry.url}`);
      continue;
    }
    // The live page moved or was removed: link the pinned repo file instead (it is the source).
    const fallback = await checkUrl(entry.repoUrl);
    if (fallback === 200) {
      console.log(`  ↪ ${key}: ${entry.url} returned ${status || "no response"}; linking the pinned file instead`);
      entry.url = entry.repoUrl;
      entry.urlFallback = true;
    } else {
      problems.push(`${key}: ${entry.url} returned ${status || "no response"}, and the repo link returned ${fallback || "no response"}`);
    }
  }
}

if (problems.length) {
  console.error(`\n${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
if (!flags.inspect) {
  const previous = existsSync(LOCK) ? JSON.parse(readFileSync(LOCK, "utf8")) : { sources: {}, files: {} };
  const lock = {
    generated: new Date().toISOString(),
    sources: { ...previous.sources, ...sources },
    files: { ...previous.files, ...files },
  };
  writeFileSync(LOCK, `${JSON.stringify(lock, null, 2)}\n`);
  console.log(`\nWrote ${path.relative(process.cwd(), LOCK)}: ${Object.keys(files).length} source paths, ${Object.values(files).reduce((n, f) => n + f.files.length, 0)} files.`);
} else {
  console.log("\nInspect only: nothing written.");
}
