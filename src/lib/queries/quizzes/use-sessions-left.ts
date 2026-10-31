import { useQuery } from "@tanstack/react-query";

import { getSessionsLeft } from "@/services/quizzes";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Free quizzes left in the last 24 hours (`data` null = Pro, unlimited). */
export function useSessionsLeft() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.quizzes.sessionsLeft(),
    queryFn: ({ signal }) => getSessionsLeft(supabase, signal),
    // The count changes as the 24-hour window moves; don't trust it for long.
    staleTime: 0,
  });
}
