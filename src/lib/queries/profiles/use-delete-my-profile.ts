import { useMutation } from "@tanstack/react-query";

import { deleteProfile } from "@/services/profiles";

import { useSupabase } from "../../supabase";

/** Deletes the learner's own profile; their enrollments and quiz attempts cascade with it. */
export function useDeleteMyProfile() {
  const supabase = useSupabase();
  return useMutation({
    mutationFn: (userId: string) => deleteProfile(supabase, userId),
  });
}
