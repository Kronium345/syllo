// Errors the services throw besides Supabase's own PostgrestError (which .throwOnError() rejects with).

/** A write that RLS refused: Postgres affects 0 rows instead of returning an error. */
export class NotAllowedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotAllowedError";
  }
}

/** A premium course needs Pro to enroll (prompts/16: the enrollments RLS policy refused it). */
export class PremiumRequiredError extends Error {
  constructor(message = "This course is included in Premium.") {
    super(message);
    this.name = "PremiumRequiredError";
  }
}

/** The free quiz limit is used up (start_quiz_attempt raises P0002); Pro removes it. */
export class QuizLimitError extends Error {
  constructor(message = "You've used today's 3 free quizzes.") {
    super(message);
    this.name = "QuizLimitError";
  }
}

/** The viva limit is used up (start_viva_session raises P0002): free 1 per 7 days, Pro 5 per 24 hours. */
export class VivaLimitError extends Error {
  constructor(message = "You've used this week's free viva.") {
    super(message);
    this.name = "VivaLimitError";
  }
}

/** Viva practice needs the learner's AI consent (18+, voice to Google Gemini) first (P0003). */
export class AiConsentRequiredError extends Error {
  constructor(message = "Agree to AI feedback first.") {
    super(message);
    this.name = "AiConsentRequiredError";
  }
}

/** This viva question already has feedback (viva-answer 409). */
export class AlreadyAnsweredError extends Error {
  constructor(message = "You've already answered this question.") {
    super(message);
    this.name = "AlreadyAnsweredError";
  }
}

/** Gemini heard no answer on the first try (viva-answer 422): record again. */
export class NoAnswerError extends Error {
  constructor(message = "We couldn't hear an answer.") {
    super(message);
    this.name = "NoAnswerError";
  }
}

/** The interview limit is used up (P0002 / 429): free 1 per 7 days, Pro 5 per 24 hours. */
export class InterviewLimitError extends Error {
  constructor(message = "You've used this week's free interview.") {
    super(message);
    this.name = "InterviewLimitError";
  }
}

/** The typed role isn't a plausible job, or uses characters that aren't allowed (interview-start 422/400). */
export class RoleNotAcceptedError extends Error {
  constructor(message = "Try a different role.") {
    super(message);
    this.name = "RoleNotAcceptedError";
  }
}
