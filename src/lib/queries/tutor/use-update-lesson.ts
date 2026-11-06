import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type LessonDetailsInput, updateLesson } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Saves a lesson's title, notes and preview flag (prompts/23). Lesson screens refetch too. */
export function useUpdateLesson() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LessonDetailsInput) => updateLesson(supabase, input),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all }),
      ]),
  });
}
