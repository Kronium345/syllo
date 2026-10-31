import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { type CourseFeedFilter, getCourseFeed } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Published courses for the cards, filtered by title search and category. */
export function useCourseFeed(filter: CourseFeedFilter = {}) {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.courses.feed(filter),
    queryFn: ({ signal }) => getCourseFeed(supabase, filter, signal),
    // Keep the last results on screen while a new search loads.
    placeholderData: keepPreviousData,
  });
}
