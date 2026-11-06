import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ImageIcon,
  LayoutList,
  type LucideIcon,
  Pencil,
  Users,
} from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Badge } from "@/components/ui/badge";
import { Button, buttonInk } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { levelLabel } from "@/lib/course-level";
import { quizCountLabel } from "@/lib/course-length";
import { twoDigits } from "@/lib/course-outline";
import { formatClock } from "@/lib/format-duration";
import { useCourseCover, useStudentCount } from "@/lib/queries/courses";
import { type TutorChapter, type TutorCourseDetails, useTutorCourse } from "@/lib/queries/tutor";
import { color, pressScale, tw } from "@/theme";

import { PublishingCard } from "./publishing-card";

const goBack = () => (router.canGoBack() ? router.back() : router.replace("/tutor"));

/**
 * /tutor/course/[id] (prompts/25): a read-only overview of one of the tutor's courses (cover,
 * details, numbers, publishing, outline) with "Edit course", which opens the editor at
 * /tutor/course/[id]/edit. Not in the design; built from its tokens like the other tutor screens.
 */
export function CourseOverviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paddingTop = useTopPadding(48);
  const course = useTutorCourse(id);

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={goBack} />
        <AppText variant="title" accessibilityRole="header" style={tw`flex-1`}>
          Course
        </AppText>
        {course.data ? (
          <Badge
            label={course.data.isPublished ? "Published" : "Draft"}
            style={course.data.isPublished ? undefined : tw`bg-track`}
          />
        ) : null}
      </View>

      {course.isPending ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading course" style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={color("muted")} />
        </View>
      ) : course.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => course.refetch()}
          style={tw`flex-1 items-center justify-center gap-2 px-screen`}
        >
          <AppText variant="callout">Couldn&apos;t load this course.</AppText>
          <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
        </Pressable>
      ) : course.data === null ? (
        <View style={tw`flex-1 items-center justify-center gap-4 px-screen`}>
          <AppText variant="callout">This course isn&apos;t available.</AppText>
          <Button title="Go back" variant="outline" onPress={goBack} style={tw`self-stretch`} />
        </View>
      ) : (
        <CourseOverview course={course.data} />
      )}
    </View>
  );
}

function CourseOverview({ course }: { course: TutorCourseDetails }) {
  const insets = useSafeAreaInsets();
  const cover = useCourseCover(course);
  const students = useStudentCount(course.isPublished ? course.id : null);
  const lessonCount = course.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0);
  const quizCount = course.chapters.reduce((total, chapter) => total + chapter.quizCount, 0);
  const details = [
    course.access === "premium" ? "Premium" : "Free",
    course.level ? levelLabel(course.level) : null,
    course.category,
  ]
    .filter(Boolean)
    .join(" · ");
  const learners = !course.isPublished ? "—" : students.data === undefined ? "…" : String(students.data);

  return (
    <ScrollView contentContainerStyle={[tw`px-screen gap-8`, { paddingBottom: insets.bottom + 40 }]}>
      <View style={tw`gap-4`}>
        <View
          style={[tw`w-full rounded-2xl overflow-hidden bg-track items-center justify-center`, { aspectRatio: 16 / 9 }]}
        >
          {cover ? (
            <Image
              source={cover}
              accessibilityLabel={`Cover of ${course.title}`}
              contentFit="cover"
              transition={200}
              style={tw`w-full h-full`}
            />
          ) : (
            <Icon as={ImageIcon} size="2xl" color="muted" />
          )}
        </View>
        <View style={tw`gap-1`}>
          <AppText variant="title-lg">{course.title}</AppText>
          {course.subtitle ? <AppText variant="subtitle">{course.subtitle}</AppText> : null}
          <AppText variant="caption">{details}</AppText>
        </View>
        {course.description ? <AppText variant="body">{course.description}</AppText> : null}
        <Button
          title="Edit course"
          leading={<Icon as={Pencil} size="md" color={buttonInk("primary")} />}
          onPress={() => router.push({ pathname: "/tutor/course/[id]/edit", params: { id: course.id } })}
        />
      </View>

      <View style={tw`gap-3`}>
        <View style={tw`flex-row gap-3`}>
          <StatTile icon={LayoutList} value={String(course.chapters.length)} label="Chapters" />
          <StatTile icon={BookOpen} value={String(lessonCount)} label="Lessons" />
        </View>
        <View style={tw`flex-row gap-3`}>
          <StatTile icon={ClipboardCheck} value={String(quizCount)} label="Quizzes" />
          <StatTile
            icon={Users}
            value={learners}
            label={course.isPublished ? "Learners" : "Learners (once published)"}
            onPress={() => router.push({ pathname: "/tutor/course/[id]/learners", params: { id: course.id } })}
          />
        </View>
      </View>

      <View style={tw`gap-4`}>
        <AppText variant="heading" accessibilityRole="header">
          Publishing
        </AppText>
        <PublishingCard course={course} />
      </View>

      <View style={tw`gap-4`}>
        <AppText variant="heading" accessibilityRole="header">
          Outline
        </AppText>
        {course.chapters.length === 0 ? (
          <AppText variant="body">No chapters yet. Tap Edit course to add one.</AppText>
        ) : (
          course.chapters.map((chapter) => <ChapterSummary key={chapter.id} courseId={course.id} chapter={chapter} />)
        )}
      </View>
    </ScrollView>
  );
}

