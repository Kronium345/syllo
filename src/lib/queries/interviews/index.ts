// Interview practice hooks (prompts/18). Import from "@/lib/queries/interviews".
export type {
  InterviewFeedback,
  InterviewKind,
  InterviewMode,
  InterviewQuestion,
  InterviewReportReason,
  InterviewSession,
  InterviewSubmission,
  InterviewSummary,
  InterviewTarget,
  InterviewVerdict,
} from "@/services/interviews";
export { useFinishInterview } from "./use-finish-interview";
export { useInterviewSession } from "./use-interview-session";
export { useInterviewSessionsLeft } from "./use-interview-sessions-left";
export { useReportInterviewFeedback } from "./use-report-interview-feedback";
export { type InterviewStart, useStartInterview } from "./use-start-interview";
export { useSubmitInterviewAnswer } from "./use-submit-interview-answer";
