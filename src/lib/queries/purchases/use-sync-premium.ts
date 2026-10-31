import { useMutation, useQueryClient } from "@tanstack/react-query";

import { syncPremium } from "@/services/premium";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Asks the server to re-read the learner's Pro status from RevenueCat; the quiz limit refetches. */
export function useSyncPremium() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => syncPremium(supabase),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.sessionsLeft() }),
  });
}
