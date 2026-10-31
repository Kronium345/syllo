import { useQuery } from "@tanstack/react-query";

import { getAttempt } from "@/services/quizzes";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** An attempt with its questions and the answers given so far (player, results, review). */
export function useAttempt(attemptId: string | null | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.quizzes.attempt(attemptId ?? ""),
    queryFn: ({ signal }) => getAttempt(supabase, attemptId ?? "", signal),
    enabled: !!attemptId,
    // The player updates this cache itself as answers come back; don't refetch mid-question.
    staleTime: Infinity,
  });
}
