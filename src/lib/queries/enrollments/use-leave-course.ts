import { useMutation, useQueryClient } from "@tanstack/react-query";

import { leaveCourse } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** The learner leaves a course (progress is kept). Enrollment lists, the course and its lessons refetch. */
export function useLeaveCourse() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => leaveCourse(supabase, courseId),
    onSettled: (_data, _error, courseId) =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.details(courseId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.students(courseId) }),
        // Leaving locks lesson content again.
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all }),
      ]),
  });
}
