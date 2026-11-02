import { useMutation, useQueryClient } from "@tanstack/react-query";

import { finishInterview, type InterviewSession } from "@/services/interviews";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Finishes an interview; the summary goes into the session cache, then everything refetches. */
export function useFinishInterview() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => finishInterview(supabase, sessionId),
    onSuccess: (summary, sessionId) => {
      queryClient.setQueryData<InterviewSession | null>(queryKeys.interviews.session(sessionId), (old) =>
        old ? { ...old, finished: true, summary } : old,
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.interviews.all }),
  });
}