/**
 * One number on the overview (chapters, lessons, quizzes, learners), like Home's stat tiles. With
 * `onPress` it's a button with a chevron (Learners opens the Learners page, prompts/26).
 */
function StatTile({
  icon,
  value,
  label,
  onPress,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
  onPress?: () => void;
}) {
  const a11yLabel = `${label}: ${value === "—" ? "none yet" : value}`;
  const content = (
    <>
      <View style={tw`flex-row items-center justify-between`}>
        <Icon as={icon} size="lg" color="primary" />
        {onPress ? <Icon as={ChevronRight} size="sm" color="muted" /> : null}
      </View>
      <AppText style={tw`text-20 font-bold text-ink`}>{value}</AppText>
      <AppText variant="footnote">{label}</AppText>
    </>
  );
  const box = tw`flex-1 bg-surface p-4 border border-border rounded-2xl gap-1`;
  return onPress ? (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Opens the list of learners"
      onPress={onPress}
      style={({ pressed }) => [box, pressScale(pressed, 0.98)]}
    >
      {content}
    </Pressable>
  ) : (
    <View accessible accessibilityLabel={a11yLabel} style={box}>
      {content}
    </View>
  );
}

/** A chapter in the read-only outline; tapping a lesson opens the lesson editor. */
function ChapterSummary({ courseId, chapter }: { courseId: string; chapter: TutorChapter }) {
  return (
    <Card style={tw`p-4 gap-3`}>
      <View style={tw`flex-row items-center justify-between`}>
        <Badge label={`Chapter ${twoDigits(chapter.position)}`} style={tw`px-2`} />
        {chapter.quizCount > 0 ? <AppText variant="footnote">{quizCountLabel(chapter.quizCount)}</AppText> : null}
      </View>
      <AppText variant="card-title">{chapter.title}</AppText>
      {chapter.lessons.length === 0 ? (
        <AppText variant="footnote">No lessons yet.</AppText>
      ) : (
        <View style={tw`border-t border-border`}>
          {chapter.lessons.map((lesson) => (
            <Pressable
              key={lesson.id}
              accessibilityRole="button"
              accessibilityLabel={`Lesson ${lesson.position}, ${lesson.title}${lesson.isPreview ? ", preview" : ""}`}
              accessibilityHint="Opens the lesson editor"
              onPress={() =>
                router.push({ pathname: "/tutor/course/[id]/lesson/[lessonId]", params: { id: courseId, lessonId: lesson.id } })
              }
              style={({ pressed }) => [tw`flex-row items-center gap-3 py-3 border-b border-border`, pressScale(pressed, 0.98)]}
            >
              <AppText variant="caption" style={tw`w-6`}>
                {twoDigits(lesson.position)}
              </AppText>
              <View style={tw`flex-1`}>
                <AppText variant="callout-strong" numberOfLines={2}>
                  {lesson.title}
                </AppText>
                <AppText variant="footnote">
                  {[lesson.durationSeconds > 0 ? formatClock(lesson.durationSeconds) : "No video", lesson.isPreview ? "Preview" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </AppText>
              </View>
              <Icon as={ChevronRight} size="sm" color="muted" />
            </Pressable>
          ))}
        </View>
      )}
    </Card>
  );
}
