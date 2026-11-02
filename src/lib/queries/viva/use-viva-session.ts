import { useQuery } from "@tanstack/react-query";

import { getVivaSession } from "@/services/viva";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** A viva with its questions and saved feedback (null when it isn't the learner's). */
export function useVivaSession(sessionId: string | null | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.viva.session(sessionId ?? ""),
    queryFn: ({ signal }) => getVivaSession(supabase, sessionId ?? "", signal),
    enabled: !!sessionId,
  });
}
