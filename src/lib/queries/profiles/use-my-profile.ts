import { useAuth } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";

import { getMyProfile } from "@/services/profiles";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** The signed-in learner's onboarding answers (goal, interests), or null before their row exists. */
export function useMyProfile() {
  const supabase = useSupabase();
  const { userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.profiles.me(userId),
    queryFn: ({ signal }) => getMyProfile(supabase, userId ?? "", signal),
    enabled: !!userId,
  });
}
