import { useAuth } from "@clerk/expo";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";

import type { Database } from "./database.types";

// The tutorial's client (prompts/04-supabase.md). Clerk owns the session: Supabase trusts
// Clerk session tokens (third-party auth, `role: authenticated` claim), so there's no
// Supabase sign-in and nothing for supabase-js to store. Row-level security decides
// what each learner can read or write, keyed on the token's `sub` (the Clerk user id).

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Add them to .env.local (see .env.example), then restart the dev server.",
  );
}

/**
 * Returns a typed Supabase client that attaches the current Clerk session token to
 * every request.
 *
 * Usage:
 *   const supabase = useSupabase();
 *   const { data } = await supabase.from("courses").select();
 */
export function useSupabase() {
  const { getToken } = useAuth();

  return useMemo(
    () =>
      createClient<Database>(supabaseUrl, supabasePublishableKey, {
        async accessToken() {
          return (await getToken()) ?? null;
        },
      }),
    [getToken],
  );
}
