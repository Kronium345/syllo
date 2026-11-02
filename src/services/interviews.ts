import { FunctionsHttpError } from "@supabase/supabase-js";

import type { AppSupabaseClient } from "@/lib/supabase";

import {
  AiConsentRequiredError,
  AlreadyAnsweredError,
  InterviewLimitError,
  NoAnswerError,
  NotAllowedError,
  RoleNotAcceptedError,
} from "./errors";

// Interview practice (prompts/18): 5 spoken interview questions with AI feedback and an overall
// summary. Pharmacy-career sessions start with an RPC (a written bank); "Any role" sessions start
// with the interview-start Edge Function (Gemini writes the questions). Answers and summaries are
// written only by Edge Functions; learners read their own sessions through RLS.

export type InterviewMode = "pharmacy" | "general";
export type InterviewTarget = "foundation" | "community" | "hospital" | "placement";
export type InterviewVerdict = "strong" | "good" | "needs_work" | "no_answer";
export type InterviewKind = "behavioural" | "situational" | "motivation";

export type InterviewFeedback = {
  transcript: string;
  verdict: InterviewVerdict;
  score: number;
  structure: number;
  relevance: number;
  clarity: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
};

export type InterviewQuestion = {
  position: number;
  prompt: string;
  kind: InterviewKind;
  /** The bank category (pharmacy careers), or null for generated questions. */
  category: string | null;
  feedback: InterviewFeedback | null;
};

export type InterviewSummary = {
  /** 0-10, or null when nothing was answered. */
  readiness: number | null;
  summary: string | null;
  topStrengths: string[];
  nextSteps: string[];
};

export type InterviewSession = {
  id: string;
  mode: InterviewMode;
  target: InterviewTarget | null;
  role: string | null;
  finished: boolean;
  questions: InterviewQuestion[];
  summary: InterviewSummary | null;
};

type AnswerRow = {
  transcript: string;
  verdict: InterviewVerdict;
  score: number;
  structure: number;
  relevance: number;
  clarity: number;
  strengths: string[];
  improvements: string[];
  model_answer: string;
};

type SessionRow = {
  id: string;
  mode: InterviewMode;
  target: InterviewTarget | null;
  role: string | null;
  finished_at: string | null;
  readiness: number | null;
  summary: string | null;
  top_strengths: string[];
  next_steps: string[];
  interview_session_questions: {
    position: number;
    prompt: string;
    kind: InterviewKind;
    category: string | null;
    // One-to-one on (session_id, position): an object (or null); older PostgREST returns a list.
    interview_answers: AnswerRow | AnswerRow[] | null;
  }[];
};

const errorCode = (error: unknown) => (error as { code?: string }).code;
const httpStatus = (error: unknown) => (error instanceof FunctionsHttpError ? (error.context as Response).status : 0);

/** Interviews the learner can still start (free: per 7 days, Pro: per 24 hours). */
export async function getInterviewSessionsLeft(supabase: AppSupabaseClient, signal?: AbortSignal): Promise<number> {
  const query = supabase.rpc("interview_sessions_left");
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return data ?? 0;
}

/** Starts (or reopens) a pharmacy-career interview for a target and returns its id. */
export async function startPharmacyInterview(supabase: AppSupabaseClient, target: InterviewTarget): Promise<string> {
  try {
    const { data } = await supabase.rpc("start_interview_session", { p_target: target }).throwOnError();
    return (data as { id: string }).id;
  } catch (error) {
    if (errorCode(error) === "P0002") throw new InterviewLimitError((error as Error).message);
    if (errorCode(error) === "P0003") throw new AiConsentRequiredError();
    throw error;
  }
}

/** Starts (or reopens) an "Any role" interview; Gemini writes the questions (a few seconds). */
export async function startGeneralInterview(supabase: AppSupabaseClient, role: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke<{ sessionId: string }>("interview-start", {
    method: "POST",
    body: { role },
  });
  if (error) {
    const status = httpStatus(error);
    if (status === 403) throw new AiConsentRequiredError();
    if (status === 429) throw new InterviewLimitError();
    if (status === 400 || status === 422) throw new RoleNotAcceptedError();
    throw error;
  }
  if (!data?.sessionId) throw new Error("interview-start returned no session");
  return data.sessionId;
}

