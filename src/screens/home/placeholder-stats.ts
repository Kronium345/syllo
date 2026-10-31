// PLACEHOLDER until courses have ratings (prompts/07, 08): the prototype's sample scores.
// Everything else on Home is real (lesson_progress).

/** Sample star ratings for course cards. */
export function placeholderRating(courseId: string): string {
  // Stable per course, alternating the prototype's two values.
  return courseId.charCodeAt(0) % 2 === 0 ? "4.8" : "4.9";
}
