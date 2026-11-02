import { AiFeedbackCard, VerdictPill, type VerdictTone } from "@/components/ui/ai-feedback-card";
import type { VivaFeedback, VivaVerdict } from "@/lib/queries/viva";

const VERDICTS: Record<VivaVerdict, { label: string; tone: VerdictTone }> = {
  correct: { label: "Correct", tone: "good" },
  partly_correct: { label: "Partly correct", tone: "middling" },
  incorrect: { label: "Incorrect", tone: "poor" },
  no_answer: { label: "No answer", tone: "none" },
};

export function VerdictBadge({ verdict }: { verdict: VivaVerdict }) {
  return <VerdictPill {...VERDICTS[verdict]} />;
}

/** AI feedback for one viva answer (prompts/17): accuracy, reasoning and clarity. */
export function VivaFeedbackCard({
  feedback,
  referenceUrl,
  onReport,
}: {
  feedback: VivaFeedback;
  referenceUrl?: string | null;
  onReport?: () => void;
}) {
  return (
    <AiFeedbackCard
      verdict={VERDICTS[feedback.verdict]}
      score={feedback.score}
      ratings={[
        { label: "Accuracy", value: feedback.accuracy },
        { label: "Reasoning", value: feedback.reasoning },
        { label: "Clarity", value: feedback.clarity },
      ]}
      strengths={feedback.strengths}
      improvements={feedback.improvements}
      exampleTitle="A strong answer"
      example={feedback.modelAnswer}
      transcript={feedback.transcript}
      referenceUrl={referenceUrl}
      onReport={onReport}
    />
  );
}
