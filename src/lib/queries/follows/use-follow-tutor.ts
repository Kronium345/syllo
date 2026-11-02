import { useMutation, useQueryClient } from "@tanstack/react-query";

import type { CourseDetails } from "@/services/courses";
import { followTutor, unfollowTutor } from "@/services/follows";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

type Variables = { courseId: string; tutorId: string; follow: boolean };

/** Follows or unfollows a course's tutor, flipping the button at once (rolled back on error). */
export function useFollowTutor() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tutorId, follow }: Variables) =>
      follow ? followTutor(supabase, tutorId) : unfollowTutor(supabase, tutorId),
    onMutate: async ({ courseId, follow }) => {
      const key = queryKeys.courses.details(courseId);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<CourseDetails | null>(key);
      queryClient.setQueryData<CourseDetails | null>(key, (old) =>
        old?.tutor ? { ...old, tutor: { ...old.tutor, isFollowed: follow } } : old,
      );
      return { previous };
    },
    onError: (_error, { courseId }, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(queryKeys.courses.details(courseId), context.previous);
    },
    // Other courses by the same tutor show the same button.
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
  });
}
