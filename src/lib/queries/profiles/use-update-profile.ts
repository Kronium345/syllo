import { useMutation } from "@tanstack/react-query";

import { type ProfileRow, updateProfile } from "@/services/profiles";

import { useSupabase } from "../../supabase";

/** Keeps an existing profile row's name and photo in step with Clerk (never creates the row). */
export function useUpdateProfile() {
  const supabase = useSupabase();
  return useMutation({
    mutationFn: (profile: ProfileRow) => updateProfile(supabase, profile),
  });
}
