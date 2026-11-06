import { useMutation, useQueryClient } from "@tanstack/react-query";

import { removeLessonVideoFile } from "@/services/lesson-uploads";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Removes a lesson's video (and its file when it was a tutor upload). */
export function useRemoveLessonVideo() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (lessonId: string) => removeLessonVideoFile(supabase, lessonId),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all }),
      ]),
  });
}
