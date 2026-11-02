import { useMutation, useQueryClient } from "@tanstack/react-query";

import { finishVivaSession } from "@/services/viva";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Finishes a viva; the session and the sessions-left count refetch. */
export function useFinishViva() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => finishVivaSession(supabase, sessionId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.viva.all }),
  });
}
