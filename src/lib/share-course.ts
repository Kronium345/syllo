import { Share } from "react-native";

import { toast } from "@/components/ui/toast";
import { orderedLessons } from "@/lib/course-outline";
import { levelLabel } from "@/lib/course-level";
import { formatHoursMinutes } from "@/lib/format-duration";
import type { CourseDetails } from "@/lib/queries/courses";

// Sharing a course (prompts/14): a short summary plus a link that opens it in Syllo.

/** Keep equal to `scheme` in app.json. */
export const APP_SCHEME = "syllo";

const DESCRIPTION_LIMIT = 200;

/**
 * syllo://course/<id>. Built by hand: Linking.createURL returns a dev-client URL in
 * development builds. There's no https link until the web app is deployed.
 */
export function courseLink(courseId: string): string {
  return `${APP_SCHEME}://course/${courseId}`;
}

function shorten(text: string, limit: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).trimEnd()}…`;
}

/** The share sheet's title and message. Parts the course doesn't have are left out. */
export function courseShareMessage(course: CourseDetails): { title: string; message: string } {
  const lessons = orderedLessons(course);
  const seconds = lessons.reduce((total, lesson) => total + lesson.durationSeconds, 0);
  const facts = [
    course.tutor ? `by ${course.tutor.name}` : null,
    course.level ? levelLabel(course.level) : null,
    seconds > 0 ? formatHoursMinutes(seconds) : null,
    lessons.length > 0 ? `${lessons.length} ${lessons.length === 1 ? "lesson" : "lessons"}` : null,
  ].filter((fact): fact is string => !!fact);

  const parts = [
    [course.title, facts.join(" · ")].filter(Boolean).join("\n"),
    course.description ? shorten(course.description, DESCRIPTION_LIMIT) : null,
    `Open it in Syllo: ${courseLink(course.id)}`,
  ].filter((part): part is string => !!part);

  return { title: course.title, message: parts.join("\n\n") };
}

/** Opens the system share sheet for the course. Cancelling is fine; failures show a toast. */
export async function shareCourse(course: CourseDetails) {
  try {
    await Share.share(courseShareMessage(course), { dialogTitle: `Share ${course.title}` });
  } catch {
    toast.error("Couldn't share this course.", "Please try again.");
  }
}
