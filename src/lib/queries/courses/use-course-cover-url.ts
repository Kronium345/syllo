import { useQuery } from "@tanstack/react-query";

import { getCourseCoverUrl } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Links last an hour; refetch a little earlier so a card never gets an expired one. */
const COVER_LINK_STALE_MS = 50 * 60 * 1000;

/** A signed link to a course's uploaded cover (prompts/24); only asked for when it has one. */
export function useCourseCoverUrl(courseId: string, coverKey: string | null) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.courses.cover(courseId, coverKey),
    queryFn: () => getCourseCoverUrl(supabase, courseId),
    enabled: !!coverKey,
    staleTime: COVER_LINK_STALE_MS,
    gcTime: COVER_LINK_STALE_MS,
  });
}
