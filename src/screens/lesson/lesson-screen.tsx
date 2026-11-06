import { router, Stack, useLocalSearchParams } from "expo-router";
import { FileText, Lock, Users } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { orderedLessons, twoDigits } from "@/lib/course-outline";
import { type CourseDetails, useCourseCover, useCourseDetails, useStudentCount } from "@/lib/queries/courses";
import { type Lesson, useLesson, useLessonVideo } from "@/lib/queries/lessons";
import { useProgress, useSetLessonCompleted } from "@/lib/queries/progress";
import { usePremium } from "@/lib/queries/purchases";
import { color, tw } from "@/theme";

import { LessonActions } from "./lesson-actions";
import { LessonSources } from "./lesson-sources";
import { leaveLesson, LessonVideo } from "./lesson-video";
import { Markdown } from "./markdown";
import { ResourceCard } from "./resource-card";

/** iOS/Android show a native header with the lesson title (large title on iOS); web keeps the design's glass Back. */
const nativeHeader = process.env.EXPO_OS !== "web";

/** Height of the native bottom toolbar above the safe area (measured on Android: about 80dp). */
const TOOLBAR_HEIGHT = 80;

/** lesson_player: video, lesson header, notes, and the previous / completed / next toolbar. */
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
  // Videos in R2 need a signed link (prompts/15); outside links play as they are.
  const videoKey = lesson.content?.videoKey ?? null;
  const hosted = useLessonVideo(lesson.id, { enabled: !!videoKey });
  const videoUrl = videoKey ? (hosted.data?.url ?? null) : (lesson.content?.videoUrl ?? null);
  const students = useStudentCount(course.id);
  const cover = useCourseCover(course);
  const progress = useProgress();
  const setCompleted = useSetLessonCompleted();
  const completed = (progress.data ?? []).some((row) => row.lessonId === lesson.id);

  const lessons = orderedLessons(course);
  const index = lessons.findIndex((item) => item.id === lesson.id);
  const previous = index > 0 ? lessons[index - 1] : null;
  const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
  const locked = lesson.content === null;
  const premium = usePremium();
  // Enrolled in a premium course without Pro (e.g. a lapsed subscription): RLS hides the content.
  const premiumLocked = locked && course.isEnrolled && course.access === "premium" && premium.data !== true;

  // Replace, so Back from any lesson returns to the course rather than the previous lesson.
  const goTo = (lessonId: string) => router.replace({ pathname: "/lesson/[id]", params: { id: lessonId } });

  const toggleCompleted = () =>
    setCompleted.mutate(
      { lessonId: lesson.id, completed: !completed },
      {
        // The toolbar shows only an icon, so say what changed.
        onSuccess: () => (completed ? toast.info("Marked as not completed") : toast.success("Lesson completed")),
        onError: () => toast.error("Couldn't save your progress.", "Check your connection and try again."),
      },
    );

  return (
    <View style={tw`flex-1 bg-surface`}>
      {nativeHeader ? (
        <Stack.Screen
          options={{
            headerShown: true,
            title: lesson.title,
            headerLargeTitle: true,
            headerBackButtonDisplayMode: "minimal",
            headerTintColor: color("ink"),
            headerTitleStyle: { color: color("ink") },
            headerLargeTitleStyle: { color: color("ink") },
            headerStyle: { backgroundColor: color("surface") },
            headerLargeTitleShadowVisible: false,
            headerShadowVisible: false,
          }}
        />
      ) : null}
      <LessonVideo
        key={lesson.id}
        videoUrl={videoUrl}
        loading={!!videoKey && hosted.isPending}
        // An expired signed link: fetch a new one, which the player switches to.
        onSourceError={videoKey ? () => hosted.refetch() : undefined}
        poster={cover}
        fallbackDuration={lesson.durationSeconds}
        onBack={nativeHeader ? undefined : () => leaveLesson(course.id)}
      />

      <ScrollView
        // On iOS/Android the native bottom toolbar floats over the screen without a background
        // on Android: end the notes above it so text doesn't show through behind its icons.
        style={[tw`flex-1`, process.env.EXPO_OS === "web" ? null : { marginBottom: insets.bottom + TOOLBAR_HEIGHT }]}
        contentContainerStyle={tw`px-screen pt-8 pb-8`}
      >
        <View style={tw`mb-6`}>
          <View style={tw`flex-row items-center gap-2 mb-3`}>
            <Badge label={`Chapter ${twoDigits(lesson.chapterPosition)}`} style={tw`px-2`} />
            <AppText variant="badge" style={tw`text-muted`}>
              Lesson {twoDigits(lesson.position)}
            </AppText>
          </View>
          {/* The native header already shows the title on iOS/Android. */}
          {nativeHeader ? null : (
            <AppText variant="title-lg" accessibilityRole="header" style={tw`mb-4`}>
              {lesson.title}
            </AppText>
          )}
          <View style={tw`flex-row items-center gap-6 py-4 border-t border-b border-border`}>
            <View style={tw`flex-row items-center gap-2`}>
              <Icon as={Users} size="md" color="muted" />
              <AppText variant="caption">
                {students.data === undefined
                  ? "— students"
                  : `${students.data.toLocaleString()} ${students.data === 1 ? "student" : "students"}`}
              </AppText>
            </View>
            {lesson.resources.length > 0 ? (
              <View style={tw`flex-row items-center gap-2`}>
                <Icon as={FileText} size="md" color="muted" />
                <AppText variant="caption">Resources included</AppText>
              </View>
            ) : null}
          </View>
        </View>

        {premiumLocked ? (
          <View style={tw`items-center gap-3 py-6`}>
            <Icon as={Lock} size="xl" color="faint" />
            <AppText variant="callout" style={tw`text-center`}>
              This is a Premium course. Upgrade to keep learning.
            </AppText>
            <Button title="See Premium" onPress={() => router.push("/premium")} style={tw`self-stretch`} />
          </View>
        ) : locked ? (
          <View style={tw`items-center gap-3 py-6`}>
            <Icon as={Lock} size="xl" color="faint" />
            <AppText variant="callout" style={tw`text-center`}>
              {course.access === "premium"
                ? "This lesson is part of a Premium course. Enroll with Premium to watch it."
                : "Enroll to watch this lesson. Enrolling is free."}
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

        {!locked && lesson.resources.length > 0 ? (
          <View style={tw`mt-8 gap-3`}>
            <AppText variant="heading">Resources</AppText>
            {lesson.resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} />
            ))}
          </View>
        ) : null}

        <LessonSources sources={lesson.sources} />
      </ScrollView>

      <LessonActions
        previous={previous ? () => goTo(previous.id) : null}
        next={() => (next ? goTo(next.id) : leaveLesson(course.id))}
        isLast={!next}
        completed={completed}
        locked={locked}
        saving={setCompleted.isPending}
        onToggleCompleted={toggleCompleted}
      />
    </View>
  );
}
