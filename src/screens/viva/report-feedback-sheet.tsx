import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { useReportVivaFeedback, type VivaReportReason } from "@/lib/queries/viva";
import { tw } from "@/theme";

const REASONS: { value: VivaReportReason; label: string }[] = [
  { value: "inaccurate", label: "Inaccurate" },
  { value: "offensive", label: "Offensive" },
  { value: "other", label: "Other" },
];

/** "Report this feedback" (prompts/17; Google Play's AI-generated content policy). */
export function ReportFeedbackSheet({
  target,
  onClose,
}: {
  /** The answer being reported; null hides the sheet. */
  target: { sessionId: string; questionId: string } | null;
  onClose: () => void;
}) {
  const report = useReportVivaFeedback();
  const [reason, setReason] = useState<VivaReportReason | null>(null);
  const [comment, setComment] = useState("");
  const visible = target !== null;
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setReason(null);
      setComment("");
    }
  }

  const send = () => {
    if (!target || !reason) return;
    report.mutate(
      { ...target, reason, comment: comment.trim() || null },
      {
        onSuccess: () => {
          toast.success("Thanks, we'll review it.");
          onClose();
        },
        onError: () => toast.error("Couldn't send your report.", "Check your connection and try again."),
      },
    );
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Report this feedback"
      footer={<Button title="Send report" disabled={!reason} loading={report.isPending} onPress={send} />}
    >
      <View style={tw`gap-4 pt-1`}>
        <AppText variant="body">What&apos;s wrong with this AI feedback?</AppText>
        <View style={tw`flex-row flex-wrap gap-2`}>
          {REASONS.map((option) => (
            <Chip
              key={option.value}
              label={option.label}
              role="radio"
              selected={reason === option.value}
              onPress={() => setReason(option.value)}
            />
          ))}
        </View>
        <TextField
          label="Details (optional)"
          placeholder="Tell us more"
          value={comment}
          onChangeText={setComment}
          maxLength={500}
          multiline
          style={tw`min-h-[80px]`}
          textAlignVertical="top"
        />
      </View>
    </Sheet>
  );
}
