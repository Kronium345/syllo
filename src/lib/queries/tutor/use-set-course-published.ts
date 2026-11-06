import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setCoursePublished } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Publishes or unpublishes a course; unpublishing hides it from learners. */
export function useSetCoursePublished() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, published }: { courseId: string; published: boolean }) => setCoursePublished(supabase, courseId, published),
    onSettled: () => Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
      ]),
  });
}
