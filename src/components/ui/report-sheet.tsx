import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { tw } from "@/theme";

export type ReportReason = "inaccurate" | "offensive" | "other";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "inaccurate", label: "Inaccurate" },
  { value: "offensive", label: "Offensive" },
  { value: "other", label: "Other" },
];

/**
 * "Report this feedback" for AI-generated content (Google Play's AI-generated content policy;
 * viva prompts/17, interview prompts/18): a reason plus optional details. The caller saves it.
 */
export function ReportSheet({
  visible,
  sending,
  onClose,
  onSend,
}: {
  visible: boolean;
  sending: boolean;
  onClose: () => void;
  onSend: (reason: ReportReason, comment: string | null) => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState("");
  // Start empty every time the sheet opens (state adjusted during render).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setReason(null);
      setComment("");
    }
  }

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Report this feedback"
      footer={
        <Button
          title="Send report"
          disabled={!reason}
          loading={sending}
          onPress={() => reason && onSend(reason, comment.trim() || null)}
        />
      }
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
