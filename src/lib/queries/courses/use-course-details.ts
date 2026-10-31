import { useQuery } from "@tanstack/react-query";

import { getCourseDetails } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** A course with its tutor, ordered outline and the learner's enrollment (null when hidden). */
export function useCourseDetails(courseId: string | null | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.courses.details(courseId ?? ""),
    queryFn: ({ signal }) => getCourseDetails(supabase, courseId ?? "", signal),
    enabled: !!courseId,
  });
}
