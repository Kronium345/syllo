// Viva practice hooks (prompts/17). Import from "@/lib/queries/viva".
export type {
  VivaFeedback,
  VivaQuestion,
  VivaReason,
  VivaReportReason,
  VivaSession,
  VivaSubmission,
  VivaVerdict,
} from "@/services/viva";
export { useAiConsent } from "./use-ai-consent";
export { useFinishViva } from "./use-finish-viva";
export { useReportVivaFeedback } from "./use-report-viva-feedback";
export { useStartViva } from "./use-start-viva";
export { useSubmitVivaAnswer } from "./use-submit-viva-answer";
export { useVivaSession } from "./use-viva-session";
export { useVivaSessionsLeft } from "./use-viva-sessions-left";
