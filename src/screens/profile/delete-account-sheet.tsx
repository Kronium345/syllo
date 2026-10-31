import { useReverification, useUser } from "@clerk/expo";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { profileImageUrl } from "@/lib/display-name";
import { useDeleteMyProfile, useUpsertProfile } from "@/lib/queries/profiles";
import { type ClerkFailure, reportClerkError } from "@/screens/auth/clerk-errors";
import { tw } from "@/theme";

const CONFIRM_WORD = "DELETE";

/**
 * Deletes the learner's Supabase profile (their enrollments cascade with it), then the
 * Clerk user (`user.delete()`; the instance allows self-deletion). The profile goes first
 * because the Supabase request needs the Clerk session, which ends with the user. If the
 * Clerk step doesn't happen, the profile is restored.
 */
export function DeleteAccountSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { user } = useUser();
  const deleteProfile = useDeleteMyProfile();
  const upsertProfile = useUpsertProfile();
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
    await upsertProfile
      .mutateAsync({ id: user.id, full_name: user.fullName?.trim() || null, avatar_url: profileImageUrl(user) ?? null })
      .catch((error: Error) => console.warn("Couldn't restore the Supabase profile:", error.message));
  };

  const remove = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await deleteProfile.mutateAsync(user.id);
    } catch {
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
        <View style={tw`flex-row gap-3`}>
          <Button title="Keep account" variant="outline" onPress={close} style={tw`flex-1`} />
          <Button
            title="Delete"
            variant="danger"
            loading={deleting}
            disabled={typed.trim() !== CONFIRM_WORD}
            onPress={remove}
            style={tw`flex-1`}
          />
        </View>
      }
    >
      <View style={tw`gap-4`}>
        <AppText variant="body" style={tw`text-ink`}>
          This permanently deletes your Syllo account, your profile and your enrolled courses. It can&apos;t be
          undone.
        </AppText>
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
