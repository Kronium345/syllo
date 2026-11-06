import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type PickedFile, uploadLessonVideo } from "@/services/lesson-uploads";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Uploads a lesson video to R2 and sets it (the replaced upload is deleted). Progress 0–1. */
export function useUploadLessonVideo() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      lessonId: string;
      file: PickedFile;
      durationSeconds: number;
      onProgress?: (fraction: number) => void;
    }) => uploadLessonVideo(supabase, input),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all }),
      ]),
  });
}
