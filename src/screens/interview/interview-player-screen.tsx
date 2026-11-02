import { Redirect, router, useLocalSearchParams } from "expo-router";
import * as Speech from "expo-speech";
import { Briefcase, Volume2, X } from "lucide-react-native";
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
  type InterviewSession,
  useFinishInterview,
  useInterviewSession,
  useSubmitInterviewAnswer,
} from "@/lib/queries/interviews";
import { INTERVIEW_MAX_SECONDS, RECORDING_MIME } from "@/lib/speaking/recording";
import { useAnswerRecorder } from "@/lib/speaking/use-answer-recorder";
import { AlreadyAnsweredError, NoAnswerError, NotAllowedError } from "@/services/errors";
import { color, tw } from "@/theme";

import { InterviewFeedbackCard } from "./interview-feedback-card";
import { interviewTitle, questionLabel } from "./labels";
import { ReportInterviewSheet } from "./report-interview-sheet";

/** Interview practice (prompts/18; not in the design, built like the viva player). */
export function InterviewPlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useInterviewSession(id);

  if (session.isPending) {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Loading interview" style={tw`flex-1 bg-surface items-center justify-center`}>
        <ActivityIndicator color={color("muted")} />
      </View>
    );
  }
  if (session.isError) {
    return (
      <Pressable accessibilityRole="button" onPress={() => session.refetch()} style={tw`flex-1 bg-surface items-center justify-center gap-2`}>
        <AppText variant="callout">Couldn&apos;t load your interview.</AppText>
        <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
      </Pressable>
    );
  }
  if (!session.data) {
    return (
      <View style={tw`flex-1 bg-surface items-center justify-center gap-4 px-screen`}>
        <AppText variant="callout">This interview isn&apos;t available.</AppText>
        <Button title="Go back" variant="outline" onPress={() => router.back()} style={tw`self-stretch`} />
      </View>
    );
  }
  if (session.data.finished) {
    return <Redirect href={{ pathname: "/interview/[id]/results", params: { id: session.data.id } }} />;
  }
  return <InterviewPlayer session={session.data} onRefetch={() => session.refetch()} />;
}

function InterviewPlayer({ session, onRefetch }: { session: InterviewSession; onRefetch: () => void }) {
  const paddingTop = useTopPadding(48);
  const total = session.questions.length;
  // Resume at the first question without feedback.
  const [index, setIndex] = useState(() => {
    const next = session.questions.findIndex((question) => !question.feedback);
    return next === -1 ? total - 1 : next;
  });
  const question = session.questions[index];
  const isLast = index === total - 1;
  const [reporting, setReporting] = useState<{ sessionId: string; position: number | null } | null>(null);
  const submit = useSubmitInterviewAnswer();
  const finish = useFinishInterview();
  const recorder = useAnswerRecorder(INTERVIEW_MAX_SECONDS);
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
        position: question.position,
        audio: upload.audio,
        mimeType: RECORDING_MIME,
        durationMs: upload.durationMs,
      },
      {
        onSuccess: () => recorder.clear(upload.uri),
        onError: (error) => {
          if (error instanceof NoAnswerError) {
            recorder.clear(upload.uri);
            toast.info("We couldn't hear an answer.", "Try again, out loud, as you would in the room.");
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

  const finishInterview = () => {
    recorder.discard();
    Speech.stop();
    // mutateAsync: finishing updates the cached session, whose `finished` redirects this screen
    // before per-call callbacks would run.
    finish.mutateAsync(session.id).then(
      (summary) => {
        showBanner({
          title: "Interview complete",
          message: summary.readiness === null ? "No answers marked" : `Readiness ${summary.readiness}/10`,
          icon: Briefcase,
        });
        router.replace({ pathname: "/interview/[id]/results", params: { id: session.id } });
      },
      () => toast.error("Couldn't finish the interview.", "Check your connection and try again."),
    );
  };

  return (
    <View style={tw`flex-1 bg-surface`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton icon={X} accessibilityLabel="Close interview" onPress={() => router.back()} />
        <View style={tw`flex-1`}>
          <AppText variant="heading" accessibilityRole="header" numberOfLines={1}>
            {interviewTitle(session)}
          </AppText>
          <AppText variant="caption">
            Question {index + 1} of {total}
          </AppText>
        </View>
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-screen pb-6 gap-5`}>
        <Badge label={questionLabel(question)} style={tw`self-start`} />
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
          <InterviewFeedbackCard
            feedback={question.feedback}
            onReport={() => setReporting({ sessionId: session.id, position: question.position })}
          />
        ) : null}
      </ScrollView>

      <StickyFooter>
        {/* The recorder lives in the footer so it's on screen however long the question is. */}
        {question.feedback ? null : (
          <RecorderBar
            take={take}
            elapsedMs={recorder.elapsedMs}
            maxSeconds={INTERVIEW_MAX_SECONDS}
            marking={submit.isPending}
            hint={question.kind === "behavioural" ? "Use a real example: situation, task, action, result" : "Answer as you would in the room, up to 3 minutes"}
            onStart={recorder.start}
            onStop={recorder.stop}
          />
        )}
        {question.feedback ? (
          <Button
            title={isLast ? "See summary" : "Next question"}
            loading={isLast && finish.isPending}
            onPress={isLast ? finishInterview : goNext}
          />
        ) : take.phase === "recorded" ? (
          <Button title="Submit answer" disabled={!canSubmit(take)} loading={submit.isPending} onPress={submitAnswer} />
        ) : (
          <Button
            title={isLast ? "Finish" : "Skip question"}
            variant="outline"
            disabled={take.phase === "recording" || take.phase === "starting" || submit.isPending}
            loading={isLast && finish.isPending}
            onPress={isLast ? finishInterview : goNext}
          />
        )}
      </StickyFooter>

      <ReportInterviewSheet target={reporting} onClose={() => setReporting(null)} />
    </View>
  );
}
