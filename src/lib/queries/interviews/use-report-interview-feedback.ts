import { useMutation } from "@tanstack/react-query";

import { type InterviewReportReason, reportInterviewFeedback } from "@/services/interviews";

import { useSupabase } from "../../supabase";

/** Flags AI feedback on one answer, or on the summary (position null), for review. */
export function useReportInterviewFeedback() {
  const supabase = useSupabase();
  return useMutation({
    mutationFn: (report: { sessionId: string; position: number | null; reason: InterviewReportReason; comment: string | null }) =>
      reportInterviewFeedback(supabase, report),
  });
}
