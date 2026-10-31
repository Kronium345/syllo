import { useReverification, useUser } from "@clerk/expo";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { type ClerkFailure, reportClerkError } from "@/screens/auth/clerk-errors";
import { reportInvalid } from "@/screens/auth/report-invalid";
import { validateNewPassword, validatePassword } from "@/screens/auth/validate";
import { tw } from "@/theme";

type Field = "current" | "next" | "confirm";

/** Current + new password, the same rules as sign-up (validate.ts). */
export function ChangePasswordSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useUser();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [saving, setSaving] = useState(false);

  // Clerk may ask to confirm it's really the learner when the session is old. There's no
  // native prompt for that here, so cancel and ask them to sign in again.
  const updatePassword = useReverification(
    (params: { currentPassword: string; newPassword: string }) =>
      user?.updatePassword({ ...params, signOutOfOtherSessions: false }),
    {
      onNeedsReverification: ({ cancel }) => {
        cancel();
        toast.info("Please sign in again", "For your security, sign out and back in, then change your password.");
      },
    },
  );

  const close = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setErrors({});
    onClose();
  };

  const save = async () => {
    const found = {
      current: validatePassword(current),
      next: validateNewPassword(next),
      confirm: confirm === next ? undefined : "The new passwords don't match.",
    };
    setErrors(found);
    if (reportInvalid(found)) return;
    setSaving(true);
    try {
      const updated = await updatePassword({ currentPassword: current, newPassword: next });
      if (updated) {
        toast.success("Password changed.");
        close();
      }
    } catch (error) {
      reportClerkError(error as ClerkFailure);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Change password"
      footer={
        <View style={tw`flex-row gap-3`}>
          <Button title="Cancel" variant="outline" onPress={close} style={tw`flex-1`} />
          <Button title="Save" loading={saving} onPress={save} style={tw`flex-1`} />
        </View>
      }
    >
      <View style={tw`gap-4`}>
        <TextField
          label="Current password"
          value={current}
          onChangeText={setCurrent}
          error={errors.current}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
        />
        <TextField
          label="New password"
          value={next}
          onChangeText={setNext}
          error={errors.next}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />
        <TextField
          label="Confirm new password"
          value={confirm}
          onChangeText={setConfirm}
          error={errors.confirm}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
        />
      </View>
    </Sheet>
  );
}
