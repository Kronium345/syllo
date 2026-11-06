import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deleteLessonResourceFile } from "@/services/lesson-uploads";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Deletes a lesson resource and its file (when it was a tutor upload). */
export function useDeleteLessonResource() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, resourceId }: { lessonId: string; resourceId: string }) =>
      deleteLessonResourceFile(supabase, lessonId, resourceId),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all }),
      ]),
  });
}
