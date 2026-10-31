import { router, useLocalSearchParams } from "expo-router";
import { Bookmark, ChevronLeft, Lightbulb } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from "react-native";

import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { type Attempt, type AttemptQuestion, useAttempt, useFlags } from "@/lib/queries/quizzes";
import { answerLetter, seededShuffle } from "@/lib/quiz/shuffle";
import { color, tw } from "@/theme";

import { AnswerCard } from "./answer-card";

type Filter = "all" | "correct" | "incorrect" | "skipped" | "flagged";
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "correct", label: "Correct" },
  { id: "incorrect", label: "Incorrect" },
  { id: "skipped", label: "Skipped" },
  { id: "flagged", label: "Flagged" },
];

/** Review answers (prompts/09; not in the prototype, built in its style). */
export function QuizReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paddingTop = useTopPadding(48);
  const attempt = useAttempt(id);
  const flags = useFlags();
  const [filter, setFilter] = useState<Filter>("all");

  const matches = (data: Attempt, question: AttemptQuestion) => {
    const given = data.given[question.id];
    switch (filter) {
      case "correct":
        return !!given?.isCorrect;
      case "incorrect":
        return !!given && !!given.answerId && !given.isCorrect;
      case "skipped":
        return !given || !given.answerId;
      case "flagged":
        return flags.data?.has(question.id) ?? false;
      default:
        return true;
    }
  };

  return (
    <View style={tw`flex-1 bg-surface`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <AppText variant="title" accessibilityRole="header" style={tw`flex-1`}>
          Review answers
        </AppText>
      </View>

      {attempt.isPending ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading answers" style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={color("muted")} />
        </View>
      ) : attempt.isError || !attempt.data ? (
        <Pressable accessibilityRole="button" onPress={() => attempt.refetch()} style={tw`flex-1 items-center justify-center gap-2`}>
          <AppText variant="callout">Couldn&apos;t load your answers.</AppText>
          <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
        </Pressable>
      ) : (
        <FlatList
          data={attempt.data.questions.filter((question) => attempt.data && matches(attempt.data, question))}
          keyExtractor={(question) => question.id}
          ListHeaderComponent={
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2 px-screen pb-4`}>
              {FILTERS.map((option) => (
                <Chip key={option.id} label={option.label} selected={filter === option.id} onPress={() => setFilter(option.id)} />
              ))}
            </ScrollView>
          }
          renderItem={({ item }) => <ReviewCard attempt={attempt.data as Attempt} question={item} flagged={flags.data?.has(item.id) ?? false} />}
          ItemSeparatorComponent={() => <View style={tw`h-4`} />}
          ListEmptyComponent={
            <AppText variant="callout" style={tw`py-16 text-center`}>
              No questions here.
            </AppText>
          }
          contentContainerStyle={tw`pb-10`}
        />
      )}
    </View>
  );
}

function ReviewCard({ attempt, question, flagged }: { attempt: Attempt; question: AttemptQuestion; flagged: boolean }) {
  const given = attempt.given[question.id];
  const answers = seededShuffle(question.answers, `${attempt.id}:${question.id}`);
  return (
    <View style={tw`mx-screen p-5 border border-border rounded-2xl bg-surface`}>
      <View style={tw`flex-row items-start gap-3 mb-4`}>
        <AppText style={tw`flex-1 text-16 font-bold text-ink leading-snug`}>
          {question.position}. {question.prompt}
        </AppText>
        {flagged ? <Icon as={Bookmark} size="md" color="primary" filled /> : null}
      </View>
      <View style={tw`gap-2`}>
        {answers
          .map((option, index) => ({ option, letter: answerLetter(index) }))
          .filter(({ option }) => option.id === given?.correctAnswerId || option.id === given?.answerId)
          .map(({ option, letter }) => (
            <AnswerCard
              key={option.id}
              letter={letter}
              text={option.text}
              state={option.id === given?.correctAnswerId ? "correct" : "wrong"}
              disabled
            />
          ))}
      </View>
      {!given || !given.answerId ? (
        <AppText variant="caption" style={tw`mt-3`}>
          {given ? "Skipped." : "Not answered."}
          {given ? "" : " The answer shows once a question is answered or skipped."}
        </AppText>
      ) : null}
      {given && question.explanation ? (
        <View style={tw`flex-row gap-3 mt-4 p-4 rounded-xl bg-subtle`}>
          <Icon as={Lightbulb} size="lg" color="primary" />
          <AppText variant="body" style={tw`flex-1 text-ink`}>
            {question.explanation}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
