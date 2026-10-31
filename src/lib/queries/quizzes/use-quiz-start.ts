import { useQuery } from "@tanstack/react-query";

import { getQuizStart } from "@/services/quizzes";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** The start screen's data: quiz, size, lock, unfinished attempt and last score. */
export function useQuizStart(quizId: string | null | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.quizzes.start(quizId ?? ""),
    queryFn: ({ signal }) => getQuizStart(supabase, quizId ?? "", signal),
    enabled: !!quizId,
  });
}
