import { useAuth } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteMyReview, type MyReview, rateCourse } from "@/services/reviews";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

type Variables = { courseId: string; review: MyReview | null };

/**
 * Saves the learner's rating (`review`) or removes it (`review: null`). The learner's own
 * review updates at once; the course's average and count refetch (a trigger recomputes them).
 */
export function useRateCourse() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const { userId } = useAuth();
  return useMutation({
    mutationFn: ({ courseId, review }: Variables) =>
      review ? rateCourse(supabase, courseId, review.rating, review.comment) : deleteMyReview(supabase, courseId, userId ?? ""),
    onSuccess: (_data, { courseId, review }) => {
      queryClient.setQueryData(queryKeys.reviews.mine(courseId, userId), review);
    },
    onSettled: (_data, _error, { courseId }) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.reviews.mine(courseId, userId) }),
        // Averages show on Explore, Home and Course details.
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
      ]),
  });
}
