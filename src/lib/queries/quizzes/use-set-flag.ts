import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setFlag } from "@/services/quizzes";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Flags or unflags a question; the cached flags update at once and roll back on failure. */
export function useSetFlag() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  const key = queryKeys.quizzes.flags();
  return useMutation({
    mutationFn: (vars: { questionId: string; flagged: boolean }) => setFlag(supabase, vars.questionId, vars.flagged),
    onMutate: async ({ questionId, flagged }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<string[]>(key);
      queryClient.setQueryData<string[]>(key, (ids = []) =>
        flagged ? [...ids.filter((id) => id !== questionId), questionId] : ids.filter((id) => id !== questionId),
      );
      return { previous };
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(key, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
}
