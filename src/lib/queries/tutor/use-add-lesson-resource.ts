import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type PickedFile, uploadLessonResource } from "@/services/lesson-uploads";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Uploads a resource file to R2 and lists it on the lesson. Progress 0–1. */
export function useAddLessonResource() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { lessonId: string; title: string; file: PickedFile; onProgress?: (fraction: number) => void }) =>
      uploadLessonResource(supabase, input),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all }),
      ]),
  });
}
