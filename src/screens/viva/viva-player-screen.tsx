import {
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { Mic, Square, Volume2, X } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
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
import {
  deleteRecording,
  formatSeconds,
  MAX_SECONDS,
  MIN_SECONDS,
  NO_READING_DB,
  QUIET_PEAK_DB,
  readBase64,
  RECORDING_MIME,
  VIVA_RECORDING,
} from "@/lib/viva/recording";
import { AlreadyAnsweredError, NoAnswerError, NotAllowedError } from "@/services/errors";
import { color, pressScale, tw } from "@/theme";

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

type Take =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "recording"; startedAt: number }
  | { phase: "recorded"; uri: string; durationMs: number; peakDb: number };

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
  const [take, setTake] = useState<Take>({ phase: "idle" });
  const [reporting, setReporting] = useState<{ sessionId: string; questionId: string } | null>(null);
  const submit = useSubmitVivaAnswer();
  const finish = useFinishViva();

  // The loudest level heard in the current recording (dBFS), for the silence check.
  const peakRef = useRef(NO_READING_DB);
  // The recorder stops itself at MAX_SECONDS; its status event then hands over the file.
  // (A manual stop moves the take out of "recording" first, so this ignores it.)
  const recorder = useAudioRecorder(VIVA_RECORDING, (status) => {
    if (!status.isFinished || !status.url) return;
    const uri = status.url;
    const now = Date.now();
    const peakDb = peakRef.current;
    setTake((current) =>
      current.phase === "recording" ? { phase: "recorded", uri, durationMs: now - current.startedAt, peakDb } : current,
    );
  });
  // The latest take, for the unmount cleanup below.
  const takeRef = useRef(take);
  useEffect(() => {
    takeRef.current = take;
  }, [take]);
  const recorderState = useAudioRecorderState(recorder, 250);

  const metering = recorderState.metering;
  const recording = take.phase === "recording";
  useEffect(() => {
    if (recording && metering !== undefined) peakRef.current = Math.max(peakRef.current, metering);
  }, [recording, metering]);

  // Read each question aloud once; stop speaking when it changes or the screen closes.
  const prompt = question.feedback ? null : question.prompt;
  useEffect(() => {
    if (!prompt) return;
    Speech.speak(prompt, { language: "en-GB" });
    return () => {
      Speech.stop();
    };
  }, [prompt]);

  // Leaving: release the mic and throw away anything not sent.
  useEffect(
    () => () => {
      const current = takeRef.current;
      if (current.phase === "recording") recorder.stop().catch(() => undefined);
      if (current.phase === "recorded") deleteRecording(current.uri);
      setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    },
    [recorder],
  );

  const discardTake = () => {
    if (take.phase === "recorded") deleteRecording(take.uri);
    setTake({ phase: "idle" });
  };

  const startRecording = async () => {
    Speech.stop();
    if (take.phase === "recorded") deleteRecording(take.uri);
    setTake({ phase: "starting" });
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setTake({ phase: "idle" });
        toast.info("Microphone is off for Syllo", "Allow it in your phone's settings to answer out loud.");
        if (!permission.canAskAgain) Linking.openSettings().catch(() => undefined);
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      peakRef.current = NO_READING_DB;
      recorder.record({ forDuration: MAX_SECONDS });
      setTake({ phase: "recording", startedAt: Date.now() });
    } catch {
      setTake({ phase: "idle" });
      toast.error("Couldn't start recording.", "Try again.");
    }
  };

  const stopRecording = async () => {
    if (take.phase !== "recording") return;
    const durationMs = recorderState.durationMillis || Date.now() - take.startedAt;
    const peakDb = peakRef.current;
    // Mark it stopped first so the recorder's own "finished" event doesn't handle it too.
    setTake({ phase: "starting" });
    try {
      await recorder.stop();
      if (!recorder.uri) throw new Error("No recording");
      setTake({ phase: "recorded", uri: recorder.uri, durationMs, peakDb });
    } catch {
      setTake({ phase: "idle" });
      toast.error("Couldn't save the recording.", "Try again.");
    }
  };

  const submitAnswer = async () => {
    if (take.phase !== "recorded") return;
    const { uri, durationMs, peakDb } = take;
    // Never louder than background noise: don't upload (or spend a try on) a silent recording.
    // NO_READING_DB means the phone gave no level, so the server's check decides.
    if (peakDb !== NO_READING_DB && peakDb < QUIET_PEAK_DB) {
      deleteRecording(uri);
      setTake({ phase: "idle" });
      toast.info("We couldn't hear you.", "Hold the phone closer and answer out loud.");
      return;
    }
    let audio: string;
    try {
      audio = await readBase64(uri);
    } catch {
      setTake({ phase: "idle" });
      toast.error("Couldn't read the recording.", "Record your answer again.");
      return;
    }
    submit.mutate(
      { sessionId: session.id, questionId: question.questionId, audio, mimeType: RECORDING_MIME, durationMs },
      {
        onSuccess: () => {
          deleteRecording(uri);
          setTake({ phase: "idle" });
        },
        onError: (error) => {
          if (error instanceof NoAnswerError) {
            deleteRecording(uri);
            setTake({ phase: "idle" });
            toast.info("We couldn't hear an answer.", "Try again.");
          } else if (error instanceof AlreadyAnsweredError) {
            deleteRecording(uri);
            setTake({ phase: "idle" });
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
    discardTake();
    setIndex((value) => Math.min(value + 1, total - 1));
  };

  const finishViva = () => {
    discardTake();
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

  const recordedSeconds = take.phase === "recorded" ? take.durationMs / 1000 : 0;
  const elapsedMs = take.phase === "recording" ? recorderState.durationMillis : 0;

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
        {question.feedback ? null : submit.isPending ? (
          <View accessibilityRole="progressbar" style={tw`flex-row items-center gap-4 mb-5`}>
            <View style={tw`w-16 h-16 rounded-full bg-primary-soft items-center justify-center`}>
              <ActivityIndicator color={color("primary")} />
            </View>
            <AppText variant="callout" style={tw`flex-1`}>
              Marking your answer…
            </AppText>
          </View>
        ) : (
          <View style={tw`flex-row items-center gap-4 mb-5`}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={take.phase === "recording" ? "Stop recording" : "Record your answer"}
              disabled={take.phase === "starting"}
              onPress={take.phase === "recording" ? stopRecording : startRecording}
              style={({ pressed }) => [
                tw.style(
                  "w-16 h-16 rounded-full items-center justify-center shadow-card",
                  take.phase === "recording" ? "bg-danger" : "bg-primary",
                ),
                pressScale(pressed, 0.95),
              ]}
            >
              {take.phase === "starting" ? (
                <ActivityIndicator color={color("on-primary")} />
              ) : (
                <Icon as={take.phase === "recording" ? Square : Mic} size="xl" color="on-primary" />
              )}
            </Pressable>
            <View style={tw`flex-1 gap-0.5`}>
              {take.phase === "recording" ? (
                <>
                  <AppText accessibilityLiveRegion="polite" style={tw`text-20 font-bold text-ink`}>
                    {formatSeconds(elapsedMs)} / {formatSeconds(MAX_SECONDS * 1000)}
                  </AppText>
                  <AppText variant="caption">Recording… tap to stop</AppText>
                </>
              ) : take.phase === "recorded" ? (
                <>
                  <AppText style={tw`text-17 font-bold text-ink`}>{formatSeconds(take.durationMs)} recorded</AppText>
                  <AppText variant="caption">
                    {recordedSeconds < MIN_SECONDS
                      ? `Answers need at least ${MIN_SECONDS} seconds. Tap the mic to record again.`
                      : "Tap the mic to record again"}
                  </AppText>
                </>
              ) : (
                <>
                  <AppText style={tw`text-16 font-semibold text-ink`}>Tap to answer out loud</AppText>
                  <AppText variant="caption">Explain your reasoning, up to 2 minutes</AppText>
                </>
              )}
            </View>
          </View>
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
            disabled={recordedSeconds < MIN_SECONDS}
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
