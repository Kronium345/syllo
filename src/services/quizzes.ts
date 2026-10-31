import type { AppSupabaseClient } from "@/lib/supabase";

import { QuizLimitError } from "./errors";

// Quizzes in Supabase: plain async functions, no React. Hooks in src/lib/queries/quizzes/
// wrap them. Grading happens only in the database (start/answer/finish RPCs); learners
// never read quiz_answers.is_correct, so answers are selected by explicit columns.

export type QuizStart = {
  id: string;
  title: string;
  courseId: string;
  /** Not enrolled and not a preview: questions are hidden by RLS. */
  locked: boolean;
  questionCount: number;
  /** An unfinished attempt to continue, with how far it got. */
  unfinished: { id: string; answered: number; total: number } | null;
  /** The latest finished attempt's score. */
  lastScore: { correct: number; total: number } | null;
};

type StartRow = {
  id: string;
  title: string;
  is_preview: boolean;
  chapters: { course_id: string; courses: { enrollments: { id: string }[] } | null } | null;
};

/** What the start screen needs: the quiz, its size, and the learner's attempts at it. */
export async function getQuizStart(supabase: AppSupabaseClient, quizId: string, signal?: AbortSignal): Promise<QuizStart | null> {
  const quizQuery = supabase
    .from("quizzes")
    .select("id, title, is_preview, chapters(course_id, courses(enrollments(id)))")
    .eq("id", quizId);
  const countQuery = supabase.from("quiz_questions").select("id", { count: "exact", head: true }).eq("quiz_id", quizId);
  const attemptsQuery = supabase
    .from("quiz_attempts")
    .select("id, finished_at, total_questions, correct_count, quiz_attempt_answers(count)")
    .eq("quiz_id", quizId)
    .order("started_at", { ascending: false })
    .limit(20);

  const [{ data: quizData }, { count }, { data: attempts }] = await Promise.all([
    (signal ? quizQuery.abortSignal(signal) : quizQuery).maybeSingle().throwOnError(),
    (signal ? countQuery.abortSignal(signal) : countQuery).throwOnError(),
    (signal ? attemptsQuery.abortSignal(signal) : attemptsQuery).throwOnError(),
  ]);
  if (!quizData) return null;
  const quiz = quizData as unknown as StartRow;
  if (!quiz.chapters) return null;

  const rows = attempts as unknown as {
    id: string;
    finished_at: string | null;
    total_questions: number;
    correct_count: number;
    quiz_attempt_answers: { count: number }[];
  }[];
  const open = rows.find((row) => !row.finished_at);
  const done = rows.find((row) => row.finished_at);
  const enrolled = (quiz.chapters.courses?.enrollments.length ?? 0) > 0;

  return {
    id: quiz.id,
    title: quiz.title,
    courseId: quiz.chapters.course_id,
    locked: !quiz.is_preview && !enrolled,
    questionCount: count ?? 0,
    unfinished: open
      ? { id: open.id, answered: open.quiz_attempt_answers[0]?.count ?? 0, total: open.total_questions }
      : null,
    lastScore: done ? { correct: done.correct_count, total: done.total_questions } : null,
  };
}

/** Free quizzes left in the last 24 hours, or null with Pro (unlimited). */
export async function getSessionsLeft(supabase: AppSupabaseClient, signal?: AbortSignal): Promise<number | null> {
  const query = supabase.rpc("quiz_sessions_left");
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return data ?? null;
}

/** Starts a session of `count` random questions (null = all). Throws QuizLimitError at the free limit. */
export async function startAttempt(
  supabase: AppSupabaseClient,
  vars: { quizId: string; count: number | null; timed: boolean },
): Promise<string> {
  try {
    const { data } = await supabase
      .rpc("start_quiz_attempt", {
        p_quiz_id: vars.quizId,
        p_question_count: vars.count ?? undefined,
        p_timed: vars.timed,
      })
      .throwOnError();
    return (data as unknown as { id: string }).id;
  } catch (error) {
    if ((error as { code?: string }).code === "P0002") throw new QuizLimitError();
    throw error;
  }
}

export type QuizAnswerOption = { id: string; position: number; text: string };
export type AttemptQuestion = {
  id: string;
  position: number;
  prompt: string;
  explanation: string | null;
  referenceUrl: string | null;
  answers: QuizAnswerOption[];
};
export type GivenAnswer = { answerId: string | null; isCorrect: boolean; correctAnswerId: string };
export type Attempt = {
  id: string;
  quizId: string;
  quizTitle: string;
  courseId: string | null;
  timed: boolean;
  total: number;
  finished: boolean;
  correct: number;
  wrong: number;
  skipped: number;
  questions: AttemptQuestion[];
  /** Answers given so far, by question id. */
  given: Record<string, GivenAnswer>;
};

