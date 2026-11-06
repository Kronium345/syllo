import type { AppSupabaseClient } from "@/lib/supabase";

import type { CourseAccess, CourseLevel } from "./courses";
import { NotAllowedError } from "./errors";

// Tutor data (Part 2, prompts/20): plain async functions, no React. Hooks in
// src/lib/queries/tutor/ wrap them. RLS lets a tutor read their own courses in any state
// ("Read published or own courses"); everyone else's published courses are filtered out here.

/** A course on the tutor dashboard. */
export type TutorCourse = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  isPublished: boolean;
  access: CourseAccess;
  level: CourseLevel | null;
  chapterCount: number;
  lessonCount: number;
  quizCount: number;
  createdAt: string;
};

type TutorCourseRow = {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  is_published: boolean;
  access: string;
  level: string | null;
  created_at: string;
  chapters: { lessons: { id: string }[]; quizzes: { id: string }[] }[];
};

function toLevel(level: string | null): CourseLevel | null {
  return level === "beginner" || level === "intermediate" || level === "advanced" ? level : null;
}

/** The courses the signed-in tutor teaches (tutors.profile_id = their Clerk id), newest first. */
export async function getMyCourses(
  supabase: AppSupabaseClient,
  userId: string,
  signal?: AbortSignal,
): Promise<TutorCourse[]> {
  const query = supabase
    .from("courses")
    .select(
      "id, slug, title, cover_image_url, is_published, access, level, created_at, tutors!inner(profile_id), chapters(lessons(id), quizzes(id))",
    )
    .eq("tutors.profile_id", userId)
    .order("created_at", { ascending: false });
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return (data as unknown as TutorCourseRow[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    coverImageUrl: row.cover_image_url,
    isPublished: row.is_published,
    access: row.access === "premium" ? "premium" : "free",
    level: toLevel(row.level),
    chapterCount: row.chapters.length,
    lessonCount: row.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0),
    quizCount: row.chapters.reduce((total, chapter) => total + chapter.quizzes.length, 0),
    createdAt: row.created_at,
  }));
}

/** What the New course form sends (prompts/21). */
export type NewCourseInput = {
  title: string;
  /** Empty for none. */
  subtitle: string;
  description: string;
  category: string;
  level: CourseLevel;
  access: CourseAccess;
};

/**
 * Creates a draft course owned by the signed-in tutor and returns its id. The database
 * function checks the Clerk role (`metadata.role = "tutor"` in the session token), makes the
 * tutor row on first use and validates the fields again; a non-tutor gets NotAllowedError.
 */
export async function createCourse(supabase: AppSupabaseClient, input: NewCourseInput): Promise<string> {
  try {
    const { data } = await supabase
      .rpc("create_course", {
        p_title: input.title,
        p_subtitle: input.subtitle,
        p_description: input.description,
        p_category: input.category,
        p_level: input.level,
        p_access: input.access,
      })
      .throwOnError();
    return data;
  } catch (error) {
    if ((error as { code?: string }).code === "42501") throw new NotAllowedError("Only tutors can create courses.");
    throw error;
  }
}

/** A lesson in the course editor's outline. */
export type TutorLesson = { id: string; title: string; position: number; durationSeconds: number; isPreview: boolean };
/** A chapter in the course editor's outline, lessons in order. */
export type TutorChapter = { id: string; title: string; position: number; lessons: TutorLesson[]; quizCount: number };

/** A course as the editor shows it (prompts/22). */
export type TutorCourseDetails = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string | null;
  level: CourseLevel | null;
  access: CourseAccess;
  isPublished: boolean;
  coverImageUrl: string | null;
  chapters: TutorChapter[];
};

type TutorCourseDetailsRow = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  category: string | null;
  level: string | null;
  access: string;
  is_published: boolean;
  cover_image_url: string | null;
  chapters: {
    id: string;
    title: string;
    position: number;
    lessons: { id: string; title: string; position: number; duration_seconds: number; is_preview: boolean }[];
    quizzes: { id: string }[];
  }[];
};

/**
 * One of the signed-in tutor's courses with its outline, or null when it doesn't exist or
 * isn't theirs (another tutor's published course is readable but not editable, so it's filtered).
 */
