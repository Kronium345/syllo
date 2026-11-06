import { router } from "expo-router";
import { BookOpen, LogOut, SquareArrowOutUpRight } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import type { CourseCard } from "@/lib/queries/courses";
import { useEnrolledCourses, useLeaveCourse } from "@/lib/queries/enrollments";
import { useLearningStats } from "@/lib/queries/progress";
import { usePremium } from "@/lib/queries/purchases";
import { NotAllowedError } from "@/services/errors";
import { color, pressScale, tw } from "@/theme";

import { isFinished, MyCourseRow } from "./my-course-row";

type Filter = "all" | "in-progress" | "completed";

/**
 * My Courses tab (prompts/27): every enrolled course with its progress, filtered by All / In
 * progress / Completed, most recently studied first. Each row resumes the next lesson; its menu
 * opens the course or leaves it (progress is kept). Not in the design; built from its tokens.
 */
export function MyCoursesScreen() {
  const insets = useSafeAreaInsets();
  const enrolled = useEnrolledCourses();
  const stats = useLearningStats();
  const premium = usePremium();
  const leave = useLeaveCourse();
  const [filter, setFilter] = useState<Filter>("all");
  const [menuFor, setMenuFor] = useState<CourseCard | null>(null);
  const [leaving, setLeaving] = useState<CourseCard | null>(null);

  const courses = enrolled.data ?? [];
  const completed = stats.data?.completedLessonIds ?? new Set<string>();
  const lastStudied = stats.data?.lastStudiedAt;
  // Stable sort: courses never studied keep the service's order (newest enrolment first).
  const sorted = lastStudied ? [...courses].sort((a, b) => lastStudied(b) - lastStudied(a)) : courses;
  const done = sorted.filter((course) => isFinished(course, completed));
  const inProgress = sorted.filter((course) => !isFinished(course, completed));
  const shown = filter === "completed" ? done : filter === "in-progress" ? inProgress : sorted;
  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "All", count: sorted.length },
    { value: "in-progress", label: "In progress", count: inProgress.length },
    { value: "completed", label: "Completed", count: done.length },
  ];

  const confirmLeave = () => {
    if (!leaving) return;
    leave.mutate(leaving.id, {
      onSuccess: () => {
        toast.success("Left course", leaving.title);
        setLeaving(null);
      },
      onError: (error) =>
        error instanceof NotAllowedError
          ? toast.error("That's not allowed.", error.message)
          : toast.error("Couldn't leave the course.", "Check your connection and try again."),
    });
  };

  return (
    <View style={[tw`flex-1 bg-canvas`, { paddingTop: insets.top + 16 }]}>
      <AppText variant="title-xl" accessibilityRole="header" style={tw`px-screen`}>
        My Courses
      </AppText>

      {stats.isPending ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading your courses" style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={color("muted")} />
        </View>
      ) : stats.isError ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => stats.refetch()}
          style={tw`flex-1 items-center justify-center gap-2 px-screen`}
        >
          <AppText variant="callout">Couldn&apos;t load your courses.</AppText>
          <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
        </Pressable>
      ) : courses.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center gap-4 px-screen`}>
          <View style={tw`w-12 h-12 rounded-xl bg-primary-tint items-center justify-center`}>
            <Icon as={BookOpen} size="xl" color="primary" />
          </View>
          <View style={tw`items-center gap-1`}>
            <AppText variant="heading">No courses yet</AppText>
            <AppText variant="callout" style={tw`text-center`}>
              Courses you enroll in appear here.
            </AppText>
          </View>
          <Button title="Explore courses" onPress={() => router.navigate("/explore")} style={tw`self-stretch`} />
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(course) => course.id}
          contentContainerStyle={tw`px-screen pt-5 pb-8 gap-3`}
          refreshing={stats.isRefetching}
          onRefresh={() => stats.refetch()}
          ListHeaderComponent={
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              accessibilityRole="radiogroup"
              accessibilityLabel="Show courses"
              style={tw`-mx-screen pb-2`}
              contentContainerStyle={tw`px-screen gap-2`}
            >
              {filters.map((option) => (
                <Chip
                  key={option.value}
                  role="radio"
                  label={`${option.label} ${option.count}`}
                  selected={filter === option.value}
                  onPress={() => setFilter(option.value)}
                />
              ))}
            </ScrollView>
          }
          renderItem={({ item }) => (
            <MyCourseRow
              course={item}
              completed={completed}
              premiumLapsed={item.access === "premium" && premium.data === false}
              onMenu={() => setMenuFor(item)}
            />
          )}
          ListEmptyComponent={
            <AppText variant="body" style={tw`text-center py-8`}>
              {filter === "completed" ? "No completed courses yet." : "Nothing in progress."}
            </AppText>
          }
        />
      )}

      <Sheet visible={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.title ?? ""}>
        <View style={tw`gap-1 pb-2`}>
          <MenuRow
            icon={SquareArrowOutUpRight}
            label="Open course"
            onPress={() => {
              const course = menuFor;
              setMenuFor(null);
              if (course) router.push({ pathname: "/course/[id]", params: { id: course.id } });
            }}
          />
          <MenuRow
            icon={LogOut}
            label="Leave course"
            danger
            onPress={() => {
              setLeaving(menuFor);
              setMenuFor(null);
            }}
          />
        </View>
      </Sheet>

      <ConfirmSheet
        visible={!!leaving}
        title="Leave course?"
        message={leaving ? `You'll lose access to ${leaving.title}. Your progress is kept if you enrol again.` : ""}
        confirmLabel="Leave course"
        busy={leave.isPending}
        onConfirm={confirmLeave}
        onClose={() => setLeaving(null)}
      />
    </View>
  );
}

function MenuRow({
  icon,
  label,
  danger = false,
  onPress,
}: {
  icon: typeof LogOut;
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [tw`flex-row items-center gap-3 py-3.5`, pressScale(pressed, 0.98)]}
    >
      <Icon as={icon} size="md" color={danger ? "danger" : "ink"} />
      <AppText variant="callout-strong" style={danger ? tw`text-danger-deep` : undefined}>
        {label}
      </AppText>
    </Pressable>
  );
}
