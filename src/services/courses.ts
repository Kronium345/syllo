import type { AppSupabaseClient } from "@/lib/supabase";

import { NotAllowedError } from "./errors";

// Course data in Supabase: plain async functions, no React. Hooks in
// src/lib/queries/courses/ wrap them with caching. RLS decides what each learner sees.
// Every query ends in .throwOnError(), so a failure rejects with the PostgrestError.

export type CourseListItem = { id: string; title: string };

/** Published courses (RLS hides drafts), by title. */
export async function getCourses(supabase: AppSupabaseClient, signal?: AbortSignal): Promise<CourseListItem[]> {
  const query = supabase.from("courses").select("id, title").order("title");
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return data;
}

/** How many published courses there are, without downloading them. */
export async function countCourses(supabase: AppSupabaseClient, signal?: AbortSignal): Promise<number> {
  const query = supabase.from("courses").select("id", { count: "exact", head: true });
  const { count } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return count ?? 0;
}

/**
 * Deletes a course (only its own tutor may; RLS). A refused delete affects 0 rows rather
 * than erroring, so the deleted row is selected back and none means NotAllowedError.
 */
export async function deleteCourse(supabase: AppSupabaseClient, courseId: string): Promise<void> {
  const { data } = await supabase.from("courses").delete().eq("id", courseId).select("id").throwOnError();
  if (data.length === 0) throw new NotAllowedError("Only its tutor can.");
}
