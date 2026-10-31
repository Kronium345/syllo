// Errors the services throw besides Supabase's own PostgrestError (which .throwOnError() rejects with).

/** A write that RLS refused: Postgres affects 0 rows instead of returning an error. */
export class NotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotAllowedError";
  }
}

/** The free quiz limit is used up (start_quiz_attempt raises P0002); Pro removes it. */
export class QuizLimitError extends Error {
  constructor(message = "You've used today's 3 free quizzes.") {
    super(message);
    this.name = "QuizLimitError";
  }
}
