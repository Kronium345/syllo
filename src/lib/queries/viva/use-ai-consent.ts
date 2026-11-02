import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setAiConsent } from "@/services/viva";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Gives (true) or withdraws (false) consent to AI feedback; the profile refetches. */
export function useAiConsent() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (given: boolean) => setAiConsent(supabase, given),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all }),
  });
}
