import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type CourseDetailsInput, updateCourse } from "@/services/tutor";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Saves the course details (prompts/22). */
export function useUpdateCourse() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CourseDetailsInput) => updateCourse(supabase, input),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.courses.all }),
  });
}
