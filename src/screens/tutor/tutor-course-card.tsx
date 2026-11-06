import { Image } from "expo-image";
import { View, Pressable } from "react-native";

import { Badge } from "@/components/ui/badge";
import { AppText } from "@/components/ui/text";
import { levelLabel } from "@/lib/course-level";
import { courseCover } from "@/lib/local-images";
import type { TutorCourse } from "@/lib/queries/tutor";
import { pressScale, tw } from "@/theme";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "17 chapters · 17 quizzes": the outline in numbers, leaving out what the course has none of. */
function outlineSummary(course: TutorCourse): string {
  const parts = [plural(course.chapterCount, "chapter")];
  if (course.lessonCount > 0) parts.push(plural(course.lessonCount, "lesson"));
  if (course.quizCount > 0) parts.push(plural(course.quizCount, "quiz").replace("quizs", "quizzes"));
  return parts.join(" · ");
}

/** One of the tutor's courses on the dashboard (not in the design; built from its tokens). */
export function TutorCourseCard({ course, onPress }: { course: TutorCourse; onPress: () => void }) {
  const cover = courseCover(course);
  const status = course.isPublished ? "Published" : "Draft";
  const details = [course.access === "premium" ? "Premium" : "Free", course.level ? levelLabel(course.level) : null]
    .filter(Boolean)
    .join(" · ");
  const summary = outlineSummary(course);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${course.title}, ${status}, ${details}, ${summary}`}
      accessibilityHint="Opens the course editor"
      onPress={onPress}
      style={({ pressed }) => [
        tw`flex-row gap-4 p-3 bg-surface border border-border rounded-2xl`,
        pressScale(pressed),
      ]}
    >
      <View style={tw`w-[88px] h-[88px] rounded-xl overflow-hidden bg-track`}>
        {cover ? (
          <Image source={cover} accessibilityIgnoresInvertColors contentFit="cover" style={tw`w-full h-full`} />
        ) : null}
      </View>
      <View style={tw`flex-1 gap-1.5 justify-center`}>
        <Badge label={status} style={course.isPublished ? undefined : tw`bg-track`} />
        <AppText variant="card-title" numberOfLines={2}>
          {course.title}
        </AppText>
        <AppText variant="footnote">{details}</AppText>
        <AppText variant="footnote">{summary}</AppText>
      </View>
    </Pressable>
  );
}
