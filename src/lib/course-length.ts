// How long a course is, in words (prompts/24 follow-up). Most courses are measured in lessons and
// minutes; a quiz-only course (Pharmacy Exam Prep: 17 chapters, each just a quiz) has neither, so
// it says how many quizzes it has instead of "0m" or "0/0 lessons".

/** True when the course has quizzes but no lessons. */
export function isQuizOnly(course: { lessonCount: number; quizCount: number }): boolean {
  return course.lessonCount === 0 && course.quizCount > 0;
}

/** "1 quiz", "17 quizzes". */
export function quizCountLabel(count: number): string {
  return `${count} ${count === 1 ? "quiz" : "quizzes"}`;
}
