import { useMutation, useQueryClient } from "@tanstack/react-query";

import { addChapter } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Adds a chapter at the end of the outline; resolves to its id. */
export function useAddChapter() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, title }: { courseId: string; title: string }) => addChapter(supabase, courseId, title),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
  });
}
