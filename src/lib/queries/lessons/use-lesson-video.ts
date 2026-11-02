import { useQuery } from "@tanstack/react-query";

import { getLessonVideoUrl } from "@/services/lessons";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Signed links last an hour; refresh a little before that. */
const LINK_FRESH_MS = 50 * 60 * 1000;

/**
 * A playable link for a lesson whose video is in R2 (prompts/15). Only enable it when the
 * lesson's content has a `videoKey`; outside `videoUrl`s play as they are.
 */
export function useLessonVideo(lessonId: string, { enabled }: { enabled: boolean }) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.lessons.video(lessonId),
    queryFn: () => getLessonVideoUrl(supabase, lessonId),
    enabled,
    // A new link would restart the player, so only refresh once this one is close to expiring.
    staleTime: LINK_FRESH_MS,
    gcTime: LINK_FRESH_MS,
  });
}
