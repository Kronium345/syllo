import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type PickedFile, uploadCourseCover } from "@/services/lesson-uploads";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Uploads a course cover to R2 and sets it (the replaced upload is deleted). Progress 0–1. */
export function useUploadCourseCover() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { courseId: string; file: PickedFile; onProgress?: (fraction: number) => void }) =>
      uploadCourseCover(supabase, input),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
        queryClient.invalidateQueries({ queryKey: queryKeys.enrollments.all }),
      ]),
  });
}
