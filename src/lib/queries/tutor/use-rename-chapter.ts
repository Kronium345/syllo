import { useMutation, useQueryClient } from "@tanstack/react-query";

import { renameChapter } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Renames a chapter. */
export function useRenameChapter() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chapterId, title }: { chapterId: string; title: string }) => renameChapter(supabase, chapterId, title),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
  });
}
