import { useMutation, useQueryClient } from "@tanstack/react-query";

import { answerQuestion, type Attempt } from "@/services/quizzes";

import { useSupabase } from "../../supabase";
import { queryKeys } from "../keys";

/** Grades one answer (null = skipped). The graded answer goes straight into the cached attempt. */
export function useAnswerQuestion() {
  const supabase = useSupabase();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { attemptId: string; questionId: string; answerId: string | null }) =>
      answerQuestion(supabase, vars),
    onSuccess: (result, vars) => {
      queryClient.setQueryData<Attempt | null>(queryKeys.quizzes.attempt(vars.attemptId), (attempt) => {
        if (!attempt) return attempt;
        const given = {
          ...attempt.given,
          [vars.questionId]: { answerId: result.answerId, isCorrect: result.isCorrect, correctAnswerId: result.correctAnswerId },
        };
        return {
          ...attempt,
          given,
          correct: attempt.correct + (result.answerId && result.isCorrect ? 1 : 0),
          wrong: attempt.wrong + (result.answerId && !result.isCorrect ? 1 : 0),
          questions: attempt.questions.map((question) =>
            question.id === vars.questionId ? { ...question, explanation: result.explanation ?? question.explanation } : question,
          ),
        };
      });
    },
  });
}
