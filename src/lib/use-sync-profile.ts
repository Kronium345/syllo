import { useUser } from "@clerk/expo";
import { useEffect } from "react";

import { profileImageUrl } from "./display-name";
import { useUpdateProfile } from "./queries/profiles";

/**
 * Keeps the learner's `profiles` row in Supabase in step with Clerk: updated after sign-in
 * and whenever their name or photo changes. It never creates the row: the row means
 * "onboarded" and only finishing onboarding inserts it (prompts/11). RLS only lets a
 * learner write their own row. A failure is logged and retried on the next change.
 */
export function useSyncProfile() {
  const { user } = useUser();
  const { mutate: updateProfile } = useUpdateProfile();
  const id = user?.id;
  const fullName = user?.fullName?.trim() || null;
  const avatarUrl = profileImageUrl(user) ?? null;

  useEffect(() => {
    if (!id) return;
    updateProfile(
      { id, full_name: fullName, avatar_url: avatarUrl },
      { onError: (error) => console.warn("Couldn't sync the Supabase profile:", error.message) },
    );
  }, [updateProfile, id, fullName, avatarUrl]);
}
