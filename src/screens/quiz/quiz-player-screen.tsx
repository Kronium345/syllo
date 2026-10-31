import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Bookmark, ExternalLink, Lightbulb, Timer, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/ui/sheet";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useTopPadding } from "@/components/ui/use-top-padding";
import {
  type Attempt,
  useAnswerQuestion,
  useAttempt,
  useFinishAttempt,
  useFlags,
  useSetFlag,
} from "@/lib/queries/quizzes";
import { answerLetter, seededShuffle } from "@/lib/quiz/shuffle";
import { color, tw } from "@/theme";

import { type AnswerState, AnswerCard } from "./answer-card";

/** Seconds per question when the attempt is timed (the older app's 15s). */
const QUESTION_SECONDS = 15;

/** The quiz player (prompts/09; not in the prototype, built in its style). */
export function QuizPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const attempt = useAttempt(id);

  if (attempt.isPending) {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Loading quiz" style={tw`flex-1 bg-surface items-center justify-center`}>
        <ActivityIndicator color={color("muted")} />
      </View>
    );
  }
  if (attempt.isError) {
    return (
      <Pressable accessibilityRole="button" onPress={() => attempt.refetch()} style={tw`flex-1 bg-surface items-center justify-center gap-2`}>
        <AppText variant="callout">Couldn&apos;t load this quiz.</AppText>
        <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
      </Pressable>
    );
  }
  if (!attempt.data || attempt.data.questions.length === 0) {
    return (
      <View style={tw`flex-1 bg-surface items-center justify-center gap-4 px-screen`}>
        <AppText variant="callout">This quiz isn&apos;t available.</AppText>
        <Button title="Go back" variant="outline" onPress={() => router.back()} style={tw`self-stretch`} />
      </View>
    );
  }
  if (attempt.data.finished) {
    return <Redirect href={{ pathname: "/attempt/[id]/results", params: { id: attempt.data.id } }} />;
  }
  return <Player attempt={attempt.data} />;
}

