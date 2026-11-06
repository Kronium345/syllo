import { Image } from "expo-image";
import { CircleCheck } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppText } from "@/components/ui/text";
import { isQuizOnly, quizCountLabel } from "@/lib/course-length";
import { type CourseCard, useCourseCover } from "@/lib/queries/courses";
import { pressScale, tw } from "@/theme";

/**
 * A course the learner is enrolled in, on Home's "Your courses" row (not in the design: the
 * Recommended card with its rating swapped for progress).
 */
export function EnrolledCourseCard({
  course,
  completed,
  onPress,
}: {
  course: CourseCard;
  /** Lesson ids the learner has completed (any course). */
  completed: ReadonlySet<string> | undefined;
  onPress: () => void;
}) {
  const cover = useCourseCover(course);
  const total = course.lessonIds.length;
  const done = completed ? course.lessonIds.filter((id) => completed.has(id)).length : 0;
  const finished = total > 0 && done >= total;
  const label = isQuizOnly(course)
    ? quizCountLabel(course.quizCount)
    : finished
      ? "Completed"
      : `${done}/${total} lessons`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${course.title}, ${label}`}
      onPress={onPress}
      style={({ pressed }) => [
        tw`w-[240px] bg-surface border border-border rounded-2xl overflow-hidden`,
        pressScale(pressed),
      ]}
    >
      <View style={tw`h-[120px] bg-track`}>
        {cover ? (
          <Image
            source={cover}
            accessibilityIgnoresInvertColors
            contentFit="cover"
            transition={200}
            style={tw`w-full h-full`}
          />
        ) : null}
        {course.access === "premium" ? <Badge label="Premium" style={tw`absolute top-3 left-3`} /> : null}
      </View>
      <View style={tw`p-4 gap-3`}>
        <AppText variant="card-title" numberOfLines={2} style={tw`min-h-[40px]`}>
          {course.title}
        </AppText>
        <ProgressBar progress={total > 0 ? done / total : 0} size="sm" />
        <View style={tw`flex-row items-center gap-1.5`}>
          {finished ? <Icon as={CircleCheck} size="sm" color="success" /> : null}
          <AppText variant="footnote" style={finished ? tw`text-success-deep font-semibold` : undefined}>
            {label}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}
