import { useMutation, useQueryClient } from "@tanstack/react-query";

import { startAttempt } from "@/services/quizzes";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Starts a quiz session; resolves the attempt id. Rejects with QuizLimitError at the free limit. */
export function useStartAttempt() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { quizId: string; count: number | null; timed: boolean }) => startAttempt(supabase, vars),
    onSettled: (_id, _error, vars) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.sessionsLeft() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.quizzes.start(vars.quizId) }),
      ]),
  });
}
