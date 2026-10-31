import { useQuery } from "@tanstack/react-query";

import { getStudentCount } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** How many learners are enrolled in a course. */
export function useStudentCount(courseId: string | null | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.courses.students(courseId ?? ""),
    queryFn: ({ signal }) => getStudentCount(supabase, courseId ?? "", signal),
    enabled: !!courseId,
  });
}
