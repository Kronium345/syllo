import { useUser } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";

import { getTutorCourse } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** One of the signed-in tutor's courses with its outline (null when missing or not theirs). */
export function useTutorCourse(courseId: string | null | undefined) {
  const supabase = useSupabase();
  const { user } = useUser();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: queryKeys.courses.tutor(courseId ?? "", userId),
    queryFn: ({ signal }) => getTutorCourse(supabase, userId ?? "", courseId ?? "", signal),
    enabled: !!courseId && !!userId,
  });
}