function Player({ attempt }: { attempt: Attempt }) {
  const paddingTop = useTopPadding(48);
  const answer = useAnswerQuestion();
  const finish = useFinishAttempt();
  const flags = useFlags();
  const setFlag = useSetFlag();
  const [ending, setEnding] = useState(false);

  // Start at the first unanswered question (resuming picks up where it stopped).
  const [index, setIndex] = useState(() => {
    const first = attempt.questions.findIndex((question) => !attempt.given[question.id]);
    return first === -1 ? attempt.questions.length - 1 : first;
  });
  const question = attempt.questions[index];
  const given = attempt.given[question.id];
  const isLast = index === attempt.questions.length - 1;
  const answers = useMemo(() => seededShuffle(question.answers, `${attempt.id}:${question.id}`), [attempt.id, question]);
  const flagged = flags.data?.has(question.id) ?? false;

  const submit = (answerId: string | null) => {
    if (given || answer.isPending) return;
    answer.mutate(
      { attemptId: attempt.id, questionId: question.id, answerId },
      { onError: () => toast.error("Couldn't save your answer.", "Check your connection and try again.") },
    );
  };

  const toResults = () =>
    finish.mutate(attempt.id, {
      onSuccess: () => router.replace({ pathname: "/attempt/[id]/results", params: { id: attempt.id } }),
      onError: () => toast.error("Couldn't finish the quiz.", "Check your connection and try again."),
    });

  // The timer: 15s per unanswered question; running out submits a skip.
  const [tick, setTick] = useState({ questionId: question.id, left: QUESTION_SECONDS });
  const secondsLeft = tick.questionId === question.id ? tick.left : QUESTION_SECONDS;
  const [timedOut, setTimedOut] = useState<string | null>(null);
  const submitRef = useRef(submit);
  useEffect(() => {
    submitRef.current = submit;
  });
  useEffect(() => {
    if (!attempt.timed || given) return;
    const questionId = question.id;
    const started = Date.now();
    const timer = setInterval(() => {
      const left = Math.max(0, QUESTION_SECONDS - Math.floor((Date.now() - started) / 1000));
      setTick({ questionId, left });
      if (left === 0) {
        clearInterval(timer);
        setTimedOut(questionId);
        submitRef.current(null);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [attempt.timed, given, question.id]);

  const stateOf = (answerId: string): AnswerState => {
    if (!given) return "idle";
    if (answerId === given.correctAnswerId) return "correct";
    if (answerId === given.answerId) return "wrong";
    return "dimmed";
  };

  return (
    <View style={tw`flex-1 bg-surface`}>
      <View style={[tw`px-screen pb-6 flex-row items-center gap-3`, { paddingTop }]}>
        <IconButton icon={X} accessibilityLabel="End quiz" onPress={() => setEnding(true)} />
        <View style={tw`flex-1 mx-2`}>
          <ProgressBar progress={(index + (given ? 1 : 0)) / attempt.questions.length} size="md" />
        </View>
        <AppText style={tw`text-13 font-semibold text-muted`}>
          {index + 1}/{attempt.questions.length}
        </AppText>
        {attempt.timed ? (
          <View
            accessibilityLabel={`${secondsLeft} seconds left`}
            style={tw.style(
              "flex-row items-center gap-1 px-2.5 py-1.5 rounded-full border",
              secondsLeft <= 5 && !given ? "bg-danger-tint border-danger-line" : "bg-subtle border-border",
            )}
          >
            <Icon as={Timer} size="sm" color={secondsLeft <= 5 && !given ? "danger" : "muted"} />
            <AppText style={tw.style("text-13 font-bold", secondsLeft <= 5 && !given ? "text-danger-deep" : "text-ink")}>
              {given ? "–" : `${secondsLeft}s`}
            </AppText>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={flagged ? "Remove flag" : "Flag for review"}
          accessibilityState={{ selected: flagged }}
          hitSlop={8}
          onPress={() =>
            setFlag.mutate(
              { questionId: question.id, flagged: !flagged },
              { onError: () => toast.error("Couldn't update the flag.") },
            )
          }
        >
          <Icon as={Bookmark} size="lg" color={flagged ? "primary" : "muted"} filled={flagged} />
        </Pressable>
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-screen pb-6`}>
        <AppText accessibilityRole="header" style={tw`text-20 font-bold text-ink leading-snug mb-6`}>
          {question.prompt}
        </AppText>
        <View style={tw`gap-3`}>
          {answers.map((option, answerIndex) => (
            <AnswerCard
              key={option.id}
              letter={answerLetter(answerIndex)}
              text={option.text}
              state={stateOf(option.id)}
              disabled={answer.isPending}
              onPress={() => submit(option.id)}
            />
          ))}
        </View>

        {given ? (
          <View style={tw`mt-6 gap-3`}>
            <AppText style={tw.style("text-16 font-bold", given.isCorrect ? "text-success-deep" : "text-danger-deep")}>
              {given.isCorrect ? "Correct!" : given.answerId ? "Not quite." : timedOut === question.id ? "Time's up." : "Skipped."}
            </AppText>
            {question.explanation ? (
              <Card style={tw`p-4 bg-subtle`}>
                <View style={tw`flex-row gap-3`}>
                  <Icon as={Lightbulb} size="lg" color="primary" />
                  <AppText variant="body" style={tw`flex-1 text-ink`}>
                    {question.explanation}
                  </AppText>
                </View>
                {question.referenceUrl ? (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => WebBrowser.openBrowserAsync(question.referenceUrl ?? "").catch(() => undefined)}
                    style={tw`flex-row items-center gap-1.5 mt-3 ml-8`}
                  >
                    <AppText style={tw`text-14 font-semibold text-primary`}>Read more</AppText>
                    <Icon as={ExternalLink} size="sm" color="primary" />
                  </Pressable>
                ) : null}
              </Card>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <StickyFooter>
        {given ? (
          <Button
            title={isLast ? "See results" : "Next question"}
            loading={finish.isPending}
            onPress={() => (isLast ? toResults() : setIndex(index + 1))}
          />
        ) : (
          <Button title="Skip" variant="outline" loading={answer.isPending} onPress={() => submit(null)} />
        )}
      </StickyFooter>

      <Sheet
        visible={ending}
        onClose={() => setEnding(false)}
        title="End quiz?"
        footer={
          <View style={tw`flex-row gap-3`}>
            <Button title="Keep going" variant="outline" onPress={() => setEnding(false)} style={tw`flex-1`} />
            <Button
              title="End quiz"
              variant="danger"
              loading={finish.isPending}
              onPress={() => {
                setEnding(false);
                toResults();
              }}
              style={tw`flex-1`}
            />
          </View>
        }
      >
        <AppText variant="body" style={tw`text-ink`}>
          Unanswered questions count as skipped.
        </AppText>
      </Sheet>
    </View>
  );
}
