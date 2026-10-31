import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type CourseListItem, deleteCourse } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/**
 * Deletes a course (throws NotAllowedError when the learner isn't its tutor). Every course
 * and enrollment query refetches afterwards. Kept for tutor tools (Part 2); no screen uses it yet.
 */
export function useDeleteCourse() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (course: CourseListItem) => {
      await deleteCourse(supabase, course.id);
      return course;
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
      ]),
  });
}
