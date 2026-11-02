import { useQuery } from "@tanstack/react-query";

import { getVivaSessionsLeft } from "@/services/viva";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** How many vivas the learner can still start (free: this week, Pro: today). */
export function useVivaSessionsLeft({ enabled = true }: { enabled?: boolean } = {}) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.viva.sessionsLeft(),
    queryFn: ({ signal }) => getVivaSessionsLeft(supabase, signal),
    enabled,
  });
}
