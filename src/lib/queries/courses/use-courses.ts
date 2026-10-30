import { useQuery } from "@tanstack/react-query";

import { getCourses } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Published courses, by title. */
export function useCourses() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.courses.list(),
    queryFn: ({ signal }) => getCourses(supabase, signal),
  });
}
