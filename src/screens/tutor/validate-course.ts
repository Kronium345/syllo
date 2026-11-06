import type { NewCourseInput } from "@/lib/queries/tutor";

/** Field limits; the database function `create_course` (prompts/21) checks the same numbers. */
export const COURSE_LIMITS = {
  title: { min: 3, max: 80 },
  subtitle: { max: 120 },
  description: { min: 20, max: 2000 },
} as const;

export type CourseDraft = {
  title: string;
  subtitle: string;
  description: string;
  category: string | null;
  level: NewCourseInput["level"] | null;
  access: NewCourseInput["access"];
};

export type CourseDraftErrors = Partial<Record<keyof CourseDraft, string>>;

/** One message per invalid field, for red borders plus one toast (`reportInvalid`). */
export function validateCourse(draft: CourseDraft): CourseDraftErrors {
  const errors: CourseDraftErrors = {};
  const title = draft.title.trim();
  const subtitle = draft.subtitle.trim();
  const description = draft.description.trim();
  if (title.length < COURSE_LIMITS.title.min) errors.title = "Enter a title of at least 3 characters.";
  else if (title.length > COURSE_LIMITS.title.max) errors.title = "Keep the title to 80 characters or fewer.";
  if (subtitle.length > COURSE_LIMITS.subtitle.max) errors.subtitle = "Keep the subtitle to 120 characters or fewer.";
  if (description.length < COURSE_LIMITS.description.min) errors.description = "Write a description of at least 20 characters.";
  else if (description.length > COURSE_LIMITS.description.max) errors.description = "Keep the description to 2000 characters or fewer.";
  if (!draft.category) errors.category = "Choose a category.";
  if (!draft.level) errors.level = "Choose a level.";
  return errors;
}
