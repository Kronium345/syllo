import { useQuery } from "@tanstack/react-query";

import { getEnrolledCourses } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** The courses the learner is enrolled in, newest first. */
export function useEnrolledCourses() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.enrollments.courses(),
    queryFn: ({ signal }) => getEnrolledCourses(supabase, signal),
  });
}
