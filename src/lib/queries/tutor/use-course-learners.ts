import { useQuery } from "@tanstack/react-query";

import { getCourseLearners } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** The learners enrolled in one of the tutor's courses (prompts/26). */
export function useCourseLearners(courseId: string | null | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.courses.learners(courseId ?? ""),
    queryFn: ({ signal }) => getCourseLearners(supabase, courseId ?? "", signal),
    enabled: !!courseId,
  });
}
