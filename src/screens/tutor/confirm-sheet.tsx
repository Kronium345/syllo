import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

/** Asks before something learners would notice: deleting part of a course, or unpublishing it. */
export function ConfirmSheet({
  visible,
  title,
  message,
  confirmLabel,
  busy,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <View style={tw`gap-2`}>
          <Button title={confirmLabel} variant="danger" loading={busy} disabled={busy} onPress={onConfirm} />
          <Button title="Cancel" variant="link" disabled={busy} onPress={onClose} />
        </View>
      }
    >
      <AppText variant="body">{message}</AppText>
    </Sheet>
  );
}
