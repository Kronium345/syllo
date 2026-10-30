import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type CourseListItem, deleteCourse } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/**
 * Deletes a course (throws NotAllowedError when the learner isn't its tutor). On success
 * the course leaves the cached list at once and every course query refetches.
 */
export function useDeleteCourse() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (course: CourseListItem) => {
      await deleteCourse(supabase, course.id);
      return course;
    },
    onSuccess: (course) => {
      queryClient.setQueryData<CourseListItem[]>(queryKeys.courses.list(), (current) =>
        current?.filter((item) => item.id !== course.id),
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
  });
}
