import type { AppSupabaseClient } from "@/lib/supabase";

import type { CourseAccess, CourseLevel } from "./courses";

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
