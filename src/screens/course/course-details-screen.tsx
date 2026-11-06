import ShareIcon from "@expo/material-symbols/share.xml";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { ChevronLeft, ChevronRight, ClipboardCheck, Clock, LayoutTemplate, Share2, Star } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Fade } from "@/components/ui/fade";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { isQuizOnly } from "@/lib/course-length";
import { nextLesson, orderedLessons } from "@/lib/course-outline";
import { ratingLabel } from "@/lib/course-rating";
import { formatHoursMinutes } from "@/lib/format-duration";
import { formatCount } from "@/lib/format-number";
import { tutorPhoto } from "@/lib/local-images";
import { type CourseDetails, useCourseCover, useCourseDetails } from "@/lib/queries/courses";
import { useEnroll } from "@/lib/queries/enrollments";
import { useFollowTutor } from "@/lib/queries/follows";
import { useProgress } from "@/lib/queries/progress";
import { usePremium, useSyncPremium } from "@/lib/queries/purchases";
import { useMyReview } from "@/lib/queries/reviews";
import { shareCourse } from "@/lib/share-course";
import { PremiumRequiredError } from "@/services/errors";
import { color, pressScale, tw } from "@/theme";

import { ChapterSection } from "./chapter-section";
import { RateCourseSheet } from "./rate-course-sheet";

// iOS/Android use the native header with a Stack.Toolbar share button (prompts/14); web has
// no native toolbar, so it keeps the design's floating glass back and share buttons.
const isWeb = process.env.EXPO_OS === "web";
/** The cover photo's height (h-[260px]). */
const HERO_HEIGHT = 260;

/**
 * The footer button: enroll (or unlock) before enrolling; once enrolled, "Start Lesson" until a
 * lesson is completed, "Continue Learning" part-way, "Review Course" when every lesson is done.
 */
function footerTitle(enrolled: boolean, needsPremium: boolean, done: number, total: number): string {
  if (!enrolled) return needsPremium ? "Unlock with Premium" : "Enroll in Course";
  if (done === 0) return "Start Lesson";
  return total > 0 && done >= total ? "Review Course" : "Continue Learning";
}

function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/home");
}

