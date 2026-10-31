import { useQuery } from "@tanstack/react-query";

import { getCategories } from "@/services/courses";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** The distinct categories of published courses (Explore's chips). */
export function useCategories() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.courses.categories(),
    queryFn: ({ signal }) => getCategories(supabase, signal),
  });
}
