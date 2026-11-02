import { ReportSheet } from "@/components/ui/report-sheet";
import { toast } from "@/components/ui/toast";
import { useReportInterviewFeedback } from "@/lib/queries/interviews";

/** "Report this feedback" on an interview answer or (position null) the summary (prompts/18). */
export function ReportInterviewSheet({
  target,
  onClose,
}: {
  target: { sessionId: string; position: number | null } | null;
  onClose: () => void;
}) {
  const report = useReportInterviewFeedback();
  return (
    <ReportSheet
      visible={target !== null}
      sending={report.isPending}
      onClose={onClose}
      onSend={(reason, comment) => {
        if (!target) return;
        report.mutate(
          { ...target, reason, comment },
          {
            onSuccess: () => {
              toast.success("Thanks, we'll review it.");
              onClose();
            },
            onError: () => toast.error("Couldn't send your report.", "Check your connection and try again."),
          },
        );
      }}
    />
  );
}
