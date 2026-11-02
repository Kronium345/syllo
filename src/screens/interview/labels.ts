import type { VerdictTone } from "@/components/ui/ai-feedback-card";
import type { InterviewSession, InterviewTarget, InterviewVerdict } from "@/lib/queries/interviews";

// Interview practice copy (prompts/18).

export const TARGETS: { value: InterviewTarget; label: string }[] = [
  { value: "foundation", label: "Foundation training year" },
  { value: "community", label: "Community pharmacy" },
  { value: "hospital", label: "Hospital pharmacy" },
  { value: "placement", label: "Placement or summer job" },
];

export const CATEGORY_LABELS: Record<string, string> = {
  motivation: "Motivation",
  teamwork: "Teamwork",
  communication: "Communication",
  ethics: "Ethics and professionalism",
  patient_safety: "Patient safety",
  situational: "Situational judgement",
  explaining_medicines: "Explaining medicines",
  resilience: "Resilience and learning",
};

const KIND_LABELS = { behavioural: "Behavioural", situational: "Situational", motivation: "Motivation" } as const;

export const VERDICTS: Record<InterviewVerdict, { label: string; tone: VerdictTone }> = {
  strong: { label: "Strong", tone: "good" },
  good: { label: "Good", tone: "middling" },
  needs_work: { label: "Needs work", tone: "poor" },
  no_answer: { label: "No answer", tone: "none" },
};

/** The badge over a question: its bank category, or its kind for generated questions. */
export function questionLabel(question: { category: string | null; kind: keyof typeof KIND_LABELS }): string {
  return (question.category && CATEGORY_LABELS[question.category]) || KIND_LABELS[question.kind];
}

/** "Foundation training year" or the role the learner typed. */
export function interviewTitle(session: Pick<InterviewSession, "mode" | "target" | "role">): string {
  if (session.mode === "pharmacy") return TARGETS.find((t) => t.value === session.target)?.label ?? "Pharmacy careers";
  return session.role ?? "Interview";
}

/** Roles the learner can type: 2-60 characters, letters, numbers, spaces and & - / ' . , ( ). */
export const ROLE_PATTERN = /^[\p{L}\p{N} &\-/'.,()]{2,60}$/u;
