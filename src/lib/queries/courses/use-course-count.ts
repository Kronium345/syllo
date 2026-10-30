import { useQuery } from "@tanstack/react-query";

import { countCourses } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** How many published courses there are. */
export function useCourseCount() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.courses.count(),
    queryFn: ({ signal }) => countCourses(supabase, signal),
  });
}
