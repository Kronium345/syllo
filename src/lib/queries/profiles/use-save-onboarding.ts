import { useMutation, useQueryClient } from "@tanstack/react-query";

import { saveOnboarding } from "@/services/profiles";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Saves the onboarding answers to the learner's own profile. */
export function useSaveOnboarding() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { userId: string; goal: string | null; interests: string[] }) =>
      saveOnboarding(supabase, vars.userId, vars),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all }),
  });
}
