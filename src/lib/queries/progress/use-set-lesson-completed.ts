import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type ProgressRow, setLessonCompleted } from "@/services/lessons";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Marks a lesson completed or not. The cached progress updates at once and rolls back on failure. */
export function useSetLessonCompleted() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const key = queryKeys.progress.mine();
  return useMutation({
    mutationFn: (vars: { lessonId: string; completed: boolean }) =>
      setLessonCompleted(supabase, vars.lessonId, vars.completed),
    onMutate: async ({ lessonId, completed }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ProgressRow[]>(key);
      queryClient.setQueryData<ProgressRow[]>(key, (rows = []) =>
        completed
          ? [{ lessonId, completedAt: new Date().toISOString() }, ...rows.filter((row) => row.lessonId !== lessonId)]
          : rows.filter((row) => row.lessonId !== lessonId),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.progress.all }),
  });
}
