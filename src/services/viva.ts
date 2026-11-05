import { FunctionsHttpError } from "@supabase/supabase-js";

import type { AppSupabaseClient } from "@/lib/supabase";

import { AiConsentRequiredError, AlreadyAnsweredError, NoAnswerError, NotAllowedError, VivaLimitError } from "./errors";

// Viva practice (prompts/17): after a quiz, the learner explains questions out loud and gets AI
// feedback. Sessions are created by RPCs; answers are graded and saved only by the viva-answer
// Edge Function (Gemini). Learners read their own sessions through RLS.

export type VivaReason = "wrong" | "skipped" | "flagged" | "review";
export type VivaVerdict = "correct" | "partly_correct" | "incorrect" | "no_answer";

export type VivaFeedback = {
  transcript: string;
  verdict: VivaVerdict;
  score: number;
  accuracy: number;
  reasoning: number;
  clarity: number;
  strengths: string[];
  improvements: string[];
  modelAnswer: string;
};

export type VivaQuestion = {
  questionId: string;
  position: number;
  reason: VivaReason;
  prompt: string;
  referenceUrl: string | null;
  feedback: VivaFeedback | null;
};

export type VivaSession = {
  id: string;
  attemptId: string;
  finished: boolean;
  quizTitle: string;
  courseId: string | null;
  /** The course's slug, e.g. "pharmacy-exam-prep" (the BNF footnote is pharmacy-only). */
  courseSlug: string | null;
  questions: VivaQuestion[];
};

type AnswerRow = {
  transcript: string;
  verdict: VivaVerdict;
  score: number;
  accuracy: number;
  reasoning: number;
  clarity: number;
  strengths: string[];
  improvements: string[];
  model_answer: string;
};

type SessionRow = {
  id: string;
  attempt_id: string;
  finished_at: string | null;
  quiz_attempts: {
    quizzes: { title: string; chapters: { course_id: string; courses: { slug: string } | null } | null } | null;
  } | null;
  viva_session_questions: {
    question_id: string;
    position: number;
    reason: VivaReason;
    quiz_questions: { prompt: string; reference_url: string | null } | null;
    // One-to-one on (session_id, question_id): PostgREST returns an object (or null); older
    // versions return a list, so both are handled.
    viva_answers: AnswerRow | AnswerRow[] | null;
  }[];
};

function toFeedback(row: AnswerRow): VivaFeedback {
  return {
    transcript: row.transcript,
    verdict: row.verdict,
    score: row.score,
    accuracy: row.accuracy,
    reasoning: row.reasoning,
    clarity: row.clarity,
    strengths: row.strengths,
    improvements: row.improvements,
    modelAnswer: row.model_answer,
  };
}

const errorCode = (error: unknown) => (error as { code?: string }).code;

/** Vivas the learner can still start (free: per 7 days, Pro: per 24 hours). */
export async function getVivaSessionsLeft(supabase: AppSupabaseClient, signal?: AbortSignal): Promise<number> {
  const query = supabase.rpc("viva_sessions_left");
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return data ?? 0;
}

/**
 * Starts (or reopens) a viva for a finished quiz attempt and returns its id. The database
 * picks the questions and enforces consent (P0003) and the limit (P0002).
 */
export async function startVivaSession(supabase: AppSupabaseClient, attemptId: string): Promise<string> {
  try {
    const { data } = await supabase.rpc("start_viva_session", { p_attempt_id: attemptId }).throwOnError();
    return (data as { id: string }).id;
  } catch (error) {
    if (errorCode(error) === "P0002") throw new VivaLimitError((error as Error).message);
    if (errorCode(error) === "P0003") throw new AiConsentRequiredError();
    throw error;
  }
}

/** A viva with its questions in order and any saved feedback (null when RLS hides it). */
export async function getVivaSession(supabase: AppSupabaseClient, sessionId: string, signal?: AbortSignal): Promise<VivaSession | null> {
  const query = supabase
    .from("viva_sessions")
    .select(
      "id, attempt_id, finished_at, quiz_attempts(quizzes(title, chapters(course_id, courses(slug)))), " +
        "viva_session_questions(question_id, position, reason, quiz_questions(prompt, reference_url), " +
        "viva_answers(transcript, verdict, score, accuracy, reasoning, clarity, strengths, improvements, model_answer))",
    )
    .eq("id", sessionId);
  const { data } = await (signal ? query.abortSignal(signal) : query).maybeSingle().throwOnError();
  if (!data) return null;
  const row = data as unknown as SessionRow;
  return {
    id: row.id,
    attemptId: row.attempt_id,
    finished: row.finished_at !== null,
    quizTitle: row.quiz_attempts?.quizzes?.title ?? "Quiz",
    courseId: row.quiz_attempts?.quizzes?.chapters?.course_id ?? null,
    courseSlug: row.quiz_attempts?.quizzes?.chapters?.courses?.slug ?? null,
    questions: [...row.viva_session_questions]
      .sort((a, b) => a.position - b.position)
      .map((question) => {
        const answer = Array.isArray(question.viva_answers) ? (question.viva_answers[0] ?? null) : question.viva_answers;
        return {
          questionId: question.question_id,
          position: question.position,
          reason: question.reason,
          prompt: question.quiz_questions?.prompt ?? "",
          referenceUrl: question.quiz_questions?.reference_url ?? null,
          feedback: answer ? toFeedback(answer) : null,
        };
      }),
  };
}

export type VivaSubmission = {
  sessionId: string;
  questionId: string;
  /** The recording, base64-encoded. */
  audio: string;
  mimeType: string;
  durationMs: number;
};

/**
 * Sends one spoken answer to the viva-answer Edge Function, which grades it with Gemini and
 * saves the feedback. 404 → NotAllowedError, 409 → AlreadyAnsweredError, 422 → NoAnswerError
 * (silence on the first try: record again).
 */
export async function submitVivaAnswer(supabase: AppSupabaseClient, submission: VivaSubmission): Promise<VivaFeedback> {
  const { data, error } = await supabase.functions.invoke<VivaFeedback>("viva-answer", { method: "POST", body: submission });
  if (error) {
    const status = error instanceof FunctionsHttpError ? (error.context as Response).status : 0;
    if (status === 404) throw new NotAllowedError("You can't answer this question.");
    if (status === 409) throw new AlreadyAnsweredError();
    if (status === 422) throw new NoAnswerError();
    throw error;
  }
  if (!data?.verdict) throw new Error("viva-answer returned no feedback");
  return data;
}

/** Marks the viva finished (harmless to repeat). */
export async function finishVivaSession(supabase: AppSupabaseClient, sessionId: string): Promise<void> {
  await supabase.rpc("finish_viva_session", { p_session_id: sessionId }).throwOnError();
}

/** Records the learner's consent (18+, voice to Google Gemini), or withdraws it. */
export async function setAiConsent(supabase: AppSupabaseClient, given: boolean): Promise<void> {
  await supabase.rpc(given ? "give_ai_consent" : "withdraw_ai_consent").throwOnError();
}

export type VivaReportReason = "inaccurate" | "offensive" | "other";

/** Flags one piece of AI feedback for review (Google Play's AI-generated content policy). */
export async function reportVivaFeedback(
  supabase: AppSupabaseClient,
  report: { sessionId: string; questionId: string; reason: VivaReportReason; comment: string | null },
): Promise<void> {
  await supabase
    .from("viva_feedback_reports")
    .insert({
      session_id: report.sessionId,
      question_id: report.questionId,
      reason: report.reason,
      comment: report.comment?.trim() || null,
    })
    .throwOnError();
}
