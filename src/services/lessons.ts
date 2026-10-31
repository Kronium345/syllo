import type { AppSupabaseClient } from "@/lib/supabase";

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
  /** Null when the lesson is locked (not a preview, not enrolled). */
  content: { videoUrl: string | null; body: string | null } | null;
};

type LessonRow = {
  id: string;
  title: string;
  position: number;
  duration_seconds: number;
  is_preview: boolean;
  chapters: { position: number; course_id: string } | null;
  lesson_contents: { video_url: string | null; body: string | null } | null;
};

/** One lesson with its place in the course and, when unlocked, its video and notes. */
export async function getLesson(supabase: AppSupabaseClient, lessonId: string, signal?: AbortSignal): Promise<Lesson | null> {
  const query = supabase
    .from("lessons")
    .select("id, title, position, duration_seconds, is_preview, chapters(position, course_id), lesson_contents(video_url, body)")
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
    content: row.lesson_contents ? { videoUrl: row.lesson_contents.video_url, body: row.lesson_contents.body } : null,
  };
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
