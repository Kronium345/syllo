// Builds supabase/seeds/course-content.sql from reviewed course content (prompts/19):
// lesson notes (keeping each lesson's video credit as its last line), lesson_sources, one
// 15-question quiz per chapter, and the single Syllo Team tutor. Also regenerates
// src/lib/content-licences.ts.
//
//   node scripts/build-course-content-seed.mjs                 # reviewed items only (the real seed)
//   node scripts/build-course-content-seed.mjs --allow-draft   # local preview: scratchpad/course-content.preview.sql
//
// Validation failures stop the build. The SQL is idempotent: ids are md5 of readable keys
// (course-quiz: / course-question: / course-answer:, so they never clash with Pharmacy's
// quiz: / question: / answer: keys), and published questions are updated in place, never deleted
// or renumbered (attempts reference them).
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { buildContentLicences } from "./build-content-licences.mjs";
import { args, CONTENT, LOCK, lessonKey, loadRegistry, quizKey, ROOT, textPath } from "./course-content/sources.mjs";

const flags = args();
const allowDraft = !!flags["allow-draft"];
const registry = loadRegistry();
const lock = JSON.parse(readFileSync(LOCK, "utf8"));
const content = existsSync(CONTENT) ? JSON.parse(readFileSync(CONTENT, "utf8")) : { lessons: {}, quizzes: {} };
const errors = [];
const warnings = [];

const MIN_WORDS = 350;
const MAX_WORDS = 800;
const EXPLANATION_WORDS = 60;
const words = (text) => (text.match(/\S+/g) ?? []).length;
const sql = (value) => (value === null || value === undefined ? "null" : `'${String(value).replaceAll("'", "''")}'`);
const id = (key) => `md5(${sql(key)})::uuid`;

// --- Validation --------------------------------------------------------------------------------

