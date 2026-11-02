import type { AppSupabaseClient } from "@/lib/supabase";

// Tutor follows (prompts/16): the learner's own rows only (RLS). Course details reads them
// through its tutor embed (`tutor.isFollowed`).

/** Follows a tutor. Already following is fine (primary-key violation). */
export async function followTutor(supabase: AppSupabaseClient, tutorId: string): Promise<void> {
  try {
    await supabase.from("tutor_follows").insert({ tutor_id: tutorId }).throwOnError();
  } catch (error) {
    if ((error as { code?: string }).code !== "23505") throw error;
  }
}

/** Unfollows a tutor (the learner's own row). */
export async function unfollowTutor(supabase: AppSupabaseClient, tutorId: string): Promise<void> {
  await supabase.from("tutor_follows").delete().eq("tutor_id", tutorId).throwOnError();
}
