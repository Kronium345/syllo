import { useQuery } from "@tanstack/react-query";

import { getInterviewSession } from "@/services/interviews";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** An interview with its questions, saved feedback and summary (null when it isn't the learner's). */
export function useInterviewSession(sessionId: string | null | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.interviews.session(sessionId ?? ""),
    queryFn: ({ signal }) => getInterviewSession(supabase, sessionId ?? "", signal),
    enabled: !!sessionId,
  });
}
