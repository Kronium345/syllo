import { useReverification, useUser } from "@clerk/expo";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { colors } from "@/components/ui/placeholder-colors";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { type ClerkFailure, reportClerkError } from "@/screens/auth/clerk-errors";

const CONFIRM_WORD = "DELETE";

/**
 * Deletes the Clerk user from the app (`user.delete()`; the instance allows self-deletion).
 * Syllo keeps no learner data of its own yet. When Supabase does, this moves to an API
 * route that deletes that data first.
 */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useUser();
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  // An old session may need re-verification; there's no native prompt, so ask to sign in
  // again. delete() returns nothing, so the call reports whether it actually ran.
  const deleteUser = useReverification(
    async () => {
      await user?.delete();
      return true;
    },
    {
      onNeedsReverification: ({ cancel }) => {
        cancel();
        toast.info("Please sign in again", "For your security, sign out and back in, then delete your account.");
      },
    },
  );

  const close = () => {
    setTyped("");
    onClose();
  };

  const remove = async () => {
    setDeleting(true);
    try {
      const deleted = await deleteUser();
      if (!deleted) {
        setDeleting(false);
        return;
      }
      // The session ends with the user: the guard closes (app) and the index route
      // sends the learner to /sign-in.
      toast.success("Account deleted.", "Thanks for learning with Syllo.");
    } catch (error) {
      reportClerkError(error as ClerkFailure);
      setDeleting(false);
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title="Delete account"
      footer={
        <View style={styles.actions}>
          <Button title="Keep account" variant="secondary" onPress={close} style={styles.action} />
          <Button
            title="Delete"
            variant="danger"
            loading={deleting}
            disabled={typed.trim() !== CONFIRM_WORD}
            onPress={remove}
            style={styles.action}
          />
        </View>
      }
    >
      <View style={styles.body}>
        <Text style={styles.text}>
          This permanently deletes your Syllo account and profile. It can&apos;t be undone.
        </Text>
        <TextField
          label={`Type ${CONFIRM_WORD} to confirm`}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder={CONFIRM_WORD}
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 16 },
  text: { fontSize: 15, lineHeight: 22, color: colors.ink },
  actions: { flexDirection: "row", gap: 12 },
  action: { flex: 1 },
});
