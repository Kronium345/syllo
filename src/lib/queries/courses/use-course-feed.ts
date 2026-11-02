import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type CourseFeedFilter, getCourseFeed } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/**
 * Published courses for the cards, searched, filtered and sorted (prompts/13).
 * `enabled: false` pauses it (the filter sheet's live count while the sheet is closed).
 */
export function useCourseFeed(filter: CourseFeedFilter = {}, { enabled = true }: { enabled?: boolean } = {}) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.courses.feed(filter),
    queryFn: ({ signal }) => getCourseFeed(supabase, filter, signal),
    // Keep the last results on screen while a new search loads.
    placeholderData: keepPreviousData,
    enabled,
  });
}
