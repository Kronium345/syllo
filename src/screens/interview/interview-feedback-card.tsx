import { AiFeedbackCard } from "@/components/ui/ai-feedback-card";
import type { InterviewFeedback } from "@/lib/queries/interviews";

import { VERDICTS } from "./labels";

/** AI feedback for one interview answer (prompts/18): structure, relevance and clarity. */
export function InterviewFeedbackCard({ feedback, onReport }: { feedback: InterviewFeedback; onReport?: () => void }) {
  return (
    <AiFeedbackCard
      verdict={VERDICTS[feedback.verdict]}
      score={feedback.score}
      ratings={[
        { label: "Structure", value: feedback.structure },
        { label: "Relevance", value: feedback.relevance },
        { label: "Clarity", value: feedback.clarity },
      ]}
      strengths={feedback.strengths}
      improvements={feedback.improvements}
      exampleTitle="An example strong answer"
      example={feedback.modelAnswer}
      transcript={feedback.transcript}
      onReport={onReport}
    />
  );
}
