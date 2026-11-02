import { useMutation } from "@tanstack/react-query";

import { getLessonResourceUrl } from "@/services/lessons";

import { useSupabase } from "../../supabase";

/** Fetches a 1-hour download link for a lesson resource when the learner taps it (prompts/16). */
export function useLessonResourceUrl() {
  const supabase = useSupabase();
  return useMutation({
    mutationFn: (resourceId: string) => getLessonResourceUrl(supabase, resourceId),
  });
}
