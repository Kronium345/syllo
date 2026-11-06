import { useMutation, useQueryClient } from "@tanstack/react-query";

import { moveLesson } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Moves a lesson up (-1) or down (1) within its chapter. */
export function useMoveLesson() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ lessonId, direction }: { lessonId: string; direction: -1 | 1 }) => moveLesson(supabase, lessonId, direction),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
  });
}
