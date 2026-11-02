import type { CourseLevel } from "@/lib/queries/courses";

/** How a course level reads in the app (Explore cards and filters, shared course text). */
export const LEVEL_LABELS: Record<CourseLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function levelLabel(level: CourseLevel): string {
  return LEVEL_LABELS[level];
}
