import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteChapter } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Deletes a chapter with its lessons and quizzes (learner progress on them goes too). */
export function useDeleteChapter() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (chapterId: string) => deleteChapter(supabase, chapterId),
    onSettled: () => Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
      ]),
  });
}
