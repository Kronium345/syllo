import { useReverification, useUser } from "@clerk/expo";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { colors } from "@/components/ui/placeholder-colors";
import { Sheet } from "@/components/ui/sheet";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { profileImageUrl } from "@/lib/display-name";
import { useSupabase } from "@/lib/supabase";
import { type ClerkFailure, reportClerkError } from "@/screens/auth/clerk-errors";

const CONFIRM_WORD = "DELETE";

/**
 * Deletes the learner's Supabase profile (their enrollments cascade with it), then the
 * Clerk user (`user.delete()`; the instance allows self-deletion). The profile goes first
 * because the Supabase request needs the Clerk session, which ends with the user. If the
 * Clerk step doesn't happen, the profile is restored.
 */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useUser();
  const supabase = useSupabase();
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

  // Puts the profile back when the Clerk user wasn't deleted (enrollments can't be restored).
  const restoreProfile = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .upsert({ id: user.id, full_name: user.fullName?.trim() || null, avatar_url: profileImageUrl(user) ?? null });
  };

  const remove = async () => {
    if (!user) return;
    setDeleting(true);
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", user.id);
    if (profileError) {
      toast.error("Couldn't delete your account.", "Check your connection and try again.");
      setDeleting(false);
      return;
    }
    try {
      const deleted = await deleteUser();
      if (!deleted) {
        await restoreProfile();
        setDeleting(false);
        return;
      }
      // The session ends with the user: the guard closes (app) and the index route
      // sends the learner to /sign-in.
      toast.success("Account deleted.", "Thanks for learning with Syllo.");
    } catch (error) {
      await restoreProfile();
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
          This permanently deletes your Syllo account, your profile and your enrolled courses. It can&apos;t be
          undone.
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
