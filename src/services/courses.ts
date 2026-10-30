import type { AppSupabaseClient } from "@/lib/supabase";

import { NotAllowedError, unwrap } from "./supabase-result";

// Course data in Supabase: plain async functions, no React. Hooks in
// src/lib/queries/courses/ wrap them with caching. RLS decides what each learner sees.

export type CourseListItem = { id: string; title: string };

/** Published courses (RLS hides drafts), by title. */
export async function getCourses(supabase: AppSupabaseClient, signal?: AbortSignal): Promise<CourseListItem[]> {
  const query = supabase.from("courses").select("id, title").order("title");
  return unwrap(await (signal ? query.abortSignal(signal) : query));
}

/** How many published courses there are, without downloading them. */
export async function countCourses(supabase: AppSupabaseClient, signal?: AbortSignal): Promise<number> {
  const query = supabase.from("courses").select("id", { count: "exact", head: true });
  const { count, error } = await (signal ? query.abortSignal(signal) : query);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Deletes a course (only its own tutor may; RLS). A refused delete affects 0 rows rather
 * than erroring, so this throws NotAllowedError.
 */
export async function deleteCourse(supabase: AppSupabaseClient, courseId: string): Promise<void> {
  const deleted = unwrap(await supabase.from("courses").delete().eq("id", courseId).select("id"));
  if (deleted.length === 0) throw new NotAllowedError("Only its tutor can.");
}
