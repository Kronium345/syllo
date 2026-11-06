import { useMutation, useQueryClient } from "@tanstack/react-query";

import { moveChapter } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Moves a chapter up (-1) or down (1). */
export function useMoveChapter() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chapterId, direction }: { chapterId: string; direction: -1 | 1 }) => moveChapter(supabase, chapterId, direction),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
  });
}
