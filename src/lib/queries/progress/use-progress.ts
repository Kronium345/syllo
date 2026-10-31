import { useQuery } from "@tanstack/react-query";

import { getProgress } from "@/services/lessons";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Every lesson the learner has completed, newest first. */
export function useProgress() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.progress.mine(),
    queryFn: ({ signal }) => getProgress(supabase, signal),
  });
}
