import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { Mic, Volume2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { canSubmit, RecorderBar } from "@/components/ui/recorder-bar";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { showBanner } from "@/lib/notifications/banner";
import {
  type VivaReason,
  type VivaSession,
  useFinishViva,
  useSubmitVivaAnswer,
  useVivaSession,
} from "@/lib/queries/viva";
import { RECORDING_MIME, VIVA_MAX_SECONDS } from "@/lib/speaking/recording";
import { useAnswerRecorder } from "@/lib/speaking/use-answer-recorder";
import { AlreadyAnsweredError, NoAnswerError, NotAllowedError } from "@/services/errors";
import { color, tw } from "@/theme";

import { ReportFeedbackSheet } from "./report-feedback-sheet";
import { VivaFeedbackCard } from "./viva-feedback-card";

export const REASON_LABELS: Record<VivaReason, string> = {
  wrong: "You got this wrong",
  skipped: "Skipped",
  flagged: "Flagged",
  review: "Explain why you were right",
};

/** Average score of the graded answers, rounded to one decimal (null when none). */
export function averageScore(session: VivaSession): number | null {
  const scores = session.questions.flatMap((question) => (question.feedback ? [question.feedback.score] : []));
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
}

/** Viva practice (prompts/17; not in the design, built in the quiz screens' style). */
export function VivaPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useVivaSession(id);

  if (session.isPending) {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Loading viva" style={tw`flex-1 bg-surface items-center justify-center`}>
        <ActivityIndicator color={color("muted")} />
      </View>
    );
  }
  if (session.isError) {
    return (
      <Pressable accessibilityRole="button" onPress={() => session.refetch()} style={tw`flex-1 bg-surface items-center justify-center gap-2`}>
        <AppText variant="callout">Couldn&apos;t load your viva.</AppText>
        <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
      </Pressable>
    );
  }
  if (!session.data) {
    return (
      <View style={tw`flex-1 bg-surface items-center justify-center gap-4 px-screen`}>
        <AppText variant="callout">This viva isn&apos;t available.</AppText>
        <Button title="Go back" variant="outline" onPress={() => router.back()} style={tw`self-stretch`} />
      </View>
    );
  }
  if (session.data.finished) {
    return <Redirect href={{ pathname: "/viva/[id]/results", params: { id: session.data.id } }} />;
  }
  return <VivaPlayer session={session.data} onRefetch={() => session.refetch()} />;
}

