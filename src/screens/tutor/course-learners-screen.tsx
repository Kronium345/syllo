import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, CircleCheck, Trash2, UserPlus, Users } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SearchField } from "@/components/ui/search-field";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { type CourseLearner, useCourseLearners, useRemoveLearner, useTutorCourse } from "@/lib/queries/tutor";
import { color, pressScale, tw } from "@/theme";

import { ConfirmSheet } from "@/components/ui/confirm-sheet";
import { reportTutorFailure } from "./report-tutor-failure";

type Sort = "newest" | "name" | "progress";
const SORTS: { value: Sort; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "name", label: "Name A–Z" },
  { value: "progress", label: "Most progress" },
];
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const displayName = (learner: CourseLearner) => learner.name ?? "Learner";
const fraction = (learner: CourseLearner) => (learner.lessonsTotal > 0 ? learner.lessonsDone / learner.lessonsTotal : 0);
const finished = (learner: CourseLearner) => learner.lessonsTotal > 0 && learner.lessonsDone >= learner.lessonsTotal;
const joined = (iso: string) =>
  `Joined ${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}`;

function sorted(learners: CourseLearner[], sort: Sort): CourseLearner[] {
  const list = [...learners];
  if (sort === "name") return list.sort((a, b) => displayName(a).localeCompare(displayName(b), "en-GB"));
  if (sort === "progress") return list.sort((a, b) => fraction(b) - fraction(a) || b.lessonsDone - a.lessonsDone);
  return list.sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt));
}

/**
 * /tutor/course/[id]/learners (prompts/26): who is enrolled in one of the tutor's courses, with
 * summary numbers, name search, sorting and Remove (their progress is kept). Names and photos
 * only, no contact details. Not in the design; built from its tokens.
 */
export function CourseLearnersScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paddingTop = useTopPadding(48);
  const insets = useSafeAreaInsets();
  const course = useTutorCourse(id);
  const learners = useCourseLearners(id);
  const remove = useRemoveLearner();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [removing, setRemoving] = useState<CourseLearner | null>(null);

  const all = learners.data ?? [];
  const query = search.trim().toLowerCase();
  const shown = sorted(
    query ? all.filter((learner) => displayName(learner).toLowerCase().includes(query)) : all,
    sort,
  );
  const quizOnly = all.length > 0 && all[0].lessonsTotal === 0;
  // "This week" counts back from when the list was fetched (render must stay pure; it refetches on focus).
  const fetchedAt = learners.dataUpdatedAt;
  const newThisWeek = all.filter((learner) => fetchedAt - new Date(learner.enrolledAt).getTime() < WEEK_MS).length;
  const completed = all.filter(finished).length;

  const confirmRemove = () => {
    if (!removing) return;
    remove.mutate(
      { courseId: id, userId: removing.userId },
      {
        onSuccess: () => {
          toast.success("Learner removed", `${displayName(removing)} no longer has access to this course.`);
          setRemoving(null);
        },
        onError: (error) => reportTutorFailure(error),
      },
    );
  };

  const header = (
    <View style={tw`gap-5 pb-2`}>
      <View style={tw`flex-row gap-3`}>
        <SummaryTile icon={Users} value={String(all.length)} label="Learners" />
        <SummaryTile icon={UserPlus} value={String(newThisWeek)} label="New this week" />
        <SummaryTile icon={CircleCheck} value={quizOnly ? "—" : String(completed)} label="Completed" />
      </View>
      {all.length > 0 ? (
        <View style={tw`gap-3`}>
          <View style={tw`flex-row`}>
            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Search learners by name"
              accessibilityLabel="Search learners by name"
              returnKeyType="search"
            />
          </View>
          <View accessibilityRole="radiogroup" accessibilityLabel="Sort learners" style={tw`flex-row flex-wrap gap-2`}>
            {SORTS.map((option) => (
              <Chip
                key={option.value}
                role="radio"
                label={option.label}
                selected={sort === option.value}
                onPress={() => setSort(option.value)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel="Back"
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace({ pathname: "/tutor/course/[id]", params: { id } })
          }
        />
        <View style={tw`flex-1`}>
          <AppText variant="title" accessibilityRole="header">
            Learners
          </AppText>
          {course.data ? (
            <AppText variant="footnote" numberOfLines={1}>
              {course.data.title}
            </AppText>
          ) : null}
        </View>
      </View>

      {learners.isPending || course.isPending ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading learners" style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={color("muted")} />
        </View>
      ) : learners.isError || course.isError || course.data === null ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void learners.refetch();
            void course.refetch();
          }}
          style={tw`flex-1 items-center justify-center gap-2 px-screen`}
        >
          <AppText variant="callout">Couldn&apos;t load the learners.</AppText>
          <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
        </Pressable>
      ) : !course.data.isPublished && all.length === 0 ? (
        <View style={tw`flex-1 items-center justify-center px-screen`}>
          <AppText variant="body" style={tw`text-center`}>
            Publish the course so learners can enrol.
          </AppText>
        </View>
      ) : (
        <FlatList
          data={shown}
          keyExtractor={(learner) => learner.userId}
          ListHeaderComponent={header}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[tw`px-screen gap-3`, { paddingBottom: insets.bottom + 40 }]}
          refreshing={learners.isRefetching}
          onRefresh={() => learners.refetch()}
          renderItem={({ item }) => <LearnerRow learner={item} onRemove={() => setRemoving(item)} />}
          ListEmptyComponent={
            <AppText variant="body" style={tw`text-center py-8`}>
              {query ? `No learners match "${search.trim()}".` : "No learners yet."}
            </AppText>
          }
        />
      )}

      <ConfirmSheet
        visible={!!removing}
        title="Remove learner?"
        message={
          removing
            ? `${displayName(removing)} will lose access to this course. Their progress is kept if they enrol again.`
            : ""
        }
        confirmLabel="Remove learner"
        busy={remove.isPending}
        onConfirm={confirmRemove}
        onClose={() => setRemoving(null)}
      />
    </View>
  );
}

