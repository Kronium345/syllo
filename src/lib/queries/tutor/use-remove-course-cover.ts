import { useMutation, useQueryClient } from "@tanstack/react-query";

import { removeCourseCoverFile } from "@/services/lesson-uploads";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Removes a course's uploaded cover and its file. */
export function useRemoveCourseCover() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (courseId: string) => removeCourseCoverFile(supabase, courseId),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
      ]),
  });
}