function VivaPlayer({ session, onRefetch }: { session: VivaSession; onRefetch: () => void }) {
  const paddingTop = useTopPadding(48);
  const total = session.questions.length;
  // Resume at the first question without feedback.
  const [index, setIndex] = useState(() => {
    const next = session.questions.findIndex((question) => !question.feedback);
    return next === -1 ? total - 1 : next;
  });
  const question = session.questions[index];
  const isLast = index === total - 1;
  const [reporting, setReporting] = useState<{ sessionId: string; questionId: string } | null>(null);
  const submit = useSubmitVivaAnswer();
  const finish = useFinishViva();
  const recorder = useAnswerRecorder(VIVA_MAX_SECONDS);
  const { take } = recorder;

  // Read each question aloud once; stop speaking when it changes or the screen closes.
  const prompt = question.feedback ? null : question.prompt;
  useEffect(() => {
    if (!prompt) return;
    Speech.speak(prompt, { language: "en-GB" });
    return () => {
      Speech.stop();
    };
  }, [prompt]);

  const submitAnswer = async () => {
    const upload = await recorder.prepareUpload();
    if (!upload) return;
    submit.mutate(
      {
        sessionId: session.id,
        questionId: question.questionId,
        audio: upload.audio,
        mimeType: RECORDING_MIME,
        durationMs: upload.durationMs,
      },
      {
        onSuccess: () => recorder.clear(upload.uri),
        onError: (error) => {
          if (error instanceof NoAnswerError) {
            recorder.clear(upload.uri);
            toast.info("We couldn't hear an answer.", "Try again.");
          } else if (error instanceof AlreadyAnsweredError) {
            recorder.clear(upload.uri);
            onRefetch();
          } else if (error instanceof NotAllowedError) {
            toast.error("You can't answer this question.", error.message);
          } else {
            // Keep the recording so it can be sent again.
            toast.error("Couldn't mark your answer.", "Check your connection and try again.");
          }
        },
      },
    );
  };

  const goNext = () => {
    recorder.discard();
    setIndex((value) => Math.min(value + 1, total - 1));
  };

  const finishViva = () => {
    recorder.discard();
    Speech.stop();
    // mutateAsync: finishing refetches the session, whose `finished` redirects this screen
    // before per-call callbacks would run.
    finish.mutateAsync(session.id).then(
      () => {
        const average = averageScore(session);
        showBanner({
          title: "Viva complete",
          message: average === null ? "No answers marked" : `Average ${average}/10`,
          icon: Mic,
        });
        router.replace({ pathname: "/viva/[id]/results", params: { id: session.id } });
      },
      () => toast.error("Couldn't finish the viva.", "Check your connection and try again."),
    );
  };

  return (
    <View style={tw`flex-1 bg-surface`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton icon={X} accessibilityLabel="Close viva" onPress={() => router.back()} />
        <View style={tw`flex-1`}>
          <AppText variant="heading" accessibilityRole="header">
            Viva practice
          </AppText>
          <AppText variant="caption">
            Question {index + 1} of {total}
          </AppText>
        </View>
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-screen pb-6 gap-5`}>
        <Badge label={REASON_LABELS[question.reason]} style={tw`self-start`} />
        <Card style={tw`p-5 gap-3`}>
          <AppText style={tw`text-17 font-semibold text-ink leading-relaxed`}>{question.prompt}</AppText>
          {question.feedback ? null : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Read the question aloud again"
              onPress={() => {
                Speech.stop();
                Speech.speak(question.prompt, { language: "en-GB" });
              }}
              style={tw`flex-row items-center gap-2 self-start`}
            >
              <Icon as={Volume2} size="md" color="primary" />
              <AppText style={tw`text-14 font-semibold text-primary`}>Read it again</AppText>
            </Pressable>
          )}
        </Card>

        {question.feedback ? (
          <VivaFeedbackCard
            feedback={question.feedback}
            referenceUrl={question.referenceUrl}
            onReport={() => setReporting({ sessionId: session.id, questionId: question.questionId })}
          />
        ) : null}
      </ScrollView>

      <StickyFooter>
        {/* The recorder lives in the footer so it's on screen however long the question is. */}
        {question.feedback ? null : (
          <RecorderBar
            take={take}
            elapsedMs={recorder.elapsedMs}
            maxSeconds={VIVA_MAX_SECONDS}
            marking={submit.isPending}
            hint="Explain your reasoning, up to 2 minutes"
            onStart={recorder.start}
            onStop={recorder.stop}
          />
        )}
        {question.feedback ? (
          <Button
            title={isLast ? "See results" : "Next question"}
            loading={isLast && finish.isPending}
            onPress={isLast ? finishViva : goNext}
          />
        ) : take.phase === "recorded" ? (
          <Button
            title="Submit answer"
            disabled={!canSubmit(take)}
            loading={submit.isPending}
            onPress={submitAnswer}
          />
        ) : (
          <Button
            title={isLast ? "Finish" : "Skip question"}
            variant="outline"
            disabled={take.phase === "recording" || take.phase === "starting" || submit.isPending}
            loading={isLast && finish.isPending}
            onPress={isLast ? finishViva : goNext}
          />
        )}
      </StickyFooter>

      <ReportFeedbackSheet target={reporting} onClose={() => setReporting(null)} />
    </View>
  );
}
