import { useQuery } from "@tanstack/react-query";

import { getLatestEnrollment } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** The course the learner enrolled in most recently, or null. */
export function useLatestEnrollment() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.enrollments.latest(),
    queryFn: ({ signal }) => getLatestEnrollment(supabase, signal),
  });
}