/** course_details: hero, info card, about, tutor, curriculum and the enroll footer. */
export function CourseDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const headerTop = useTopPadding(48);
  const course = useCourseDetails(id);
  const data = course.data;
  // Once the photo scrolls away, the header gets the page colour so content doesn't run under its icons.
  const [pastHero, setPastHero] = useState(false);

  return (
    <View style={tw`flex-1 bg-surface`}>
      {isWeb ? null : (
        <>
          {/* Shown in every state, so Back works while loading or after an error. */}
          <Stack.Screen
            options={{
              headerShown: true,
              headerTransparent: true,
              title: "",
              headerTintColor: color("white"),
              headerBackButtonDisplayMode: "minimal",
              headerStyle: { backgroundColor: pastHero ? color("surface") : "transparent" },
              headerShadowVisible: false,
            }}
          />
          {data ? (
            <Stack.Toolbar placement="right">
              <Stack.Toolbar.Button
                icon={process.env.EXPO_OS === "ios" ? "square.and.arrow.up" : ShareIcon}
                accessibilityLabel="Share course"
                onPress={() => shareCourse(data)}
              />
            </Stack.Toolbar>
          ) : null}
        </>
      )}
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
        <CourseBody course={course.data} onPastHeroChange={setPastHero} />
      )}

      {/* Web only: the design's floating header (absolute top-12 px-6), over the photo. */}
      {isWeb ? (
        <View style={[tw`absolute left-0 right-0 px-screen flex-row items-center justify-between`, { top: headerTop }]}>
          <IconButton icon={ChevronLeft} variant="glass" accessibilityLabel="Back" onPress={goBack} />
          {data ? (
            <IconButton icon={Share2} variant="glass" accessibilityLabel="Share course" onPress={() => shareCourse(data)} />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function CourseBody({
  course,
  onPastHeroChange,
}: {
  course: CourseDetails;
  onPastHeroChange: (pastHero: boolean) => void;
}) {
  const enroll = useEnroll();
  const follow = useFollowTutor();
  const premium = usePremium();
  const syncPremium = useSyncPremium();
  const myReview = useMyReview(course.id, { enabled: course.isEnrolled });
  const [rating, setRating] = useState(false);
  const progress = useProgress();
  const completed = new Set((progress.data ?? []).map((row) => row.lessonId));
  const lessons = orderedLessons(course);
  const lessonsDone = lessons.filter((lesson) => completed.has(lesson.id)).length;
  const durationSeconds = lessons.reduce((total, lesson) => total + lesson.durationSeconds, 0);
  const quizCount = course.chapters.reduce((total, chapter) => total + chapter.quizzes.length, 0);
  const quizOnly = isQuizOnly({ lessonCount: lessons.length, quizCount });
  const [openChapters, setOpenChapters] = useState<Set<string>>(
    () => new Set(course.chapters[0] ? [course.chapters[0].id] : []),
  );
  const cover = useCourseCover(course);
  const photo = course.tutor ? tutorPhoto(course.tutor) : null;
  const insets = useSafeAreaInsets();

  const toggle = (chapterId: string) =>
    setOpenChapters((current) => {
      const next = new Set(current);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });

  const isPro = premium.data === true;
  // Unknown Pro status (web, still loading) lets the learner try; the database decides.
  const needsPremium = course.access === "premium" && !course.isEnrolled && premium.data === false;

  const openLesson = (lessonId: string) => router.push({ pathname: "/lesson/[id]", params: { id: lessonId } });

  const start = () => {
    if (course.isEnrolled) {
      const lesson = nextLesson(course, completed);
      if (lesson) openLesson(lesson.id);
      else toast.info("No lessons yet", "This course's lessons are on their way.");
      return;
    }
    // Premium courses need Pro (prompts/16): send learners without it to the paywall.
    if (needsPremium) {
      router.push("/premium");
      return;
    }
    const enrolled = () => {
      toast.success("You're enrolled!", course.title);
      const first = lessons[0];
      if (first) openLesson(first.id);
    };
    enroll.mutate(course.id, {
      onSuccess: enrolled,
      onError: async (error) => {
        if (!(error instanceof PremiumRequiredError)) {
          toast.error("Couldn't enroll.", "Check your connection and try again.");
          return;
        }
        // RevenueCat says Pro but the database hasn't caught up: sync once, then retry.
        if (isPro) {
          try {
            await syncPremium.mutateAsync();
            await enroll.mutateAsync(course.id);
            enrolled();
            return;
          } catch {
            // Fall through to the paywall.
          }
        }
        toast.info("Included in Premium", "Upgrade to start this course.");
        router.push("/premium");
      },
    });
  };

  return (
    <>
      <ScrollView
        style={tw`flex-1`}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        // The header's bottom edge (safe area + 56) reaches the photo's end (260).
        onScroll={(event) => onPastHeroChange(event.nativeEvent.contentOffset.y > HERO_HEIGHT - insets.top - 56)}
      >
        <View style={tw`h-[260px] w-full bg-track`}>
          {cover ? (
            <Image source={cover} accessibilityIgnoresInvertColors contentFit="cover" style={tw`w-full h-full`} />
          ) : null}
          <Fade to="surface" via={50} />
          {isWeb ? null : (
            // Keeps the native header's white back and share icons readable on light photos.
            <View
              pointerEvents="none"
              style={[
                tw`absolute top-0 left-0 right-0`,
                {
                  height: insets.top + 96,
                  backgroundImage: `linear-gradient(to bottom, ${color("scrim")} 0%, transparent 100%)`,
                },
              ]}
            />
          )}
        </View>

        <View style={tw`px-screen -mt-10`}>
          <View style={tw`bg-surface rounded-2xl p-6 border border-border shadow-card mb-8`}>
            <AppText variant="title-lg" accessibilityRole="header" style={tw`mb-4`}>
              {course.title}
            </AppText>
            <View style={tw`flex-row flex-wrap items-center gap-x-4 gap-y-3`}>
              <View style={tw`flex-row items-center gap-1.5`}>
                <Icon as={Star} size="md" color="primary" />
                <AppText style={tw`text-14 font-bold text-ink`}>{ratingLabel(course)}</AppText>
                {course.ratingCount > 0 ? (
                  <AppText style={tw`text-14 text-muted`}>({formatCount(course.ratingCount)})</AppText>
                ) : null}
              </View>
              {quizOnly ? (
                // A quiz-only course (Pharmacy Exam Prep) has no length or lessons to show.
                <View style={tw`flex-row items-center gap-1.5`}>
                  <Icon as={ClipboardCheck} size="md" color="muted" />
                  <AppText style={tw`text-14 text-muted`}>
                    {quizCount} {quizCount === 1 ? "Quiz" : "Quizzes"}
                  </AppText>
                </View>
              ) : (
                <>
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
                </>
              )}
            </View>
          </View>

          {course.isEnrolled ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={myReview.data ? `Your rating: ${myReview.data.rating} stars. Edit` : "Rate this course"}
              onPress={() => setRating(true)}
              style={({ pressed }) => [
                tw`-mt-4 mb-8 flex-row items-center gap-3 px-4 py-3.5 rounded-2xl border border-border bg-subtle`,
                pressScale(pressed, 0.98),
              ]}
            >
              <Icon as={Star} size="lg" color="star" filled={!!myReview.data} />
              <AppText style={tw`flex-1 text-15 font-semibold text-ink`}>
                {myReview.data ? `Your rating: ${myReview.data.rating}/5` : "Rate this course"}
              </AppText>
              <AppText style={tw`text-14 font-semibold text-primary`}>{myReview.data ? "Edit" : "Rate"}</AppText>
              <Icon as={ChevronRight} size="md" color="muted" />
            </Pressable>
          ) : null}

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
                <Button
                  title={course.tutor.isFollowed ? "Following" : "Follow"}
                  // Same compact style in both states (the design's Follow), so the tutor's name keeps its width.
                  variant="outline-primary"
                  onPress={() => {
                    const tutor = course.tutor;
                    if (!tutor) return;
                    follow.mutate(
                      { courseId: course.id, tutorId: tutor.id, follow: !tutor.isFollowed },
                      { onError: () => toast.error("Couldn't update.", "Check your connection and try again.") },
                    );
                  }}
                />
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
            <AppText style={tw`text-24 font-bold text-ink`}>
              {course.access === "premium" ? "Included in Premium" : "Free"}
            </AppText>
          </View>
        </View>
        <Button
          title={footerTitle(course.isEnrolled, needsPremium, lessonsDone, lessons.length)}
          variant="primary-bold"
          loading={enroll.isPending}
          onPress={start}
        />
      </StickyFooter>

      <RateCourseSheet
        visible={rating}
        courseId={course.id}
        courseTitle={course.title}
        current={myReview.data ?? null}
        onClose={() => setRating(false)}
      />
    </>
  );
}
