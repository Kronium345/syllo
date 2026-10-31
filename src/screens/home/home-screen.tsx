import { useUser } from "@clerk/expo";
import { router } from "expo-router";
import { Award, Bell, CircleCheck, CirclePlay, Flame } from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useMemo } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonInk } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Glass } from "@/components/ui/glass";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { featureComingSoon } from "@/lib/coming-soon";
import { nextLesson } from "@/lib/course-outline";
import { displayFirstName, profileImageUrl } from "@/lib/display-name";
import { greeting } from "@/lib/format-duration";
import { categoriesFor } from "@/lib/onboarding/options";
import { type CourseCard, useCourseDetails, useCourseFeed } from "@/lib/queries/courses";
import { useLatestEnrollment } from "@/lib/queries/enrollments";
import { useMyProfile } from "@/lib/queries/profiles";
import { type LearningStats, useLearningStats } from "@/lib/queries/progress";
import { color, type ColorToken, tw } from "@/theme";

import { RecommendedCard } from "./recommended-card";

/** learning_dashboard: greeting, continue card, recommendations and learning stats. */
export function HomeScreen() {
  const { user } = useUser();
  const paddingTop = useTopPadding(56);
  const feed = useCourseFeed();
  const latest = useLatestEnrollment();
  const profile = useMyProfile();
  const stats = useLearningStats();
  const firstName = displayFirstName(user);

  // Courses in the learner's chosen interests first, otherwise by title.
  const recommended = useMemo(() => {
    const preferred = categoriesFor(profile.data?.interests ?? []);
    const courses = feed.data ?? [];
    return [
      ...courses.filter((course) => course.category && preferred.includes(course.category)),
      ...courses.filter((course) => !course.category || !preferred.includes(course.category)),
    ];
  }, [feed.data, profile.data?.interests]);

  const refreshing = feed.isRefetching || latest.isRefetching || stats.isRefetching;
  const refresh = () => {
    feed.refetch();
    latest.refetch();
    stats.refetch();
  };
  const streakDays = stats.data?.streakDays ?? 0;

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <Glass style={[tw`px-screen pb-4 flex-row items-center justify-between border-b border-border`, { paddingTop }]}>
        <View style={tw`flex-row items-center gap-3 flex-1`}>
          <Avatar imageUrl={profileImageUrl(user)} name={firstName} size="sm" bordered />
          <View style={tw`flex-1`}>
            <AppText style={tw`text-12 font-medium text-muted`}>{greeting()}</AppText>
            <AppText numberOfLines={1} style={tw`text-16 font-bold text-ink`}>
              {user?.fullName?.trim() || firstName}
            </AppText>
          </View>
        </View>
        <View style={tw`flex-row items-center gap-3`}>
          <View
            accessibilityLabel={`${streakDays} day streak`}
            style={tw`flex-row items-center gap-1.5 bg-streak-tint px-3 py-1.5 rounded-full border border-streak-line`}
          >
            <Icon as={Flame} size="md" color="streak" />
            <AppText style={tw`text-14 font-bold text-streak-deep`}>{streakDays}</AppText>
          </View>
          <IconButton icon={Bell} accessibilityLabel="Notifications" onPress={() => featureComingSoon("Notifications")} />
        </View>
      </Glass>

      <ScrollView
        style={tw`flex-1`}
        contentContainerStyle={tw`pb-6`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={color("muted")} />}
      >
        {feed.isPending ? (
          <View accessibilityRole="progressbar" accessibilityLabel="Loading courses" style={tw`py-24 items-center`}>
            <ActivityIndicator color={color("muted")} />
          </View>
        ) : feed.isError ? (
          <Pressable accessibilityRole="button" onPress={refresh} style={tw`py-24 items-center gap-2`}>
            <AppText variant="callout">Couldn&apos;t load courses.</AppText>
            <AppText style={tw`text-14 font-semibold text-primary`}>
              {feed.isFetching ? "Trying again…" : "Try again"}
            </AppText>
          </Pressable>
        ) : recommended.length === 0 ? (
          <AppText variant="heading" style={tw`py-24 text-center`}>
            No courses yet
          </AppText>
        ) : (
          <>
            <ContinueCard course={latest.data ?? null} fallback={recommended[0]} stats={stats.data} />

            <View style={tw`px-screen mt-10 mb-4 flex-row items-center justify-between`}>
              <AppText variant="heading" accessibilityRole="header">
                Recommended for you
              </AppText>
              <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.navigate("/explore")}>
                <AppText style={tw`text-14 font-semibold text-primary`}>See All</AppText>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw`gap-4 px-screen pb-4`}
            >
              {recommended.map((course) => (
                <RecommendedCard key={course.id} course={course} onPress={() => openCourse(course.id)} />
              ))}
            </ScrollView>

            <View style={tw`px-screen mt-8 flex-row gap-4`}>
              <StatTile icon={Award} tint="info" value={stats.data?.certificates ?? 0} label="Certificates" />
              <StatTile icon={CircleCheck} tint="success" value={stats.data?.lessonsDone ?? 0} label="Lessons Done" />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function openCourse(courseId: string) {
  router.push({ pathname: "/course/[id]", params: { id: courseId } });
}

/** The hero card: the learner's latest enrollment, or a first course to start. */
function ContinueCard({
  course,
  fallback,
  stats,
}: {
  course: CourseCard | null;
  fallback: CourseCard;
  stats: LearningStats | undefined;
}) {
  const enrolled = course !== null;
  const shown = course ?? fallback;
  const completed = stats?.completedLessonIds;
  const done = completed ? shown.lessonIds.filter((id) => completed.has(id)).length : 0;
  const progress = enrolled && stats ? stats.progressOf(shown) : 0;
  const by = shown.tutorName ? `by ${shown.tutorName} • ` : "";
  // Resume needs the ordered outline; it loads in the background.
  const details = useCourseDetails(enrolled ? shown.id : null);

  const resume = () => {
    const lesson = details.data && completed ? nextLesson(details.data, completed) : null;
    if (enrolled && lesson) router.push({ pathname: "/lesson/[id]", params: { id: lesson.id } });
    else openCourse(shown.id);
  };

  return (
    <View style={tw`px-screen mt-6`}>
      <Card radius="card" shadow>
        <View style={tw`p-5`}>
          <Badge label={enrolled ? "In Progress" : "Start Learning"} style={tw`mb-4`} />
          <AppText variant="title" style={tw`mb-2`}>
            {shown.title}
          </AppText>
          <AppText variant="callout" style={tw`mb-5`}>
            {by}
            {done}/{shown.lessonCount} Lessons
          </AppText>
          <View style={tw`mb-6`}>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <AppText style={tw`text-13 font-semibold text-ink`}>Course Progress</AppText>
              <AppText style={tw`text-13 font-bold text-primary`}>{Math.round(progress * 100)}%</AppText>
            </View>
            <ProgressBar progress={progress} size="lg" />
          </View>
          <Button
            title={enrolled ? "Resume Lesson" : "Start Learning"}
            variant="primary-bold"
            leading={<Icon as={CirclePlay} size="md" color={buttonInk("primary-bold")} />}
            onPress={resume}
            style={tw`py-3.5 rounded-xl shadow-none`}
          />
        </View>
      </Card>
    </View>
  );
}

function StatTile({ icon, tint, value, label }: { icon: LucideIcon; tint: ColorToken; value: number; label: string }) {
  return (
    <View style={tw`flex-1 bg-surface p-4 border border-border rounded-2xl shadow-card`}>
      <View style={tw`mb-2`}>
        <Icon as={icon} size="xl" color={tint} />
      </View>
      <AppText style={tw`text-20 font-bold text-ink`}>{value}</AppText>
      <AppText variant="footnote">{label}</AppText>
    </View>
  );
}
