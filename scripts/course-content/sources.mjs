// Shared helpers for the course-content pipeline (prompts/19): the source registry, lesson
// keys, cache paths and public page URLs. Used by fetch-course-sources.mjs,
// draft-course-content.mjs and build-course-content-seed.mjs. No dependencies.
import { readFileSync } from "node:fs";
import path from "node:path";

export const ROOT = process.cwd();
export const REGISTRY = path.join(ROOT, "supabase/seeds/source/course-sources.json");
export const LOCK = path.join(ROOT, "supabase/seeds/source/course-sources.lock.json");
export const CONTENT = path.join(ROOT, "supabase/seeds/source/course-content.json");
/** Git-ignored working area: partial clones, extracted texts and review packs. */
export const CACHE = path.join(ROOT, "scratchpad/course-sources");
export const TEXTS = path.join(CACHE, "texts");
export const REVIEW = path.join(ROOT, "scratchpad/review");

export function loadRegistry() {
  return JSON.parse(readFileSync(REGISTRY, "utf8"));
}

/** "react-native-basics/2/3" */
export const lessonKey = (lesson) => `${lesson.course}/${lesson.chapter}/${lesson.position}`;
/** "react-native-basics/2" */
export const quizKey = (course, chapter) => `${course}/${chapter}`;

/** The cached text file for a resolved source file. */
export const textPath = (sourceId, file) => path.join(TEXTS, sourceId, file);

/**
 * The public page for a source path, from the registry's pageUrl rule: {path} is the path
 * without extension or a trailing /index, {slug} its last segment. Reviewers confirm every
 * URL (fetch-course-sources.mjs --check-urls requests each one).
 */
export function pageUrl(source, requested) {
  if (!source.pageUrl.includes("{")) return source.pageUrl;
  let clean = requested
    .replace(/\/$/, "")
    .replace(/\.(mdx?|rst|njk|md\.njk|html)$/i, "")
    .replace(/\/index$/, "")
    .replace(/^pages\//, "")
    .replace(/^_components\//, "components/");
  const slug = clean.split("/").pop();
  return source.pageUrl.replace("{path}", clean).replace("{slug}", slug);
}

/** Every source reference across the registry's lessons, de-duplicated. */
export function referencedSources(registry, { course } = {}) {
  const seen = new Map();
  for (const lesson of registry.lessons) {
    if (course && lesson.course !== course) continue;
    for (const ref of [...lesson.sources, ...(lesson.fallback?.sources ?? [])]) {
      seen.set(`${ref.id}:${ref.path}`, ref);
    }
  }
  return [...seen.values()];
}

export const args = (argv = process.argv.slice(2)) => {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      flags[arg.slice(2)] = next;
      i++;
    } else {
      flags[arg.slice(2)] = true;
    }
  }
  return flags;
};
