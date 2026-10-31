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

export type OnboardingProfile = {
  onboardingGoal: string | null;
  interests: string[];
  onboardingCompletedAt: string | null;
};

/**
 * Saves the onboarding answers to the learner's own profile. An upsert on `id`, so it
 * works even before useSyncProfile has created the row.
 */
export async function saveOnboarding(
  supabase: AppSupabaseClient,
  userId: string,
  answers: { goal: string | null; interests: string[] },
): Promise<void> {
  await supabase
    .from("profiles")
    .upsert({
      id: userId,
      onboarding_goal: answers.goal,
      interests: answers.interests,
      onboarding_completed_at: new Date().toISOString(),
    })
    .throwOnError();
}

/** The learner's onboarding answers, or null before their profile row exists. */
export async function getMyProfile(
  supabase: AppSupabaseClient,
  userId: string,
  signal?: AbortSignal,
): Promise<OnboardingProfile | null> {
  const query = supabase
    .from("profiles")
    .select("onboarding_goal, interests, onboarding_completed_at")
    .eq("id", userId);
  const { data } = await (signal ? query.abortSignal(signal) : query).maybeSingle().throwOnError();
  return data
    ? { onboardingGoal: data.onboarding_goal, interests: data.interests, onboardingCompletedAt: data.onboarding_completed_at }
    : null;
}
