import { useQuery } from "@tanstack/react-query";

import { getUnfinishedAttempts } from "@/services/quizzes";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Quizzes the learner started but didn't finish (study reminders). Refreshes with every quiz change. */
export function useUnfinishedAttempts() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.quizzes.unfinished(),
    queryFn: ({ signal }) => getUnfinishedAttempts(supabase, signal),
  });
}
