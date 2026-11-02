import { useMutation, useQueryClient } from "@tanstack/react-query";

import { startVivaSession } from "@/services/viva";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Starts (or reopens) a viva for a finished attempt; resolves to the session id. */
export function useStartViva() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (attemptId: string) => startVivaSession(supabase, attemptId),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.viva.sessionsLeft() }),
  });
}
