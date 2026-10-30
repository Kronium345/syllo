import { useMutation } from "@tanstack/react-query";

import { type ProfileRow, upsertProfile } from "@/services/profiles";

import { useSupabase } from "../../supabase";

/** Creates or updates the learner's own profile row (also used to restore it). */
export function useUpsertProfile() {
  const supabase = useSupabase();
  return useMutation({
    mutationFn: (profile: ProfileRow) => upsertProfile(supabase, profile),
  });
}
