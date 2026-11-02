import type { AppSupabaseClient } from "@/lib/supabase";

import { NotAllowedError } from "./errors";

// Course ratings (prompts/16): one 1-5 rating (+ optional comment) per enrolled learner per
// course. RLS allows writes only for enrolled learners and their own row; a trigger keeps
// courses.rating_average/rating_count in step.

export type MyReview = { rating: number; comment: string | null };

/** The learner's own review of a course, or null. `userId` is their Clerk id. */
export async function getMyReview(
  supabase: AppSupabaseClient,
  courseId: string,
  userId: string,
  signal?: AbortSignal,
): Promise<MyReview | null> {
  const query = supabase
    .from("course_reviews")
    .select("rating, comment")
    .eq("course_id", courseId)
    .eq("user_id", userId);
  const { data } = await (signal ? query.abortSignal(signal) : query).maybeSingle().throwOnError();
  return data ? { rating: data.rating, comment: data.comment } : null;
}

/**
 * Saves (creates or replaces) the learner's rating. RLS refuses learners who aren't enrolled:
 * an insert refusal errors (42501), and an update refusal affects 0 rows; both are NotAllowedError.
 */
export async function rateCourse(
  supabase: AppSupabaseClient,
  courseId: string,
  rating: number,
  comment: string | null,
): Promise<void> {
  try {
    const { data } = await supabase
      .from("course_reviews")
      .upsert({ course_id: courseId, rating, comment: comment?.trim() || null }, { onConflict: "course_id,user_id" })
      .select("id")
      .throwOnError();
    if (data.length === 0) throw new NotAllowedError("Enroll in the course to rate it.");
  } catch (error) {
    if ((error as { code?: string }).code === "42501") throw new NotAllowedError("Enroll in the course to rate it.");
    throw error;
  }
}

/** Removes the learner's rating of a course (only their own row; RLS). */
export async function deleteMyReview(supabase: AppSupabaseClient, courseId: string, userId: string): Promise<void> {
  await supabase.from("course_reviews").delete().eq("course_id", courseId).eq("user_id", userId).throwOnError();
}
