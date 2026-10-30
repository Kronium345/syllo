import { useUser } from "@clerk/expo";
import { useEffect } from "react";

import { profileImageUrl } from "./display-name";
import { useUpsertProfile } from "./queries/profiles";

/**
 * Keeps the learner's `profiles` row in Supabase in step with Clerk: upserted after
 * sign-in and whenever their name or photo changes. RLS only lets a learner write their
 * own row. A failure is logged and retried on the next change; the app works without it.
 */
export function useSyncProfile() {
  const { user } = useUser();
  const { mutate: upsertProfile } = useUpsertProfile();
  const id = user?.id;
  const fullName = user?.fullName?.trim() || null;
  const avatarUrl = profileImageUrl(user) ?? null;

  useEffect(() => {
    if (!id) return;
    upsertProfile(
      { id, full_name: fullName, avatar_url: avatarUrl },
      { onError: (error) => console.warn("Couldn't sync the Supabase profile:", error.message) },
    );
  }, [upsertProfile, id, fullName, avatarUrl]);
}
