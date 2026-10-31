import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Clock, LayoutTemplate, Share2, Star } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Share, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Fade } from "@/components/ui/fade";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { featureComingSoon } from "@/lib/coming-soon";
import { nextLesson, orderedLessons } from "@/lib/course-outline";
import { formatHoursMinutes } from "@/lib/format-duration";
import { courseCover, tutorPhoto } from "@/lib/local-images";
import { type CourseDetails, useCourseDetails } from "@/lib/queries/courses";
import { useEnroll } from "@/lib/queries/enrollments";
import { useProgress } from "@/lib/queries/progress";
import { placeholderRating } from "@/screens/home/placeholder-stats";
import { color, tw } from "@/theme";

import { ChapterSection } from "./chapter-section";

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/home");
}

/** course_details: hero, info card, about, tutor, curriculum and the enroll footer. */
export function CourseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const headerTop = useTopPadding(48);
  const course = useCourseDetails(id);

  return (
    <View style={tw`flex-1 bg-surface`}>
      {course.isPending ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading course" style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={color("muted")} />
        </View>
      ) : course.isError ? (
        <Pressable accessibilityRole="button" onPress={() => course.refetch()} style={tw`flex-1 items-center justify-center gap-2`}>
          <AppText variant="callout">Couldn&apos;t load this course.</AppText>
          <AppText style={tw`text-14 font-semibold text-primary`}>
            {course.isFetching ? "Trying again…" : "Try again"}
          </AppText>
        </Pressable>
      ) : !course.data ? (
        <View style={tw`flex-1 items-center justify-center px-screen`}>
          <AppText variant="callout">This course isn&apos;t available.</AppText>
        </View>
      ) : (
        <CourseBody course={course.data} />
      )}

      {/* Floating header (absolute top-12 px-6), over the photo. */}
      <View style={[tw`absolute left-0 right-0 px-screen flex-row items-center justify-between`, { top: headerTop }]}>
        <IconButton icon={ChevronLeft} variant="glass" accessibilityLabel="Back" onPress={goBack} />
        {course.data ? (
          <IconButton
            icon={Share2}
            variant="glass"
            accessibilityLabel="Share course"
            onPress={() => Share.share({ message: `${course.data?.title} on Syllo` }).catch(() => undefined)}
          />
        ) : null}
      </View>
    </View>
  );
}

