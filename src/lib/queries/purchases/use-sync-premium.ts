import { useMutation, useQueryClient } from "@tanstack/react-query";

import { syncPremium } from "@/services/premium";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/**
 * Asks the server to re-read the learner's Pro status from RevenueCat. The quiz limit, and
 * premium courses and their lessons (prompts/16), refetch.
 */
export function useSyncPremium() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncPremium(supabase),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.sessionsLeft() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all }),
      ]),
  });
}