/** The markdown the lesson renderer supports; everything else is an error (outside code fences). */
function checkMarkdown(key, body) {
  const lines = body.split(/\r?\n/);
  let inFence = false;
  let fences = 0;
  for (const [i, line] of lines.entries()) {
    if (/^\s*```/.test(line)) {
      fences++;
      inFence = !inFence;
      if (inFence && !/^\s*```[\w+-]+\s*$/.test(line)) warnings.push(`${key} line ${i + 1}: code fence without a language`);
      continue;
    }
    if (inFence) continue;
    const where = `${key} line ${i + 1}`;
    if (/!\[[^\]]*\]\(/.test(line)) errors.push(`${where}: images aren't allowed`);
    else if (/\[[^\]]+\]\([^)]+\)/.test(line)) errors.push(`${where}: links aren't allowed in the body (sources are listed separately)`);
    if (/^\s*\|.*\|\s*$/.test(line)) errors.push(`${where}: tables aren't supported`);
    if (/^\s*>/.test(line)) errors.push(`${where}: block quotes aren't supported`);
    if (/<\/?[a-zA-Z][^>]*>/.test(line.replace(/`[^`]*`/g, ""))) errors.push(`${where}: HTML isn't supported`);
    if (/^\s*#(\s|#{3,}\s)/.test(line)) errors.push(`${where}: only ## and ### headings are allowed`);
    if (/^\s{2,}[-*]\s|^\s{2,}\d+\.\s/.test(line)) errors.push(`${where}: nested lists aren't supported`);
  }
  if (fences % 2 !== 0) errors.push(`${key}: a code fence isn't closed`);
  if (!/^###\s+Key points\s*$/m.test(body)) errors.push(`${key}: needs a "### Key points" section`);
  if (/\n\n\*Video: [^\n]*\*\s*$/.test(body)) errors.push(`${key}: don't include the video credit (the seed keeps the existing one)`);
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

const lessonItems = [];
for (const lesson of registry.lessons) {
  const key = lessonKey(lesson);
  const item = content.lessons[key];
  if (!item) continue;
  if (!item.reviewed && !allowDraft) {
    warnings.push(`${key}: not reviewed, left out`);
    continue;
  }
  const n = words(item.body);
  if (n < MIN_WORDS || n > MAX_WORDS) errors.push(`${key}: ${n} words (needs ${MIN_WORDS}-${MAX_WORDS})`);
  checkMarkdown(key, item.body);
  const allowed = new Set([...lesson.sources, ...(lesson.fallback?.sources ?? [])].map((r) => `${r.id}:${r.path}`));
  const sources = item.sourcesUsed ?? [];
  if (!sources.length) errors.push(`${key}: lists no sources`);
  for (const ref of sources) {
    const [sourceId] = ref.split(":");
    const source = registry.sources[sourceId];
    if (!source) errors.push(`${key}: unknown source id "${sourceId}"`);
    else if (source.role === "link-only") errors.push(`${key}: ${sourceId} is link-only and can't be adapted`);
    else if (!allowed.has(ref)) errors.push(`${key}: ${ref} isn't mapped to this lesson in course-sources.json`);
    else if (!lock.files[ref]) errors.push(`${key}: ${ref} isn't in the lock file (run fetch-course-sources.mjs)`);
  }
  lessonItems.push({ lesson, key, item });
}

const quizItems = [];
for (const spec of registry.quizzes) {
  for (const chapter of spec.chapters) {
    const key = quizKey(spec.course, chapter);
    const item = content.quizzes[key];
    if (!item) continue;
    if (!item.reviewed && !allowDraft) {
      warnings.push(`quiz ${key}: not reviewed, left out`);
      continue;
    }
    if (item.questions.length !== spec.count) errors.push(`quiz ${key}: ${item.questions.length} questions (needs ${spec.count})`);
    const prompts = new Set();
    const chapterRefs = new Set(
      registry.lessons.filter((l) => l.course === spec.course && l.chapter === chapter).flatMap((l) => l.sources.map((r) => `${r.id}:${r.path}`)),
    );
    item.questions.forEach((q, i) => {
      const where = `quiz ${key} Q${i + 1}`;
      if (!q.prompt) errors.push(`${where}: empty prompt`);
      if (prompts.has(q.prompt.toLowerCase())) errors.push(`${where}: duplicate prompt`);
      prompts.add(q.prompt.toLowerCase());
      if (q.answers.length !== 4) errors.push(`${where}: ${q.answers.length} answers (needs exactly 4)`);
      if (q.answers.some((a) => !a)) errors.push(`${where}: an empty answer`);
      if (new Set(q.answers.map((a) => a.toLowerCase())).size !== q.answers.length) errors.push(`${where}: duplicate answers`);
      if (!Number.isInteger(q.correct) || q.correct < 0 || q.correct >= q.answers.length) errors.push(`${where}: no valid correct answer`);
      if (q.answers.some((a) => /\b(all|none) of the above\b/i.test(a))) errors.push(`${where}: "all/none of the above" isn't allowed`);
      if (!q.explanation) errors.push(`${where}: needs an explanation`);
      else if (words(q.explanation) > EXPLANATION_WORDS) warnings.push(`${where}: explanation is ${words(q.explanation)} words (aim for ${EXPLANATION_WORDS})`);
      if (!chapterRefs.has(q.sourceRef)) errors.push(`${where}: sourceRef ${q.sourceRef} isn't one of the chapter's sources`);
      const sourceId = q.sourceRef?.split(":")[0];
      const source = registry.sources[sourceId];
      const host = hostOf(q.referenceUrl ?? "");
      const okHosts = new Set([hostOf(source?.pageUrl ?? ""), hostOf(source?.repo ?? ""), "developer.mozilla.org"].filter(Boolean));
      if (!host || !okHosts.has(host)) errors.push(`${where}: reference_url ${q.referenceUrl} isn't on the source's site`);
    });
    quizItems.push({ spec, chapter, key, item });
  }
}

if (errors.length) {
  console.error(`Build refused, ${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
  if (warnings.length) console.error(`\nWarnings:\n- ${warnings.join("\n- ")}`);
  process.exit(1);
}

// --- SQL ---------------------------------------------------------------------------------------

const VIDEO_CREDIT = String.raw`E'\n\n\\*Video: [^\n]*\\*$'`;

/** A source page's own title (front matter `title:` or first heading), else the source's title. */
function pageTitle(ref) {
  const [sourceId] = ref.split(":");
  const entry = lock.files[ref];
  const file = entry?.files?.[0]?.file;
  const text = file && existsSync(textPath(sourceId, file)) ? readFileSync(textPath(sourceId, file), "utf8") : "";
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? "";
  const title =
    /^title:\s*["']?(.+?)["']?\s*$/m.exec(front)?.[1] ??
    /^#\s+(.+)$/m.exec(text)?.[1] ??
    /^(.+)\r?\n[=*]{3,}\s*$/m.exec(text)?.[1] ??
    null;
  const source = registry.sources[sourceId];
  return title ? `${title.replace(/[`*_]/g, "").trim()} (${source.title})` : source.title;
}

const out = [
  "-- Generated by scripts/build-course-content-seed.mjs from supabase/seeds/source/course-content.json",
  "-- (reviewed lessons and quizzes) and course-sources.json / course-sources.lock.json (pinned sources).",
  "-- Do not edit by hand: edit the JSON (or the sources) and build again. Safe to re-run.",
  "",
  "-- One Syllo Team tutor for every course (prompts/19): the Pharmacy team tutor is renamed and the",
  "-- invented sample tutors are removed (their follows cascade).",
  "insert into public.tutors (id, name, headline, bio, avatar_url) values",
  `  (${id("tutor:syllo-pharmacy")}, 'Syllo Team', 'Lessons adapted from official docs and open guides',`,
  "   'Syllo''s courses are written by the Syllo team from openly licensed official documentation and guides, credited in every lesson, and reviewed before publishing.',",
  "   'https://picsum.photos/seed/syllo-team/200/200')",
  "on conflict (id) do update set name = excluded.name, headline = excluded.headline, bio = excluded.bio;",
  `update public.courses set tutor_id = ${id("tutor:syllo-pharmacy")} where slug in (${Object.keys(registry.courses).map(sql).join(", ")});`,
  `delete from public.tutors where id in (${["tutor:maya", "tutor:leo", "tutor:aisha"].map(id).join(", ")});`,
  "",
];

const overrides = Object.entries(registry.courseOverrides ?? {});
if (overrides.length) {
  out.push("-- Course descriptions that match the real content.");
  for (const [slug, o] of overrides) {
    out.push(
      `update public.courses set subtitle = coalesce(${sql(o.subtitle)}, subtitle), description = coalesce(${sql(o.description)}, description) where slug = ${sql(slug)};`,
    );
  }
  out.push("");
}

for (const { lesson, key, item } of lessonItems) {
  const lessonId = id(`lesson:${lesson.course}:${lesson.chapter}:${lesson.position}`);
  out.push(`-- Lesson ${key}: ${item.title}`);
  // The new notes, then the lesson's existing "*Video: …*" credit (if any) as the last line.
  out.push(
    `update public.lesson_contents set body = ${sql(item.body.trim())} || coalesce(substring(body from ${VIDEO_CREDIT}), '') where lesson_id = ${lessonId};`,
  );
  out.push(`delete from public.lesson_sources where lesson_id = ${lessonId};`);
  const rows = item.sourcesUsed.map((ref, i) => {
    const source = registry.sources[ref.split(":")[0]];
    return `  (${lessonId}, ${i + 1}, ${sql(pageTitle(ref))}, ${sql(source.copyright)}, ${sql(lock.files[ref].url)}, ${sql(source.licence)}, ${sql(source.licenceUrl)}, ${sql(source.attributionNote ?? null)}, 'adapted')`;
  });
  out.push(
    "insert into public.lesson_sources (lesson_id, position, title, author, url, licence, licence_url, attribution_note, role) values",
    `${rows.join(",\n")};`,
    "",
  );
}

for (const { spec, chapter, key, item } of quizItems) {
  const quizId = id(`course-quiz:${spec.course}:${chapter}`);
  out.push(`-- Quiz ${key}: ${item.title} (${item.questions.length} questions)`);
  out.push(
    "insert into public.quizzes (id, chapter_id, title, position, is_preview) values",
    `  (${quizId}, ${id(`chapter:${spec.course}:${chapter}`)}, ${sql(item.title)}, 1, ${chapter === 1})`,
    "on conflict (id) do update set title = excluded.title, is_preview = excluded.is_preview;",
  );
  const questionRows = item.questions.map(
    (q, i) =>
      `  (${id(`course-question:${spec.course}:${chapter}:${i + 1}`)}, ${quizId}, ${i + 1}, ${sql(q.prompt)}, ${sql(q.explanation)}, ${sql(q.referenceUrl)})`,
  );
  out.push(
    "insert into public.quiz_questions (id, quiz_id, position, prompt, explanation, reference_url) values",
    questionRows.join(",\n"),
    "on conflict (id) do update set prompt = excluded.prompt, explanation = excluded.explanation, reference_url = excluded.reference_url;",
  );
  // Clear the old correct flags first: the one-correct-answer index would refuse a moved answer.
  out.push(`update public.quiz_answers set is_correct = false where question_id in (select id from public.quiz_questions where quiz_id = ${quizId});`);
  const answerRows = item.questions.flatMap((q, i) =>
    q.answers.map(
      (answer, j) =>
        `  (${id(`course-answer:${spec.course}:${chapter}:${i + 1}:${j + 1}`)}, ${id(`course-question:${spec.course}:${chapter}:${i + 1}`)}, ${j + 1}, ${sql(answer)}, ${j === q.correct})`,
    ),
  );
  out.push(
    "insert into public.quiz_answers (id, question_id, position, text, is_correct) values",
    answerRows.join(",\n"),
    "on conflict (id) do update set text = excluded.text, is_correct = excluded.is_correct;",
    "",
  );
}

const target = allowDraft ? path.join(ROOT, "scratchpad/course-content.preview.sql") : path.join(ROOT, "supabase/seeds/course-content.sql");
writeFileSync(target, out.join("\n"));
const licences = buildContentLicences();
console.log(
  `Wrote ${path.relative(ROOT, target)}: ${lessonItems.length} lessons, ${quizItems.length} quizzes (${quizItems.reduce((n, q) => n + q.item.questions.length, 0)} questions)` +
    `${allowDraft ? " [PREVIEW: includes unreviewed drafts; never add to config.toml]" : ""}.`,
);
console.log(`Regenerated src/lib/content-licences.ts (${licences.sources} sources).`);
if (warnings.length) console.log(`\nWarnings:\n- ${warnings.join("\n- ")}`);