function SummaryTile({ icon, value, label }: { icon: typeof Users; value: string; label: string }) {
  return (
    <View
      accessible
      accessibilityLabel={`${label}: ${value === "—" ? "not applicable" : value}`}
      style={tw`flex-1 bg-surface p-3 border border-border rounded-2xl gap-1`}
    >
      <Icon as={icon} size="md" color="primary" />
      <AppText style={tw`text-20 font-bold text-ink`}>{value}</AppText>
      <AppText variant="footnote">{label}</AppText>
    </View>
  );
}

function LearnerRow({ learner, onRemove }: { learner: CourseLearner; onRemove: () => void }) {
  const name = displayName(learner);
  const progress =
    learner.lessonsTotal === 0
      ? "Quiz-only course"
      : finished(learner)
        ? "Completed"
        : `${learner.lessonsDone}/${learner.lessonsTotal} lessons`;

  return (
    <View style={tw`flex-row items-center gap-3 bg-surface border border-border rounded-2xl p-3`}>
      <Avatar imageUrl={learner.avatarUrl} name={name} size="sm" />
      <View style={tw`flex-1 gap-1`}>
        <AppText variant="callout-strong" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="footnote">{joined(learner.enrolledAt)}</AppText>
        {learner.lessonsTotal > 0 ? (
          <View style={tw`flex-row items-center gap-2`}>
            <View style={tw`flex-1`}>
              <ProgressBar progress={fraction(learner)} size="sm" />
            </View>
            <AppText variant="footnote" style={finished(learner) ? tw`text-success-deep font-semibold` : undefined}>
              {progress}
            </AppText>
          </View>
        ) : (
          <AppText variant="footnote">{progress}</AppText>
        )}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${name}`}
        hitSlop={6}
        onPress={onRemove}
        style={({ pressed }) => [tw`w-9 h-9 rounded-lg items-center justify-center`, pressScale(pressed, 0.9)]}
      >
        <Icon as={Trash2} size="sm" color="danger" />
      </Pressable>
    </View>
  );
}
