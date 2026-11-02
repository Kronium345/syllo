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
  /**
   * Null when the lesson is locked (not a preview, not enrolled). `videoKey` is set when the
   * video is in the private R2 bucket (prompts/15): get a playable link with getLessonVideoUrl.
   * Otherwise `videoUrl` is an outside link that plays as it is.
   */
  content: { videoUrl: string | null; videoKey: string | null; body: string | null } | null;
};

type LessonRow = {
  id: string;
  title: string;
  position: number;
  duration_seconds: number;
  is_preview: boolean;
  chapters: { position: number; course_id: string } | null;
  lesson_contents: { video_url: string | null; video_key: string | null; body: string | null } | null;
};

/** One lesson with its place in the course and, when unlocked, its video and notes. */
export async function getLesson(supabase: AppSupabaseClient, lessonId: string, signal?: AbortSignal): Promise<Lesson | null> {
  const query = supabase
    .from("lessons")
    .select("id, title, position, duration_seconds, is_preview, chapters(position, course_id), lesson_contents(video_url, video_key, body)")
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