export async function getTutorCourse(
  supabase: AppSupabaseClient,
  userId: string,
  courseId: string,
  signal?: AbortSignal,
): Promise<TutorCourseDetails | null> {
  const query = supabase
    .from("courses")
    .select(
      "id, slug, title, subtitle, description, category, level, access, is_published, cover_image_url, tutors!inner(profile_id), chapters(id, title, position, lessons(id, title, position, duration_seconds, is_preview), quizzes(id))",
    )
    .eq("id", courseId)
    .eq("tutors.profile_id", userId);
  const { data } = await (signal ? query.abortSignal(signal) : query).maybeSingle().throwOnError();
  if (!data) return null;
  const row = data as unknown as TutorCourseDetailsRow;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle,
    description: row.description,
    category: row.category,
    level: toLevel(row.level),
    access: row.access === "premium" ? "premium" : "free",
    isPublished: row.is_published,
    coverImageUrl: row.cover_image_url,
    chapters: [...row.chapters]
      .sort((a, b) => a.position - b.position)
      .map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
        position: chapter.position,
        quizCount: chapter.quizzes.length,
        lessons: [...chapter.lessons]
          .sort((a, b) => a.position - b.position)
          .map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            position: lesson.position,
            durationSeconds: lesson.duration_seconds,
            isPreview: lesson.is_preview,
          })),
      })),
  };
}

/** Course editor writes (prompts/22) go through RPCs that check ownership: 42501 → NotAllowedError. */
function notAllowedOr(error: unknown): unknown {
  return (error as { code?: string }).code === "42501" ? new NotAllowedError("Not allowed to change this course.") : error;
}

export type CourseDetailsInput = NewCourseInput & { courseId: string };

export async function updateCourse(supabase: AppSupabaseClient, input: CourseDetailsInput): Promise<void> {
  try {
    await supabase
      .rpc("update_course", {
        p_course_id: input.courseId,
        p_title: input.title,
        p_subtitle: input.subtitle,
        p_description: input.description,
        p_category: input.category,
        p_level: input.level,
        p_access: input.access,
      })
      .throwOnError();
  } catch (error) {
    throw notAllowedOr(error);
  }
}

/** Publishing needs at least one lesson (the RPC raises 22023 otherwise). */
export async function setCoursePublished(supabase: AppSupabaseClient, courseId: string, published: boolean): Promise<void> {
  try {
    await supabase.rpc("set_course_published", { p_course_id: courseId, p_published: published }).throwOnError();
  } catch (error) {
    throw notAllowedOr(error);
  }
}

export async function addChapter(supabase: AppSupabaseClient, courseId: string, title: string): Promise<string> {
  try {
    const { data } = await supabase.rpc("add_chapter", { p_course_id: courseId, p_title: title }).throwOnError();
    return data;
  } catch (error) {
    throw notAllowedOr(error);
  }
}

export async function renameChapter(supabase: AppSupabaseClient, chapterId: string, title: string): Promise<void> {
  try {
    await supabase.rpc("rename_chapter", { p_chapter_id: chapterId, p_title: title }).throwOnError();
  } catch (error) {
    throw notAllowedOr(error);
  }
}

export async function deleteChapter(supabase: AppSupabaseClient, chapterId: string): Promise<void> {
  try {
    await supabase.rpc("delete_chapter", { p_chapter_id: chapterId }).throwOnError();
  } catch (error) {
    throw notAllowedOr(error);
  }
}

/** -1 moves up, 1 moves down; a no-op at either end. */
export async function moveChapter(supabase: AppSupabaseClient, chapterId: string, direction: -1 | 1): Promise<void> {
  try {
    await supabase.rpc("move_chapter", { p_chapter_id: chapterId, p_direction: direction }).throwOnError();
  } catch (error) {
    throw notAllowedOr(error);
  }
}

export async function addLesson(supabase: AppSupabaseClient, chapterId: string, title: string): Promise<string> {
  try {
    const { data } = await supabase.rpc("add_lesson", { p_chapter_id: chapterId, p_title: title }).throwOnError();
    return data;
  } catch (error) {
    throw notAllowedOr(error);
  }
}

export async function deleteLesson(supabase: AppSupabaseClient, lessonId: string): Promise<void> {
  try {
    await supabase.rpc("delete_lesson", { p_lesson_id: lessonId }).throwOnError();
  } catch (error) {
    throw notAllowedOr(error);
  }
}

export async function moveLesson(supabase: AppSupabaseClient, lessonId: string, direction: -1 | 1): Promise<void> {
  try {
    await supabase.rpc("move_lesson", { p_lesson_id: lessonId, p_direction: direction }).throwOnError();
  } catch (error) {
    throw notAllowedOr(error);
  }
}

/** A downloadable file on a lesson, as the lesson editor lists it (prompts/23). */
export type TutorLessonResource = { id: string; title: string; fileName: string; sizeBytes: number; mimeType: string };

/** A lesson as the lesson editor shows it (prompts/23). */
export type TutorLessonDetails = {
  id: string;
  courseId: string;
  chapterPosition: number;
  position: number;
  title: string;
  isPreview: boolean;
  durationSeconds: number;
  body: string;
  /** Set when the video is in R2 (a tutor upload or a seeded clip). */
  videoKey: string | null;
  /** An outside link (seeded placeholder clips). */
  videoUrl: string | null;
  resources: TutorLessonResource[];
};

