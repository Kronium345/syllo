import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type InterviewTarget, startGeneralInterview, startPharmacyInterview } from "@/services/interviews";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

export type InterviewStart = { mode: "pharmacy"; target: InterviewTarget } | { mode: "general"; role: string };

/** Starts (or reopens) an interview; resolves to the session id. */
export function useStartInterview() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (start: InterviewStart) =>
      start.mode === "pharmacy" ? startPharmacyInterview(supabase, start.target) : startGeneralInterview(supabase, start.role),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.interviews.sessionsLeft() }),
  });
}
