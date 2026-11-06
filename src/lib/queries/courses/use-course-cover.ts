import type { ImageSource } from "expo-image";

import { courseCover } from "../../local-images";
import { useCourseCoverUrl } from "./use-course-cover-url";

/**
 * The cover to draw for a course (prompts/24): an uploaded cover (signed R2 link, cached by its
 * key so a renewed link reuses the picture), else the bundled file for seeded courses, else the
 * database URL, else null. While an uploaded cover's link loads it's null, so cards keep their
 * placeholder rather than flashing the old picture.
 */
export function useCourseCover(course: {
  id: string;
  slug: string;
  coverImageUrl: string | null;
  coverKey: string | null;
}): ImageSource | null {
  const link = useCourseCoverUrl(course.id, course.coverKey);
  if (course.coverKey) {
    return link.data ? { uri: link.data.url, cacheKey: course.coverKey } : null;
  }
  return courseCover(course);
}
