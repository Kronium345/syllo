import { useQuery } from "@tanstack/react-query";

import { getInterviewSessionsLeft } from "@/services/interviews";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** How many interviews the learner can still start (free: this week, Pro: today). */
export function useInterviewSessionsLeft({ enabled = true }: { enabled?: boolean } = {}) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.interviews.sessionsLeft(),
    queryFn: ({ signal }) => getInterviewSessionsLeft(supabase, signal),
    enabled,
  });
}
