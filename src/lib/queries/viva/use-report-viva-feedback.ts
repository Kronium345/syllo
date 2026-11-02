import { useMutation } from "@tanstack/react-query";

import { reportVivaFeedback, type VivaReportReason } from "@/services/viva";

import { useSupabase } from "../../supabase";

/** Flags one piece of AI feedback for review. */
export function useReportVivaFeedback() {
  const supabase = useSupabase();
  return useMutation({
    mutationFn: (report: { sessionId: string; questionId: string; reason: VivaReportReason; comment: string | null }) =>
      reportVivaFeedback(supabase, report),
  });
}
