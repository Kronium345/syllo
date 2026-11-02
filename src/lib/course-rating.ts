// Course ratings on cards and Course details (prompts/16). Averages come from
// courses.rating_average/rating_count (course_reviews + a trigger); no ratings yet = "New".

/** "4.7", or "New" until the course has ratings. */
export function ratingLabel(course: { ratingAverage: number | null; ratingCount: number }): string {
  return course.ratingCount > 0 && course.ratingAverage !== null ? course.ratingAverage.toFixed(1) : "New";
}
