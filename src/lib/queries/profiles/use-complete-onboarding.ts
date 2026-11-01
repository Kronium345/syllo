import { useMutation, useQueryClient } from "@tanstack/react-query";

import { completeOnboarding, type ProfileRow } from "@/services/profiles";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/**
 * Finishes onboarding by creating the profile row. Refetching the profile flips the
 * (app) layout's gate from onboarding to the app.
 */
export function useCompleteOnboarding() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profile: ProfileRow & { goal: string | null; interests: string[] }) =>
      completeOnboarding(supabase, profile),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all }),
  });
}
