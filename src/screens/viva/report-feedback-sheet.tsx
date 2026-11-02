import { ReportSheet } from "@/components/ui/report-sheet";
import { toast } from "@/components/ui/toast";
import { useReportVivaFeedback } from "@/lib/queries/viva";

/** "Report this feedback" on a viva answer (prompts/17). */
export function ReportFeedbackSheet({
  target,
  onClose,
}: {
  /** The answer being reported; null hides the sheet. */
  target: { sessionId: string; questionId: string } | null;
  onClose: () => void;
}) {
  const report = useReportVivaFeedback();
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
