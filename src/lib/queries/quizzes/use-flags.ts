import { useQuery } from "@tanstack/react-query";

import { getFlags } from "@/services/quizzes";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** The question ids the learner has flagged, as a Set. */
export function useFlags() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.quizzes.flags(),
    queryFn: ({ signal }) => getFlags(supabase, signal),
    select: (ids) => new Set(ids),
  });
}
