import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addLesson } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Adds a lesson at the end of a chapter; resolves to its id. */
export function useAddLesson() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chapterId, title }: { chapterId: string; title: string }) => addLesson(supabase, chapterId, title),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
  });
}
