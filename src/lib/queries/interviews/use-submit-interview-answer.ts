import { useMutation, useQueryClient } from "@tanstack/react-query";

import { type InterviewSession, type InterviewSubmission, submitInterviewAnswer } from "@/services/interviews";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Sends a spoken answer for grading and puts the feedback straight into the session cache. */
export function useSubmitInterviewAnswer() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (submission: InterviewSubmission) => submitInterviewAnswer(supabase, submission),
    onSuccess: (feedback, { sessionId, position }) => {
      queryClient.setQueryData<InterviewSession | null>(queryKeys.interviews.session(sessionId), (old) =>
        old
          ? {
              ...old,
              questions: old.questions.map((question) => (question.position === position ? { ...question, feedback } : question)),
            }
          : old,
      );
    },
  });
}
