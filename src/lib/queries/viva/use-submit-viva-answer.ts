import { useMutation, useQueryClient } from "@tanstack/react-query";

import { submitVivaAnswer, type VivaSession, type VivaSubmission } from "@/services/viva";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Sends a spoken answer for grading and puts the feedback straight into the session cache. */
export function useSubmitVivaAnswer() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submission: VivaSubmission) => submitVivaAnswer(supabase, submission),
    onSuccess: (feedback, { sessionId, questionId }) => {
      queryClient.setQueryData<VivaSession | null>(queryKeys.viva.session(sessionId), (old) =>
        old
          ? {
              ...old,
              questions: old.questions.map((question) =>
                question.questionId === questionId ? { ...question, feedback } : question,
              ),
            }
          : old,
      );
    },
  });
}