type TutorLessonRow = {
  id: string;
  title: string;
  position: number;
  is_preview: boolean;
  duration_seconds: number;
  chapters: { position: number; course_id: string };
  lesson_contents: { body: string | null; video_key: string | null; video_url: string | null } | null;
  lesson_resources: {
    id: string;
    title: string;
    file_name: string;
    size_bytes: number;
    mime_type: string;
    position: number;
  }[];
};

/** One of the signed-in tutor's lessons with its content and resources, or null when it isn't theirs. */
export async function getTutorLesson(
  supabase: AppSupabaseClient,
  userId: string,
  lessonId: string,
  signal?: AbortSignal,
): Promise<TutorLessonDetails | null> {
  const query = supabase
    .from("lessons")
    .select(
      "id, title, position, is_preview, duration_seconds, chapters!inner(position, course_id, courses!inner(tutors!inner(profile_id))), lesson_contents(body, video_key, video_url), lesson_resources(id, title, file_name, size_bytes, mime_type, position)",
    )
    .eq("id", lessonId)
    .eq("chapters.courses.tutors.profile_id", userId);
  const { data } = await (signal ? query.abortSignal(signal) : query).maybeSingle().throwOnError();
  if (!data) return null;
  const row = data as unknown as TutorLessonRow;
  return {
    id: row.id,
    courseId: row.chapters.course_id,
    chapterPosition: row.chapters.position,
    position: row.position,
    title: row.title,
    isPreview: row.is_preview,
    durationSeconds: row.duration_seconds,
    body: row.lesson_contents?.body ?? "",
    videoKey: row.lesson_contents?.video_key ?? null,
    videoUrl: row.lesson_contents?.video_url ?? null,
    resources: [...row.lesson_resources]
      .sort((a, b) => a.position - b.position)
      .map((resource) => ({
        id: resource.id,
        title: resource.title,
        fileName: resource.file_name,
        sizeBytes: resource.size_bytes,
        mimeType: resource.mime_type,
      })),
  };
}

export type LessonDetailsInput = { lessonId: string; title: string; body: string; isPreview: boolean };

export async function updateLesson(supabase: AppSupabaseClient, input: LessonDetailsInput): Promise<void> {
  try {
    await supabase
      .rpc("update_lesson", {
        p_lesson_id: input.lessonId,
        p_title: input.title,
        p_body: input.body,
        p_is_preview: input.isPreview,
      })
      .throwOnError();
  } catch (error) {
    throw notAllowedOr(error);
  }
}

/** Points the lesson at an uploaded video; resolves to the key it replaced (to delete), if any. */
export async function setLessonVideo(
  supabase: AppSupabaseClient,
  lessonId: string,
  key: string,
  durationSeconds: number,
): Promise<string | null> {
  try {
    const { data } = await supabase
      .rpc("set_lesson_video", { p_lesson_id: lessonId, p_key: key, p_duration_seconds: durationSeconds })
      .throwOnError();
    return data ?? null;
  } catch (error) {
    throw notAllowedOr(error);
  }
}

/** Removes the lesson's video; resolves to the removed R2 key (to delete), if any. */
export async function removeLessonVideo(supabase: AppSupabaseClient, lessonId: string): Promise<string | null> {
  try {
    const { data } = await supabase.rpc("remove_lesson_video", { p_lesson_id: lessonId }).throwOnError();
    return data ?? null;
  } catch (error) {
    throw notAllowedOr(error);
  }
}

export type NewResourceInput = {
  lessonId: string;
  title: string;
  fileName: string;
  sizeBytes: number;
  mimeType: string;
  key: string;
};

export async function addLessonResource(supabase: AppSupabaseClient, input: NewResourceInput): Promise<string> {
  try {
    const { data } = await supabase
      .rpc("add_lesson_resource", {
        p_lesson_id: input.lessonId,
        p_title: input.title,
        p_file_name: input.fileName,
        p_size_bytes: input.sizeBytes,
        p_mime_type: input.mimeType,
        p_key: input.key,
      })
      .throwOnError();
    return data;
  } catch (error) {
    throw notAllowedOr(error);
  }
}

/** Deletes a resource row; resolves to its R2 key (to delete). */
export async function deleteLessonResource(supabase: AppSupabaseClient, resourceId: string): Promise<string | null> {
  try {
    const { data } = await supabase.rpc("delete_lesson_resource", { p_resource_id: resourceId }).throwOnError();
    return data ?? null;
  } catch (error) {
    throw notAllowedOr(error);
  }
}
