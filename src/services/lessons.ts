import { FunctionsHttpError } from "@supabase/supabase-js";

import type { AppSupabaseClient } from "@/lib/supabase";

import { NotAllowedError } from "./errors";

// Lessons and lesson progress in Supabase: plain async functions, no React. Hooks in
// src/lib/queries/lessons/ and src/lib/queries/progress/ wrap them. RLS shows a lesson's
// content only for previews or courses the learner is enrolled in.

export type Lesson = {
  id: string;
  title: string;
  position: number;
  durationSeconds: number;
  isPreview: boolean;
  chapterPosition: number;
  courseId: string;
  /** Downloadable files (prompts/16), in order. Empty when there are none or the lesson is locked. */
  resources: LessonResource[];
  /** What the notes were adapted from, and further reading (prompts/19), in order. */
  sources: LessonSource[];
  /**
   * Null when the lesson is locked (not a preview, not enrolled). `videoKey` is set when the
   * video is in the private R2 bucket (prompts/15): get a playable link with getLessonVideoUrl.
   * Otherwise `videoUrl` is an outside link that plays as it is.
   */
  content: { videoUrl: string | null; videoKey: string | null; body: string | null } | null;
};

export type LessonResource = {
  id: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  /** Attribution for openly licensed files ("Video/File: … by …, CC BY …"). */
  credit: string | null;
};

export type LessonSource = {
  id: string;
  title: string;
  author: string;
  url: string;
  licence: string;
  licenceUrl: string;
  /** A statement the licence requires, e.g. the OGL v3.0 attribution statement. */
  attributionNote: string | null;
  role: "adapted" | "further_reading";
};

type SourceRow = {
  id: string;
  position: number;
  title: string;
  author: string;
  url: string;
  licence: string;
  licence_url: string;
  attribution_note: string | null;
  role: "adapted" | "further_reading";
};

type ResourceRow = {
  id: string;
  position: number;
  title: string;
  file_name: string;
  size_bytes: number;
  mime_type: string;
  credit: string | null;
};

type LessonRow = {
  id: string;
  title: string;
  position: number;
  duration_seconds: number;
  is_preview: boolean;
  chapters: { position: number; course_id: string } | null;
  lesson_contents: { video_url: string | null; video_key: string | null; body: string | null } | null;
  lesson_resources: ResourceRow[];
  lesson_sources: SourceRow[];
};

/** One lesson with its place in the course and, when unlocked, its video and notes. */
export async function getLesson(supabase: AppSupabaseClient, lessonId: string, signal?: AbortSignal): Promise<Lesson | null> {
  const query = supabase
    .from("lessons")
    .select("id, title, position, duration_seconds, is_preview, chapters(position, course_id), lesson_contents(video_url, video_key, body), " +
        "lesson_resources(id, position, title, file_name, size_bytes, mime_type, credit), " +
        "lesson_sources(id, position, title, author, url, licence, licence_url, attribution_note, role)")
    .eq("id", lessonId);
  const { data } = await (signal ? query.abortSignal(signal) : query).maybeSingle().throwOnError();
  if (!data) return null;
  const row = data as unknown as LessonRow;
  if (!row.chapters) return null;
  return {
    id: row.id,
    title: row.title,
    position: row.position,
    durationSeconds: row.duration_seconds,
    isPreview: row.is_preview,
    chapterPosition: row.chapters.position,
    courseId: row.chapters.course_id,
    resources: [...row.lesson_resources]
      .sort((a, b) => a.position - b.position)
      .map((resource) => ({
        id: resource.id,
        title: resource.title,
        fileName: resource.file_name,
        sizeBytes: Number(resource.size_bytes),
        mimeType: resource.mime_type,
        credit: resource.credit,
      })),
    sources: [...(row.lesson_sources ?? [])]
      .sort((a, b) => a.position - b.position)
      .map((source) => ({
        id: source.id,
        title: source.title,
        author: source.author,
        url: source.url,
        licence: source.licence,
        licenceUrl: source.licence_url,
        attributionNote: source.attribution_note,
        role: source.role,
      })),
    content: row.lesson_contents
      ? { videoUrl: row.lesson_contents.video_url, videoKey: row.lesson_contents.video_key, body: row.lesson_contents.body }
      : null,
  };
}

export type LessonVideoLink = { url: string; expiresAt: string | null };

/**
 * A playable link for a lesson whose video is in R2 (prompts/15): the lesson-video Edge
 * Function checks the learner's access through RLS and signs a link valid for 1 hour.
 * A locked or missing lesson throws NotAllowedError.
 */
export async function getLessonVideoUrl(supabase: AppSupabaseClient, lessonId: string): Promise<LessonVideoLink> {
  // Edge Function calls have no .throwOnError(); throw the returned error ourselves.
  const { data, error } = await supabase.functions.invoke<LessonVideoLink>("lesson-video", {
    method: "POST",
    body: { lessonId },
  });
  if (error) {
    const status = error instanceof FunctionsHttpError ? (error.context as Response).status : 0;
    if (status === 403 || status === 404) throw new NotAllowedError("You can't watch this lesson yet.");
    throw error;
  }
  if (!data?.url) throw new Error("lesson-video returned no link");
  return { url: data.url, expiresAt: data.expiresAt ?? null };
}

/**
 * A download link for a lesson resource (prompts/16): the lesson-resource Edge Function checks
 * access through RLS and signs a 1-hour R2 link that saves the file. Locked → NotAllowedError.
 */
export async function getLessonResourceUrl(supabase: AppSupabaseClient, resourceId: string): Promise<LessonVideoLink> {
  const { data, error } = await supabase.functions.invoke<LessonVideoLink>("lesson-resource", {
    method: "POST",
    body: { resourceId },
  });
  if (error) {
    const status = error instanceof FunctionsHttpError ? (error.context as Response).status : 0;
    if (status === 403 || status === 404) throw new NotAllowedError("You can't open this file yet.");
    throw error;
  }
  if (!data?.url) throw new Error("lesson-resource returned no link");
  return { url: data.url, expiresAt: data.expiresAt ?? null };
}

export type ProgressRow = { lessonId: string; completedAt: string };

/** Every lesson the learner has completed (RLS: their own rows), newest first. */
export async function getProgress(supabase: AppSupabaseClient, signal?: AbortSignal): Promise<ProgressRow[]> {
  const query = supabase.from("lesson_progress").select("lesson_id, completed_at").order("completed_at", { ascending: false });
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return data.map((row) => ({ lessonId: row.lesson_id, completedAt: row.completed_at }));
}

/**
 * Marks a lesson completed (insert) or not (delete). Marking twice is fine (unique
 * violation); RLS refuses lessons the learner can't open.
 */
export async function setLessonCompleted(
  supabase: AppSupabaseClient,
  lessonId: string,
  completed: boolean,
): Promise<void> {
  if (!completed) {
    await supabase.from("lesson_progress").delete().eq("lesson_id", lessonId).throwOnError();
    return;
  }
  try {
    await supabase.from("lesson_progress").insert({ lesson_id: lessonId }).throwOnError();
  } catch (error) {
    if ((error as { code?: string }).code !== "23505") throw error;
  }
}
