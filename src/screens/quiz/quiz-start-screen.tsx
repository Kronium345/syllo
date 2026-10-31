import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Infinity as InfinityIcon, Layers, ListChecks, Lock, Timer } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Switch, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { OptionCard } from "@/components/ui/option-card";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { type QuizStart, useQuizStart, useSessionsLeft, useStartAttempt } from "@/lib/queries/quizzes";
import { QuizLimitError } from "@/services/errors";
import { color, tw } from "@/theme";

import { goBackOr } from "./navigation";

/** The session sizes on offer; "All" is always there, the others only when the topic is bigger. */
const LENGTHS = [
  { count: 10, icon: ListChecks, title: "Quick practice", description: "10 questions" },
  { count: 20, icon: Layers, title: "Standard", description: "20 questions" },
] as const;

/** Quiz start (prompts/09; not in the prototype, built in its style): length, timer, free limit. */
export function QuizStartScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paddingTop = useTopPadding(48);
  const quiz = useQuizStart(id);

  return (
    <View style={tw`flex-1 bg-surface`}>
      <View style={[tw`px-screen pb-6 flex-row`, { paddingTop }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => goBackOr("/home")} />
      </View>
      {quiz.isPending ? (
        <View accessibilityRole="progressbar" accessibilityLabel="Loading quiz" style={tw`flex-1 items-center justify-center`}>
          <ActivityIndicator color={color("muted")} />
        </View>
      ) : quiz.isError ? (
        <Pressable accessibilityRole="button" onPress={() => quiz.refetch()} style={tw`flex-1 items-center justify-center gap-2`}>
          <AppText variant="callout">Couldn&apos;t load this quiz.</AppText>
          <AppText style={tw`text-14 font-semibold text-primary`}>{quiz.isFetching ? "Trying again…" : "Try again"}</AppText>
        </Pressable>
      ) : !quiz.data ? (
        <View style={tw`flex-1 items-center justify-center px-screen`}>
          <AppText variant="callout">This quiz isn&apos;t available.</AppText>
        </View>
      ) : (
        <StartBody quiz={quiz.data} />
      )}
    </View>
  );
}

function StartBody({ quiz }: { quiz: QuizStart }) {
  const sessions = useSessionsLeft();
  const start = useStartAttempt();
  const lengths = LENGTHS.filter((option) => option.count < quiz.questionCount);
  const [picked, setCount] = useState<number | null>(lengths[0]?.count ?? null);
  const [timed, setTimed] = useState(false);
  // A size the topic can't fill (e.g. after a refetch) falls back to "All".
  const count = picked !== null && picked < quiz.questionCount ? picked : null;

  const left = sessions.data;
  const atLimit = left === 0;

  const begin = () => {
    if (atLimit) {
      router.push("/premium");
      return;
    }
    start.mutate(
      { quizId: quiz.id, count, timed },
      {
        onSuccess: (attemptId) => router.push({ pathname: "/attempt/[id]", params: { id: attemptId } }),
        onError: (error) => {
          if (error instanceof QuizLimitError) {
            toast.info("Daily limit reached", "Upgrade to Pro for unlimited quizzes.");
            router.push("/premium");
          } else {
            toast.error("Couldn't start the quiz.", "Check your connection and try again.");
          }
        },
      },
    );
  };

  if (quiz.locked) {
    return (
      <View style={tw`flex-1 items-center justify-center gap-3 px-screen`}>
        <Icon as={Lock} size="xl" color="faint" />
        <AppText variant="heading" style={tw`text-center`}>
          {quiz.title}
        </AppText>
        <AppText variant="callout" style={tw`text-center`}>
          Enroll in the course to take this quiz. Enrolling is free.
        </AppText>
        <Button
          title="Go to the course"
          variant="outline"
          onPress={() => router.replace({ pathname: "/course/[id]", params: { id: quiz.courseId } })}
          style={tw`self-stretch mt-3`}
        />
      </View>
    );
  }

  return (
    <>
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-screen pb-6`}>
        <View style={tw`mb-8 mt-4`}>
          <AppText variant="title-xl" accessibilityRole="header" style={tw`mb-3`}>
            {quiz.title}
          </AppText>
          <AppText variant="subtitle">
            {quiz.questionCount} {quiz.questionCount === 1 ? "question" : "questions"}
            {quiz.lastScore ? ` · Last score ${quiz.lastScore.correct}/${quiz.lastScore.total}` : ""}
          </AppText>
        </View>

        <AppText variant="caption-strong" style={tw`mb-3 text-muted`}>
          How many questions?
        </AppText>
        <View accessibilityRole="radiogroup" style={tw`gap-4 mb-8`}>
          {lengths.map((option) => (
            <OptionCard
              key={option.count}
              icon={option.icon}
              title={option.title}
              description={option.description}
              selected={count === option.count}
              onPress={() => setCount(option.count)}
            />
          ))}
          <OptionCard
            icon={InfinityIcon}
            title="Full topic"
            description={`All ${quiz.questionCount} questions`}
            selected={count === null}
            onPress={() => setCount(null)}
          />
        </View>

        <View style={tw`p-5 border border-border rounded-2xl flex-row items-center gap-4`}>
          <View style={tw`w-12 h-12 rounded-xl bg-primary-tint items-center justify-center`}>
            <Icon as={Timer} size="xl" color="primary" />
          </View>
          <View style={tw`flex-1`}>
            <AppText variant="option">15-second timer</AppText>
            <AppText variant="callout">Unanswered in time counts as skipped</AppText>
          </View>
          <Switch
            accessibilityLabel="15-second timer"
            value={timed}
            onValueChange={setTimed}
            trackColor={{ false: color("track"), true: color("primary") }}
            thumbColor={color("white")}
            ios_backgroundColor={color("track")}
          />
        </View>
      </ScrollView>

      <StickyFooter>
        {quiz.unfinished ? (
          <Button
            title={`Continue quiz (${quiz.unfinished.answered}/${quiz.unfinished.total})`}
            variant="outline"
            onPress={() => router.push({ pathname: "/attempt/[id]", params: { id: quiz.unfinished?.id ?? "" } })}
            style={tw`mb-3`}
          />
        ) : null}
        <Button
          title={atLimit ? "Upgrade for unlimited quizzes" : "Start Quiz"}
          loading={start.isPending}
          disabled={quiz.questionCount === 0}
          onPress={begin}
        />
        <AppText variant="footnote" style={tw`text-center mt-3`}>
          {sessions.isPending
            ? " "
            : left === null
              ? "Unlimited with Pro"
              : left === undefined
                ? "3 free quizzes a day"
                : `${left} of 3 free quizzes left today`}
        </AppText>
      </StickyFooter>
    </>
  );
}