function CourseBody({ course }: { course: CourseDetails }) {
  const enroll = useEnroll();
  const progress = useProgress();
  const completed = new Set((progress.data ?? []).map((row) => row.lessonId));
  const lessons = orderedLessons(course);
  const durationSeconds = lessons.reduce((total, lesson) => total + lesson.durationSeconds, 0);
  const [openChapters, setOpenChapters] = useState<Set<string>>(
    () => new Set(course.chapters[0] ? [course.chapters[0].id] : []),
  );
  const cover = courseCover(course);
  const photo = course.tutor ? tutorPhoto(course.tutor) : null;

  const toggle = (chapterId: string) =>
    setOpenChapters((current) => {
      const next = new Set(current);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });

  const openLesson = (lessonId: string) => router.push({ pathname: "/lesson/[id]", params: { id: lessonId } });

  const start = () => {
    if (course.isEnrolled) {
      const lesson = nextLesson(course, completed);
      if (lesson) openLesson(lesson.id);
      else toast.info("No lessons yet", "This course's lessons are on their way.");
      return;
    }
    enroll.mutate(course.id, {
      onSuccess: () => {
        toast.success("You're enrolled!", course.title);
        const first = lessons[0];
        if (first) openLesson(first.id);
      },
      onError: () => toast.error("Couldn't enroll.", "Check your connection and try again."),
    });
  };

  return (
    <>
      <ScrollView style={tw`flex-1`} showsVerticalScrollIndicator={false}>
        <View style={tw`h-[260px] w-full bg-track`}>
          {cover ? (
            <Image source={cover} accessibilityIgnoresInvertColors contentFit="cover" style={tw`w-full h-full`} />
          ) : null}
          <Fade to="surface" via={50} />
        </View>

        <View style={tw`px-screen -mt-10`}>
          <View style={tw`bg-surface rounded-2xl p-6 border border-border shadow-card mb-8`}>
            <AppText variant="title-lg" accessibilityRole="header" style={tw`mb-4`}>
              {course.title}
            </AppText>
            <View style={tw`flex-row flex-wrap items-center gap-x-4 gap-y-3`}>
              <View style={tw`flex-row items-center gap-1.5`}>
                <Icon as={Star} size="md" color="primary" />
                <AppText style={tw`text-14 font-bold text-ink`}>{placeholderRating(course.id)}</AppText>
                {/* PLACEHOLDER until courses have ratings. */}
                <AppText style={tw`text-14 text-muted`}>(2.4k)</AppText>
              </View>
              <View style={tw`flex-row items-center gap-1.5`}>
                <Icon as={Clock} size="md" color="muted" />
                <AppText style={tw`text-14 text-muted`}>{formatHoursMinutes(durationSeconds)}</AppText>
              </View>
              <View style={tw`flex-row items-center gap-1.5`}>
                <Icon as={LayoutTemplate} size="md" color="muted" />
                <AppText style={tw`text-14 text-muted`}>
                  {lessons.length} {lessons.length === 1 ? "Lesson" : "Lessons"}
                </AppText>
              </View>
            </View>
          </View>

          {course.description ? (
            <View style={tw`mb-8`}>
              <AppText variant="heading" style={tw`mb-3`}>
                About this course
              </AppText>
              <AppText variant="body">{course.description}</AppText>
            </View>
          ) : null}

          {course.tutor ? (
            <View style={tw`mb-10`}>
              <AppText variant="heading" style={tw`mb-3`}>
                The Tutor
              </AppText>
              <View style={tw`flex-row items-center gap-4 p-4 border border-border rounded-2xl bg-subtle`}>
                <Avatar source={photo} name={course.tutor.name} size="md" />
                <View style={tw`flex-1`}>
                  <AppText style={tw`text-16 font-bold text-ink`}>{course.tutor.name}</AppText>
                  {course.tutor.headline ? <AppText variant="caption">{course.tutor.headline}</AppText> : null}
                </View>
                <Button title="Follow" variant="outline-primary" onPress={() => featureComingSoon("Following tutors")} />
              </View>
            </View>
          ) : null}

          <View style={tw`mb-10`}>
            <View style={tw`flex-row items-center justify-between mb-4`}>
              <AppText variant="heading">Curriculum</AppText>
              <AppText variant="callout">
                {course.chapters.length} {course.chapters.length === 1 ? "Chapter" : "Chapters"}
              </AppText>
            </View>
            {course.chapters.map((chapter, index) => (
              <ChapterSection
                key={chapter.id}
                chapter={chapter}
                index={index}
                open={openChapters.has(chapter.id)}
                onToggle={() => toggle(chapter.id)}
                isEnrolled={course.isEnrolled}
                completed={completed}
                onOpenLesson={(lesson) => openLesson(lesson.id)}
                onOpenQuiz={(quizId) => router.push({ pathname: "/quiz/[id]", params: { id: quizId } })}
                onLocked={() => toast.info("Enroll to unlock", "Enrolling is free.")}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      <StickyFooter>
        <View style={tw`flex-row items-center justify-between mb-4`}>
          <View>
            <AppText variant="footnote">Full Access</AppText>
            <AppText style={tw`text-24 font-bold text-ink`}>Free</AppText>
          </View>
        </View>
        <Button
          title={course.isEnrolled ? "Continue Learning" : "Enroll in Course"}
          variant="primary-bold"
          loading={enroll.isPending}
          onPress={start}
        />
      </StickyFooter>
    </>
  );
}
