import type { AppSupabaseClient } from "@/lib/supabase";

// Learner profiles in Supabase: plain async functions, no React. Hooks in
// src/lib/queries/profiles/ wrap them. RLS lets a learner touch only their own row.
// Every query ends in .throwOnError(), so a failure rejects with the PostgrestError.

export type ProfileRow = { id: string; full_name: string | null; avatar_url: string | null };

/** Keeps an existing profile row's name and photo in step with Clerk; no row, no change. */
export async function updateProfile(supabase: AppSupabaseClient, profile: ProfileRow): Promise<void> {
  await supabase
    .from("profiles")
    .update({ full_name: profile.full_name, avatar_url: profile.avatar_url })
    .eq("id", profile.id)
    .throwOnError();
}

/**
 * Creates or replaces the learner's own profile row. Used only to restore it when account
 * deletion stops after removing it; everything else must not create the row (prompts/11).
 */
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
  /** When the learner agreed to AI feedback and confirmed 18+ (viva practice, prompts/17). */
  aiConsentAt: string | null;
};

/**
 * Finishes onboarding by creating the learner's profile row (prompts/11). The row's
 * existence is what "onboarded" means, so only this inserts it. A row that already exists
 * (e.g. finished on another device) counts as done.
 */
export async function completeOnboarding(
  supabase: AppSupabaseClient,
  profile: ProfileRow & { goal: string | null; interests: string[] },
): Promise<void> {
  try {
    await supabase
      .from("profiles")
      .insert({
        id: profile.id,
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        onboarding_goal: profile.goal,
        interests: profile.interests,
        onboarding_completed_at: new Date().toISOString(),
      })
      .throwOnError();
  } catch (error) {
    if ((error as { code?: string }).code !== "23505") throw error;
  }
}

/** The learner's profile (onboarding answers), or null before onboarding has created the row. */
export async function getMyProfile(
  supabase: AppSupabaseClient,
  userId: string,
  signal?: AbortSignal,
): Promise<OnboardingProfile | null> {
  const query = supabase
    .from("profiles")
    .select("onboarding_goal, interests, onboarding_completed_at, ai_consent_at")
    .eq("id", userId);
  const { data } = await (signal ? query.abortSignal(signal) : query).maybeSingle().throwOnError();
  return data
    ? {
        onboardingGoal: data.onboarding_goal,
        interests: data.interests,
        onboardingCompletedAt: data.onboarding_completed_at,
        aiConsentAt: data.ai_consent_at,
      }
    : null;
}
