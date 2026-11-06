import { useUser } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";

import { getMyCourses } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** The signed-in tutor's courses (published and drafts), for the tutor dashboard. */
export function useMyCourses() {
  const supabase = useSupabase();
  const { user } = useUser();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: queryKeys.courses.mine(userId),
    queryFn: ({ signal }) => getMyCourses(supabase, userId ?? "", signal),
    enabled: !!userId,
  });
}
