import type { ImageSource } from "expo-image";

// Every image the app shows is bundled (prompts/08). Seeded courses and tutors map to files
// in assets/images/; the database URL is only a fallback for courses added later.

const COURSE_COVERS: Record<string, ImageSource> = {
  "react-native-basics": require("@/assets/images/courses/react-native-basics.jpg"),
  "ui-design-fundamentals": require("@/assets/images/courses/ui-design-fundamentals.jpg"),
  "python-for-everyone": require("@/assets/images/courses/python-for-everyone.jpg"),
  "data-analysis-pandas": require("@/assets/images/courses/data-analysis-pandas.jpg"),
  "advanced-animations": require("@/assets/images/courses/advanced-animations.jpg"),
  "design-systems": require("@/assets/images/courses/design-systems.jpg"),
  "pharmacy-exam-prep": require("@/assets/images/courses/pharmacy-exam-prep.jpg"),
};

// Keyed by tutor id: md5('tutor:<key>') in the seeds.
const TUTOR_PHOTOS: Record<string, ImageSource> = {
  // Syllo Team (md5('tutor:syllo-pharmacy')), the one tutor of every course since prompts/19:
  // the brand mark. The sample tutors' photos (maya, leo, aisha) are no longer used.
  "2c1fbd60-bf36-0585-122a-adc64e67d1f7": require("@/assets/images/logo-mark.png"),
};

/** A course's cover: the bundled file, else its database URL, else nothing. */
export function courseCover(course: { slug: string; coverImageUrl: string | null }): ImageSource | null {
  return COURSE_COVERS[course.slug] ?? (course.coverImageUrl ? { uri: course.coverImageUrl } : null);
}

/** A tutor's photo: the bundled file, else their database URL, else nothing. */
export function tutorPhoto(tutor: { id: string; avatarUrl: string | null }): ImageSource | null {
  return TUTOR_PHOTOS[tutor.id] ?? (tutor.avatarUrl ? { uri: tutor.avatarUrl } : null);
}
