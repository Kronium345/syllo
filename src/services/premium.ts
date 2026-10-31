import type { AppSupabaseClient } from "@/lib/supabase";

// Pro status as the database sees it (the quiz limit). The premium-sync Edge Function reads
// RevenueCat with its secret key and writes premium_entitlements; the app only asks it to
// re-check. supabase-js sends the learner's Clerk token with the call.

export type PremiumSync = { premium: boolean; expiresAt: string | null };

/** Asks premium-sync to mirror the learner's RevenueCat entitlement into Supabase. */
export async function syncPremium(supabase: AppSupabaseClient): Promise<PremiumSync> {
  // Edge Function calls have no .throwOnError(); throw the returned error ourselves.
  const { data, error } = await supabase.functions.invoke<PremiumSync>("premium-sync", { method: "POST" });
  if (error) throw error;
  return { premium: !!data?.premium, expiresAt: data?.expiresAt ?? null };
}
