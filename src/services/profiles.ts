import type { AppSupabaseClient } from "@/lib/supabase";

// Learner profiles in Supabase: plain async functions, no React. Hooks in
// src/lib/queries/profiles/ wrap them. RLS lets a learner touch only their own row.
// Every query ends in .throwOnError(), so a failure rejects with the PostgrestError.

export type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null };

/** Creates or updates the learner's own profile row (also used to restore it). */
export async function upsertProfile(supabase: AppSupabaseClient, profile: ProfileRow): Promise<void> {
  await supabase.from("profiles").upsert(profile).throwOnError();
}

/** Deletes the learner's own profile; their enrollments and quiz attempts cascade with it. */
export async function deleteProfile(supabase: AppSupabaseClient, userId: string): Promise<void> {
  await supabase.from("profiles").delete().eq("id", userId).throwOnError();
}
