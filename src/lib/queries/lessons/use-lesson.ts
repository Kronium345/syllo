import { useQuery } from "@tanstack/react-query";

import { getLesson } from "@/services/lessons";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** One lesson and, when unlocked, its content (null when RLS hides the lesson). */
export function useLesson(lessonId: string | null | undefined) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.lessons.detail(lessonId ?? ""),
    queryFn: ({ signal }) => getLesson(supabase, lessonId ?? "", signal),
    enabled: !!lessonId,
  });
}
