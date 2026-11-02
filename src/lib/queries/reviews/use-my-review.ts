import { useAuth } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";

import { getMyReview } from "@/services/reviews";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** The learner's own rating of a course (null when they haven't rated it). */
export function useMyReview(courseId: string, { enabled = true }: { enabled?: boolean } = {}) {
  const supabase = useSupabase();
  const { userId } = useAuth();
  return useQuery({
    queryKey: queryKeys.reviews.mine(courseId, userId),
    queryFn: ({ signal }) => getMyReview(supabase, courseId, userId ?? "", signal),
    enabled: enabled && !!userId,
  });
}
