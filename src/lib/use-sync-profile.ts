import { useUser } from "@clerk/expo";
import { useCallback, useEffect } from "react";

import { profileImageUrl } from "./display-name";
import { useSupabase } from "./supabase";

/**
 * Keeps the learner's `profiles` row in Supabase in step with Clerk: upserted after
 * sign-in and whenever their name or photo changes. RLS only lets a learner write their
 * own row. A failure is logged and retried on the next change; the app works without it.
 * Returns `sync`, for flows that need the row back right away (a cancelled account delete).
 */
export function useSyncProfile() {
  const { user } = useUser();
  const supabase = useSupabase();
  const id = user?.id;
  const fullName = user?.fullName?.trim() || null;
  const avatarUrl = profileImageUrl(user) ?? null;

  const sync = useCallback(async () => {
    if (!id) return;
    const { error } = await supabase.from("profiles").upsert({ id, full_name: fullName, avatar_url: avatarUrl });
    if (error) console.warn("Couldn't sync the Supabase profile:", error.message);
  }, [supabase, id, fullName, avatarUrl]);

  useEffect(() => {
    sync();
  }, [sync]);

  return sync;
}
