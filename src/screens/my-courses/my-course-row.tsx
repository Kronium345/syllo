import { Image } from "expo-image";
import { router } from "expo-router";
import { Ellipsis } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppText } from "@/components/ui/text";
import { Icon } from "@/components/ui/icon";
import { isQuizOnly, quizCountLabel } from "@/lib/course-length";
import { nextLesson } from "@/lib/course-outline";
import { type CourseCard, useCourseCover, useCourseDetails } from "@/lib/queries/courses";
import { pressScale, tw } from "@/theme";

export function lessonsDone(course: CourseCard, completed: ReadonlySet<string>): number {
  return course.lessonIds.filter((id) => completed.has(id)).length;
}

export function isFinished(course: CourseCard, completed: ReadonlySet<string>): boolean {
  return course.lessonCount > 0 && lessonsDone(course, completed) >= course.lessonCount;
}

const openCourse = (courseId: string) => router.push({ pathname: "/course/[id]", params: { id: courseId } });

/**
 * One enrolled course on My Courses (prompts/27): cover, title, tutor, progress and the next step
 * (Start / Continue / Review, or Upgrade when Pro has lapsed on a premium course). The card opens
 * the course; ⋯ opens the course menu. Not in the design; built from its tokens.
 */
export function MyCourseRow({
  course,
  completed,
  premiumLapsed,
  onMenu,
}: {
  course: CourseCard;
  completed: ReadonlySet<string>;
  /** A premium course and the learner no longer has Pro. */
  premiumLapsed: boolean;
  onMenu: () => void;
}) {
  const cover = useCourseCover(course);
  const quizOnly = isQuizOnly(course);
  const done = lessonsDone(course, completed);
  const finished = isFinished(course, completed);
  const wantsLesson = !quizOnly && !finished && !premiumLapsed;
  // Start/Continue need the ordered outline to find the next lesson; it loads in the background.
  const details = useCourseDetails(wantsLesson ? course.id : null);
  const waiting = wantsLesson && !details.data && !details.isError;

  const progressLabel = quizOnly
    ? quizCountLabel(course.quizCount)
    : finished
      ? "Completed"
      : `${done}/${course.lessonCount} lessons`;
  const action = premiumLapsed
    ? "Upgrade to Premium"
    : quizOnly
      ? "Open Course"
      : finished
        ? "Review Course"
        : done === 0
          ? "Start Lesson"
          : "Continue Learning";

  const onAction = () => {
    if (premiumLapsed) return router.push("/premium");
    const lesson = wantsLesson && details.data ? nextLesson(details.data, completed) : null;
    if (lesson) router.push({ pathname: "/lesson/[id]", params: { id: lesson.id } });
    else openCourse(course.id);
  };

  return (
    <View style={tw`bg-surface border border-border rounded-2xl p-4 gap-4`}>
      <View style={tw`flex-row gap-3`}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${course.title}, ${progressLabel}`}
          accessibilityHint="Opens the course"
          onPress={() => openCourse(course.id)}
          style={({ pressed }) => [tw`flex-1 flex-row gap-3`, pressScale(pressed, 0.98)]}
        >
          <View style={tw`w-24 h-[54px] rounded-xl overflow-hidden bg-track`}>
            {cover ? (
              <Image
                source={cover}
                accessibilityIgnoresInvertColors
                contentFit="cover"
                transition={200}
                style={tw`w-full h-full`}
              />
            ) : null}
          </View>
          <View style={tw`flex-1 gap-1`}>
            <AppText variant="card-title" numberOfLines={2}>
              {course.title}
            </AppText>
            <View style={tw`flex-row flex-wrap items-center gap-x-2 gap-y-1`}>
              {course.tutorName ? (
                <AppText variant="footnote">
                  by {course.tutorName}
                </AppText>
              ) : null}
              {course.access === "premium" ? <Badge label="Premium" style={tw`px-2 py-0.5`} /> : null}
            </View>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`More options for ${course.title}`}
          hitSlop={6}
          onPress={onMenu}
          style={({ pressed }) => [tw`w-9 h-9 -mt-1 -mr-1 rounded-lg items-center justify-center`, pressScale(pressed, 0.9)]}
        >
          <Icon as={Ellipsis} size="md" color="muted" />
        </Pressable>
      </View>

      {quizOnly ? (
        <AppText variant="footnote">{progressLabel}</AppText>
      ) : (
        <View style={tw`flex-row items-center gap-3`}>
          <View style={tw`flex-1`}>
            <ProgressBar progress={course.lessonCount > 0 ? done / course.lessonCount : 0} size="sm" />
          </View>
          <AppText variant="footnote" style={finished ? tw`text-success-deep font-semibold` : undefined}>
            {progressLabel}
          </AppText>
        </View>
      )}

      {premiumLapsed ? (
        <AppText variant="footnote" style={tw`text-danger-deep`}>
          This is a Premium course. Upgrade to keep learning.
        </AppText>
      ) : null}

      <Button
        title={action}
        variant={premiumLapsed ? "primary" : "outline"}
        loading={waiting}
        disabled={waiting}
        onPress={onAction}
        style={tw`py-3 rounded-xl shadow-none`}
      />
    </View>
  );
}
