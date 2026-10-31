import { router, useLocalSearchParams } from "expo-router";
import { CircleCheck, CircleMinus, CircleX, type LucideIcon, Trophy } from "lucide-react-native";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { useAttempt } from "@/lib/queries/quizzes";
import { color, type ColorToken, tw } from "@/theme";

/** Points per correct answer, as in the older app (computed, not stored). */
const POINTS_PER_CORRECT = 10;

/** Quiz results (prompts/09; not in the prototype, built in its style). */
export function QuizResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paddingTop = useTopPadding(56);
  const attempt = useAttempt(id);

  if (attempt.isPending) {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Loading results" style={tw`flex-1 bg-surface items-center justify-center`}>
        <ActivityIndicator color={color("muted")} />
      </View>
    );
  }
  if (attempt.isError || !attempt.data) {
    return (
      <Pressable accessibilityRole="button" onPress={() => attempt.refetch()} style={tw`flex-1 bg-surface items-center justify-center gap-2`}>
        <AppText variant="callout">Couldn&apos;t load your results.</AppText>
        <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
      </Pressable>
    );
  }

  const { correct, wrong, total, quizId, courseId, quizTitle } = attempt.data;
  // Until finish has refetched, skipped = everything not answered yet.
  const skipped = Math.max(0, total - correct - wrong);
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <ScrollView style={tw`flex-1`} contentContainerStyle={[tw`px-screen pb-6 items-center`, { paddingTop }]}>
        <View style={tw`w-20 h-20 rounded-full bg-primary-soft items-center justify-center mb-6 mt-6`}>
          <Icon as={Trophy} size="2xl" color="primary" />
        </View>
        <AppText variant="badge" style={tw`mb-2`}>
          {quizTitle}
        </AppText>
        <AppText variant="display" accessibilityRole="header" style={tw`mb-1`}>
          {correct}/{total}
        </AppText>
        <AppText variant="lead" style={tw`mb-2`}>
          {percent}% correct
        </AppText>
        <View style={tw`px-3 py-1.5 rounded-full bg-streak-tint border border-streak-line mb-8`}>
          <AppText style={tw`text-14 font-bold text-streak-deep`}>+{correct * POINTS_PER_CORRECT} points</AppText>
        </View>

        <View style={tw`flex-row gap-3 self-stretch`}>
          <Tile icon={CircleCheck} tint="success" value={correct} label="Correct" />
          <Tile icon={CircleX} tint="danger" value={wrong} label="Wrong" />
          <Tile icon={CircleMinus} tint="muted" value={skipped} label="Skipped" />
        </View>
      </ScrollView>

      <StickyFooter>
        <Button
          title="Review answers"
          onPress={() => router.push({ pathname: "/attempt/[id]/review", params: { id: attempt.data?.id ?? "" } })}
          style={tw`mb-3`}
        />
        <View style={tw`flex-row gap-3`}>
          <Button
            title="Retake quiz"
            variant="outline"
            onPress={() => router.replace({ pathname: "/quiz/[id]", params: { id: quizId } })}
            style={tw`flex-1`}
          />
          <Button
            title="Back to course"
            variant="outline"
            onPress={() =>
              courseId
                ? router.dismissTo({ pathname: "/course/[id]", params: { id: courseId } })
                : router.replace("/home")
            }
            style={tw`flex-1`}
          />
        </View>
      </StickyFooter>
    </View>
  );
}

function Tile({ icon, tint, value, label }: { icon: LucideIcon; tint: ColorToken; value: number; label: string }) {
  return (
    <View style={tw`flex-1 bg-surface p-4 border border-border rounded-2xl shadow-card items-center`}>
      <View style={tw`mb-2`}>
        <Icon as={icon} size="xl" color={tint} />
      </View>
      <AppText style={tw`text-20 font-bold text-ink`}>{value}</AppText>
      <AppText variant="footnote">{label}</AppText>
    </View>
  );
}
