import { useMutation, useQueryClient } from "@tanstack/react-query";

import { enroll } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Enrolls the learner in a course (free). Enrollment lists, the course and its lessons refetch. */
export function useEnroll() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => enroll(supabase, courseId),
    onSettled: (_data, _error, courseId) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.details(courseId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.students(courseId) }),
        // Enrolling unlocks lesson content.
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all }),
      ]),
  });
}
