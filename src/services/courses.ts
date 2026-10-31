import type { AppSupabaseClient } from "@/lib/supabase";

import { NotAllowedError } from "./errors";

// Course data in Supabase: plain async functions, no React. Hooks in
// src/lib/queries/courses/ wrap them with caching. RLS decides what each learner sees.
// Every query ends in .throwOnError(), so a failure rejects with the PostgrestError.

export type CourseListItem = { id: string; title: string };

/** A course as the Home and Explore cards show it, with its outline summed up. */
export type CourseCard = {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  category: string | null;
  tutorName: string | null;
  lessonCount: number;
  durationSeconds: number;
  /** Every lesson id, for progress against lesson_progress. */
  lessonIds: string[];
};

export type CourseFeedFilter = { search?: string; category?: string | null };

const CARD_COLUMNS = "id, slug, title, cover_image_url, category, tutors(name), chapters(lessons(id, duration_seconds))";

type CardRow = {
  id: string;
  slug: string;
  title: string;
  cover_image_url: string | null;
  category: string | null;
  tutors: { name: string } | null;
  chapters: { lessons: { id: string; duration_seconds: number }[] }[];
};

function toCard(row: CardRow): CourseCard {
  const lessons = row.chapters.flatMap((chapter) => chapter.lessons);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    coverImageUrl: row.cover_image_url,
    category: row.category,
    tutorName: row.tutors?.name ?? null,
    lessonCount: lessons.length,
    durationSeconds: lessons.reduce((total, lesson) => total + lesson.duration_seconds, 0),
    lessonIds: lessons.map((lesson) => lesson.id),
  };
}

/** `%` and `_` are wildcards in ilike; a learner typing them means the characters. */
function likePattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

/** Published courses (RLS hides drafts) for the cards, filtered by title search and category. */
export async function getCourseFeed(
  supabase: AppSupabaseClient,
  filter: CourseFeedFilter,
  signal?: AbortSignal,
): Promise<CourseCard[]> {
  let query = supabase.from("courses").select(CARD_COLUMNS).order("title");
  const search = filter.search?.trim();
  if (search) query = query.ilike("title", likePattern(search));
  if (filter.category) query = query.eq("category", filter.category);
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return (data as unknown as CardRow[]).map(toCard);
}

/** The distinct categories of published courses, for Explore's chips. */
export async function getCategories(supabase: AppSupabaseClient, signal?: AbortSignal): Promise<string[]> {
  const query = supabase.from("courses").select("category").not("category", "is", null).order("category");
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return [...new Set(data.map((row) => row.category).filter((category): category is string => !!category))];
}

/** The course the learner enrolled in most recently, or null (RLS: their own enrollments). */
export async function getLatestEnrollment(
  supabase: AppSupabaseClient,
  signal?: AbortSignal,
): Promise<CourseCard | null> {
  const query = supabase
    .from("enrollments")
    .select(`courses(${CARD_COLUMNS})`)
    .order("created_at", { ascending: false })
    .limit(1);
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  const course = (data[0] as unknown as { courses: CardRow | null } | undefined)?.courses;
  return course ? toCard(course) : null;
}

export type LessonOutline = { id: string; title: string; position: number; durationSeconds: number; isPreview: boolean };
export type ChapterOutline = {
  id: string;
  title: string;
  position: number;
  lessons: LessonOutline[];
  /** `questionCount` is 0 while the quiz is locked (RLS hides its questions). */
  quizzes: { id: string; title: string; isPreview: boolean; questionCount: number }[];
};
export type CourseDetails = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  coverImageUrl: string | null;
  tutor: { id: string; name: string; headline: string | null; avatarUrl: string | null } | null;
  chapters: ChapterOutline[];
  isEnrolled: boolean;
};

type DetailsRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  tutors: { id: string; name: string; headline: string | null; avatar_url: string | null } | null;
  chapters: {
    id: string;
    title: string;
    position: number;
    lessons: { id: string; title: string; position: number; duration_seconds: number; is_preview: boolean }[];
    quizzes: { id: string; title: string; is_preview: boolean; quiz_questions: { count: number }[] }[];
  }[];
  enrollments: { id: string }[];
};

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

/**
 * A course with its tutor and ordered outline (chapters → lessons, quizzes), and whether
 * the learner is enrolled (RLS returns only their own enrollment). Null when RLS hides it.
 */
export async function getCourseDetails(
  supabase: AppSupabaseClient,
  courseId: string,
  signal?: AbortSignal,
): Promise<CourseDetails | null> {
  const query = supabase
    .from("courses")
    .select(
      "id, slug, title, description, cover_image_url, tutors(id, name, headline, avatar_url), " +
        "chapters(id, title, position, lessons(id, title, position, duration_seconds, is_preview), quizzes(id, title, is_preview, quiz_questions(count))), " +
        "enrollments(id)",
    )
    .eq("id", courseId);
  const { data } = await (signal ? query.abortSignal(signal) : query).maybeSingle().throwOnError();
  if (!data) return null;
  const row = data as unknown as DetailsRow;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    coverImageUrl: row.cover_image_url,
    tutor: row.tutors
      ? { id: row.tutors.id, name: row.tutors.name, headline: row.tutors.headline, avatarUrl: row.tutors.avatar_url }
      : null,
    chapters: [...row.chapters].sort(byPosition).map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      position: chapter.position,
      lessons: [...chapter.lessons].sort(byPosition).map((lesson) => ({
        id: lesson.id,
        title: lesson.title,
        position: lesson.position,
        durationSeconds: lesson.duration_seconds,
        isPreview: lesson.is_preview,
      })),
      quizzes: chapter.quizzes.map((quiz) => ({
        id: quiz.id,
        title: quiz.title,
        isPreview: quiz.is_preview,
        questionCount: quiz.quiz_questions[0]?.count ?? 0,
      })),
    })),
    isEnrolled: row.enrollments.length > 0,
  };
}

/** How many learners are enrolled in a published course (RPC; counts only, no rows). */
export async function getStudentCount(supabase: AppSupabaseClient, courseId: string, signal?: AbortSignal): Promise<number> {
  const query = supabase.rpc("course_student_count", { p_course_id: courseId });
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return data ?? 0;
}

/** The courses the learner is enrolled in, as cards (for progress and certificates). */
export async function getEnrolledCourses(supabase: AppSupabaseClient, signal?: AbortSignal): Promise<CourseCard[]> {
  const query = supabase.from("enrollments").select(`courses(${CARD_COLUMNS})`).order("created_at", { ascending: false });
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return (data as unknown as { courses: CardRow | null }[])
    .map((row) => row.courses)
    .filter((course): course is CardRow => course !== null)
    .map(toCard);
}

/**
 * Enrolls the learner in a published course (free for now). Already being enrolled is
 * fine (unique violation). RLS refuses drafts, which rejects with its PostgrestError.
 */
export async function enroll(supabase: AppSupabaseClient, courseId: string): Promise<void> {
  try {
    await supabase.from("enrollments").insert({ course_id: courseId }).throwOnError();
  } catch (error) {
    if ((error as { code?: string }).code !== "23505") throw error;
  }
}

/**
 * Deletes a course (only its own tutor may; RLS). A refused delete affects 0 rows rather
 * than erroring, so the deleted row is selected back and none means NotAllowedError.
 */
export async function deleteCourse(supabase: AppSupabaseClient, courseId: string): Promise<void> {
  const { data } = await supabase.from("courses").delete().eq("id", courseId).select("id").throwOnError();
  if (data.length === 0) throw new NotAllowedError("Only its tutor can.");
}
