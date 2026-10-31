import type { CourseDetails, LessonOutline } from "@/lib/queries/courses";

/** Every lesson of a course in reading order (chapter, then lesson position). */
export function orderedLessons(course: CourseDetails): LessonOutline[] {
  return course.chapters.flatMap((chapter) => chapter.lessons);
}

/** A lesson is locked until the learner enrolls, unless it's a free preview. */
export function isLocked(lesson: LessonOutline, isEnrolled: boolean): boolean {
  return !isEnrolled && !lesson.isPreview;
}

/** Where "Continue Learning" / "Resume Lesson" go: the first lesson not yet completed, else the first. */
export function nextLesson(course: CourseDetails, completed: ReadonlySet<string>): LessonOutline | null {
  const lessons = orderedLessons(course);
  return lessons.find((lesson) => !completed.has(lesson.id)) ?? lessons[0] ?? null;
}

/** "01", "04": chapter and lesson numbers on the player's badges. */
export function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}
