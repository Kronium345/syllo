import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ArrowRight, Circle, CircleCheck, FileText, Lock, Users } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button, buttonInk } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { orderedLessons, twoDigits } from "@/lib/course-outline";
import { courseCover } from "@/lib/local-images";
import { type CourseDetails, useCourseDetails, useStudentCount } from "@/lib/queries/courses";
import { type Lesson, useLesson } from "@/lib/queries/lessons";
import { useProgress, useSetLessonCompleted } from "@/lib/queries/progress";
import { color, pressScale, tw } from "@/theme";

import { leaveLesson, LessonVideo } from "./lesson-video";
import { Markdown } from "./markdown";

/** lesson_player: video, lesson header, notes, and the completed / previous / next footer. */
export function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const lesson = useLesson(id);
  const course = useCourseDetails(lesson.data?.courseId);

  if (lesson.isPending || (lesson.data && course.isPending)) {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Loading lesson" style={tw`flex-1 bg-surface items-center justify-center`}>
        <ActivityIndicator color={color("muted")} />
      </View>
    );
  }
  if (lesson.isError || course.isError) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => (lesson.isError ? lesson.refetch() : course.refetch())}
        style={tw`flex-1 bg-surface items-center justify-center gap-2`}
      >
        <AppText variant="callout">Couldn&apos;t load this lesson.</AppText>
        <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
      </Pressable>
    );
  }
  if (!lesson.data || !course.data) {
    return (
      <View style={tw`flex-1 bg-surface items-center justify-center gap-4 px-screen`}>
        <AppText variant="callout">This lesson isn&apos;t available.</AppText>
        <Button title="Go back" variant="outline" onPress={() => leaveLesson(null)} style={tw`self-stretch`} />
      </View>
    );
  }
  return <LessonBody lesson={lesson.data} course={course.data} />;
}

function LessonBody({ lesson, course }: { lesson: Lesson; course: CourseDetails }) {
  const insets = useSafeAreaInsets();
  const students = useStudentCount(course.id);
  const progress = useProgress();
  const setCompleted = useSetLessonCompleted();
  const completed = (progress.data ?? []).some((row) => row.lessonId === lesson.id);

  const lessons = orderedLessons(course);
  const index = lessons.findIndex((item) => item.id === lesson.id);
  const previous = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const locked = lesson.content === null;

  // Replace, so Back from any lesson returns to the course rather than the previous lesson.
  const goTo = (lessonId: string) => router.replace({ pathname: "/lesson/[id]", params: { id: lessonId } });

  const toggleCompleted = () =>
    setCompleted.mutate(
      { lessonId: lesson.id, completed: !completed },
      { onError: () => toast.error("Couldn't save your progress.", "Check your connection and try again.") },
    );

  return (
    <View style={tw`flex-1 bg-surface`}>
      <LessonVideo
        key={lesson.id}
        videoUrl={lesson.content?.videoUrl ?? null}
        poster={courseCover(course)}
        fallbackDuration={lesson.durationSeconds}
        onBack={() => leaveLesson(course.id)}
      />

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-screen pt-8 pb-8`}>
        <View style={tw`mb-6`}>
          <View style={tw`flex-row items-center gap-2 mb-3`}>
            <Badge label={`Chapter ${twoDigits(lesson.chapterPosition)}`} style={tw`px-2`} />
            <AppText variant="badge" style={tw`text-muted`}>
              Lesson {twoDigits(lesson.position)}
            </AppText>
          </View>
          <AppText variant="title-lg" accessibilityRole="header" style={tw`mb-4`}>
            {lesson.title}
          </AppText>
          <View style={tw`flex-row items-center gap-6 py-4 border-t border-b border-border`}>
            <View style={tw`flex-row items-center gap-2`}>
              <Icon as={Users} size="md" color="muted" />
              <AppText variant="caption">
                {students.data === undefined
                  ? "— students"
                  : `${students.data.toLocaleString()} ${students.data === 1 ? "student" : "students"}`}
              </AppText>
            </View>
            {lesson.content?.body ? (
              <View style={tw`flex-row items-center gap-2`}>
                <Icon as={FileText} size="md" color="muted" />
                <AppText variant="caption">Resources included</AppText>
              </View>
            ) : null}
          </View>
        </View>

        {locked ? (
          <View style={tw`items-center gap-3 py-6`}>
            <Icon as={Lock} size="xl" color="faint" />
            <AppText variant="callout" style={tw`text-center`}>
              Enroll to watch this lesson. Enrolling is free.
            </AppText>
            <Button title="Back to the course" variant="outline" onPress={() => leaveLesson(course.id)} style={tw`self-stretch`} />
          </View>
        ) : lesson.content?.body ? (
          <View>
            <AppText variant="heading" style={tw`mb-3`}>
              Description
            </AppText>
            <Markdown source={lesson.content.body} skipTitle={lesson.title} />
          </View>
        ) : null}
      </ScrollView>

      <View style={[tw`bg-surface border-t border-border px-screen pt-6`, { paddingBottom: Math.max(40, insets.bottom + 16) }]}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: completed, disabled: locked }}
          disabled={locked}
          onPress={toggleCompleted}
          style={({ pressed }) => [
            tw.style(
              "flex-row items-center justify-center gap-2 border py-3 rounded-xl mb-4",
              completed || pressed ? "border-primary bg-primary-tint" : "border-border",
            ),
            { opacity: locked ? 0.4 : 1 },
          ]}
        >
          <Icon as={completed ? CircleCheck : Circle} size="lg" color={completed ? "primary" : "ink"} />
          <AppText style={tw`text-15 font-semibold text-ink`}>{completed ? "Completed" : "Mark as Completed"}</AppText>
        </Pressable>

        <View style={tw`flex-row items-center gap-4`}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !previous }}
            disabled={!previous}
            onPress={() => previous && goTo(previous.id)}
            style={({ pressed }) => [
              tw`flex-1 flex-row items-center justify-center gap-2 py-3.5 border border-border rounded-2xl`,
              pressScale(pressed, 0.95),
              { opacity: previous ? 1 : 0.4 },
            ]}
          >
            <Icon as={ArrowLeft} size="md" color="ink" />
            <AppText style={tw`text-16 font-bold text-ink`}>Previous</AppText>
          </Pressable>
          <Button
            title={next ? "Next Lesson" : "Finish Course"}
            variant="primary-bold"
            trailing={<Icon as={ArrowRight} size="md" color={buttonInk("primary-bold")} />}
            onPress={() => (next ? goTo(next.id) : leaveLesson(course.id))}
            style={tw`flex-1 py-3.5`}
          />
        </View>
      </View>
    </View>
  );
}