function toFeedback(row: AnswerRow): InterviewFeedback {
  return {
    transcript: row.transcript,
    verdict: row.verdict,
    score: row.score,
    structure: row.structure,
    relevance: row.relevance,
    clarity: row.clarity,
    strengths: row.strengths,
    improvements: row.improvements,
    modelAnswer: row.model_answer,
  };
}

/** An interview with its questions in order, any saved feedback and the summary (null when RLS hides it). */
export async function getInterviewSession(
  supabase: AppSupabaseClient,
  sessionId: string,
  signal?: AbortSignal,
): Promise<InterviewSession | null> {
  const query = supabase
    .from("interview_sessions")
    .select(
      "id, mode, target, role, finished_at, readiness, summary, top_strengths, next_steps, " +
        "interview_session_questions(position, prompt, kind, category, " +
        "interview_answers(transcript, verdict, score, structure, relevance, clarity, strengths, improvements, model_answer))",
    )
    .eq("id", sessionId);
  const { data } = await (signal ? query.abortSignal(signal) : query).maybeSingle().throwOnError();
  if (!data) return null;
  const row = data as unknown as SessionRow;
  const finished = row.finished_at !== null;
  return {
    id: row.id,
    mode: row.mode,
    target: row.target,
    role: row.role,
    finished,
    questions: [...row.interview_session_questions]
      .sort((a, b) => a.position - b.position)
      .map((question) => {
        const answer = Array.isArray(question.interview_answers)
          ? (question.interview_answers[0] ?? null)
          : question.interview_answers;
        return {
          position: question.position,
          prompt: question.prompt,
          kind: question.kind,
          category: question.category,
          feedback: answer ? toFeedback(answer) : null,
        };
      }),
    summary: finished
      ? { readiness: row.readiness, summary: row.summary, topStrengths: row.top_strengths, nextSteps: row.next_steps }
      : null,
  };
}

export type InterviewSubmission = {
  sessionId: string;
  position: number;
  /** The recording, base64-encoded. */
  audio: string;
  mimeType: string;
  durationMs: number;
};

/**
 * Sends one spoken answer to interview-answer, which grades it and saves the feedback.
 * 404 → NotAllowedError, 409 → AlreadyAnsweredError, 422 → NoAnswerError (record again).
 */
export async function submitInterviewAnswer(
  supabase: AppSupabaseClient,
  submission: InterviewSubmission,
): Promise<InterviewFeedback> {
  const { data, error } = await supabase.functions.invoke<InterviewFeedback>("interview-answer", {
    method: "POST",
    body: submission,
  });
  if (error) {
    const status = httpStatus(error);
    if (status === 404) throw new NotAllowedError("You can't answer this question.");
    if (status === 409) throw new AlreadyAnsweredError();
    if (status === 422) throw new NoAnswerError();
    throw error;
  }
  if (!data?.verdict) throw new Error("interview-answer returned no feedback");
  return data;
}

/** Finishes the interview and returns its overall summary (harmless to repeat). */
export async function finishInterview(supabase: AppSupabaseClient, sessionId: string): Promise<InterviewSummary> {
  const { data, error } = await supabase.functions.invoke<InterviewSummary>("interview-finish", {
    method: "POST",
    body: { sessionId },
  });
  if (error) {
    if (httpStatus(error) === 404) throw new NotAllowedError("You can't finish this interview.");
    throw error;
  }
  if (!data) throw new Error("interview-finish returned nothing");
  return data;
}

export type InterviewReportReason = "inaccurate" | "offensive" | "other";

/** Flags AI feedback on one answer (`position`) or on the overall summary (`position` null). */
export async function reportInterviewFeedback(
  supabase: AppSupabaseClient,
  report: { sessionId: string; position: number | null; reason: InterviewReportReason; comment: string | null },
): Promise<void> {
  await supabase
    .from("interview_feedback_reports")
    .insert({
      session_id: report.sessionId,
      position: report.position,
      reason: report.reason,
      comment: report.comment?.trim() || null,
    })
    .throwOnError();
}
