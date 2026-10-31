import { useMemo } from "react";

import type { CourseCard } from "@/services/courses";
import type { ProgressRow } from "@/services/lessons";

import { useEnrolledCourses } from "../enrollments/use-enrolled-courses";
import { useProgress } from "./use-progress";

export type LearningStats = {
  completedLessonIds: Set<string>;
  lessonsDone: number;
  /** Enrolled courses with every lesson completed. */
  certificates: number;
  /** Consecutive days with a completion, ending today or yesterday (device calendar). */
  streakDays: number;
  /** Completed / total lessons for a course card (0–1). */
  progressOf: (course: CourseCard) => number;
};

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function streak(rows: ProgressRow[], today = new Date()): number {
  const days = new Set(rows.map((row) => dayKey(new Date(row.completedAt))));
  const cursor = new Date(today);
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(dayKey(cursor))) {
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

/**
 * Home's numbers, derived from the learner's progress and enrolled courses. `data` is
 * undefined until both have loaded; `isPending`/`isError`/`refetch` cover both queries.
 */
export function useLearningStats() {
  const progress = useProgress();
  const enrolled = useEnrolledCourses();

  const data = useMemo<LearningStats | undefined>(() => {
    if (!progress.data || !enrolled.data) return undefined;
    const completedLessonIds = new Set(progress.data.map((row) => row.lessonId));
    const progressOf = (course: CourseCard) =>
      course.lessonCount === 0
        ? 0
        : course.lessonIds.filter((id) => completedLessonIds.has(id)).length / course.lessonCount;
    return {
      completedLessonIds,
      lessonsDone: completedLessonIds.size,
      certificates: enrolled.data.filter((course) => course.lessonCount > 0 && progressOf(course) === 1).length,
      streakDays: streak(progress.data),
      progressOf,
    };
  }, [progress.data, enrolled.data]);

  return {
    data,
    isPending: progress.isPending || enrolled.isPending,
    isError: progress.isError || enrolled.isError,
    isRefetching: progress.isRefetching || enrolled.isRefetching,
    refetch: () => Promise.all([progress.refetch(), enrolled.refetch()]),
  };
}
