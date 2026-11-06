import { useUser } from "@clerk/expo";
import { useQuery } from "@tanstack/react-query";

import { getTutorLesson } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** One of the signed-in tutor's lessons with its notes, video and resources (null when not theirs). */
export function useTutorLesson(lessonId: string | null | undefined) {
  const supabase = useSupabase();
  const { user } = useUser();
  const userId = user?.id ?? null;
  return useQuery({
    queryKey: queryKeys.courses.tutorLesson(lessonId ?? "", userId),
    queryFn: ({ signal }) => getTutorLesson(supabase, userId ?? "", lessonId ?? "", signal),
    enabled: !!lessonId && !!userId,
  });
}