type AttemptRow = {
  id: string;
  quiz_id: string;
  timed: boolean;
  total_questions: number;
  finished_at: string | null;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  quizzes: { title: string; chapters: { course_id: string } | null } | null;
  quiz_attempt_questions: {
    position: number;
    quiz_questions: {
      id: string;
      prompt: string;
      explanation: string | null;
      reference_url: string | null;
      quiz_answers: { id: string; position: number; text: string }[];
    } | null;
  }[];
  quiz_attempt_answers: { question_id: string; answer_id: string | null; is_correct: boolean; correct_answer_id: string }[];
};

/** An attempt with its chosen questions (answers without is_correct) and the learner's answers so far. */
export async function getAttempt(supabase: AppSupabaseClient, attemptId: string, signal?: AbortSignal): Promise<Attempt | null> {
  const query = supabase
    .from("quiz_attempts")
    .select(
      "id, quiz_id, timed, total_questions, finished_at, correct_count, wrong_count, skipped_count, " +
        "quizzes(title, chapters(course_id)), " +
        "quiz_attempt_questions(position, quiz_questions(id, prompt, explanation, reference_url, quiz_answers(id, position, text))), " +
        "quiz_attempt_answers(question_id, answer_id, is_correct, correct_answer_id)",
    )
    .eq("id", attemptId);
  const { data } = await (signal ? query.abortSignal(signal) : query).maybeSingle().throwOnError();
  if (!data) return null;
  const row = data as unknown as AttemptRow;
  return {
    id: row.id,
    quizId: row.quiz_id,
    quizTitle: row.quizzes?.title ?? "Quiz",
    courseId: row.quizzes?.chapters?.course_id ?? null,
    timed: row.timed,
    total: row.total_questions,
    finished: row.finished_at !== null,
    correct: row.correct_count,
    wrong: row.wrong_count,
    skipped: row.skipped_count,
    questions: [...row.quiz_attempt_questions]
      .sort((a, b) => a.position - b.position)
      .flatMap((item) =>
        item.quiz_questions
          ? [
              {
                id: item.quiz_questions.id,
                position: item.position,
                prompt: item.quiz_questions.prompt,
                explanation: item.quiz_questions.explanation,
                referenceUrl: item.quiz_questions.reference_url,
                answers: [...item.quiz_questions.quiz_answers].sort((a, b) => a.position - b.position),
              },
            ]
          : [],
      ),
    given: Object.fromEntries(
      row.quiz_attempt_answers.map((answer) => [
        answer.question_id,
        { answerId: answer.answer_id, isCorrect: answer.is_correct, correctAnswerId: answer.correct_answer_id },
      ]),
    ),
  };
}

/** Grades one answer in the database (null = skipped / timed out). */
export async function answerQuestion(
  supabase: AppSupabaseClient,
  vars: { attemptId: string; questionId: string; answerId: string | null },
): Promise<GivenAnswer & { explanation: string | null }> {
  const { data } = await supabase
    .rpc("answer_quiz_question", {
      p_attempt_id: vars.attemptId,
      p_question_id: vars.questionId,
      p_answer_id: vars.answerId ?? undefined,
    })
    .throwOnError();
  const result = data[0];
  return {
    answerId: vars.answerId,
    isCorrect: result.is_correct,
    correctAnswerId: result.correct_answer_id,
    explanation: result.explanation ?? null,
  };
}

/** Finishes an attempt; unanswered questions count as skipped. */
export async function finishAttempt(supabase: AppSupabaseClient, attemptId: string): Promise<void> {
  await supabase.rpc("finish_quiz_attempt", { p_attempt_id: attemptId }).throwOnError();
}

/** The question ids the learner has flagged to review. */
export async function getFlags(supabase: AppSupabaseClient, signal?: AbortSignal): Promise<string[]> {
  const query = supabase.from("question_flags").select("question_id");
  const { data } = await (signal ? query.abortSignal(signal) : query).throwOnError();
  return data.map((row) => row.question_id);
}

/** Flags or unflags a question (flagging twice is fine). */
export async function setFlag(supabase: AppSupabaseClient, questionId: string, flagged: boolean): Promise<void> {
  if (!flagged) {
    await supabase.from("question_flags").delete().eq("question_id", questionId).throwOnError();
    return;
  }
  try {
    await supabase.from("question_flags").insert({ question_id: questionId }).throwOnError();
  } catch (error) {
    if ((error as { code?: string }).code !== "23505") throw error;
  }
}
