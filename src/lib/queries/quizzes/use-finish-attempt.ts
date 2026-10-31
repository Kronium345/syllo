import { useMutation, useQueryClient } from "@tanstack/react-query";

import { finishAttempt } from "@/services/quizzes";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Finishes an attempt; the attempt and every quiz start screen refetch. */
export function useFinishAttempt() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: string) => finishAttempt(supabase, attemptId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.all }),
  });
}
