import { useMutation, useQueryClient } from "@tanstack/react-query";

import { createCourse, type NewCourseInput } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Creates a draft course (prompts/21) and refreshes every course query, the dashboard included. */
export function useCreateCourse() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: NewCourseInput) => createCourse(supabase, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
  });
}
