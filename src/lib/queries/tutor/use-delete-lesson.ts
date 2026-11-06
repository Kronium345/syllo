import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteLesson } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Deletes a lesson (learner progress on it goes too). */
export function useDeleteLesson() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => deleteLesson(supabase, lessonId),
    onSettled: () => Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
      ]),
  });
}
