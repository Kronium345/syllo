import { router, useLocalSearchParams } from "expo-router";
import { Briefcase, ChevronDown, ChevronUp, Flag } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { BulletList, VerdictPill } from "@/components/ui/ai-feedback-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { type InterviewQuestion, useInterviewSession } from "@/lib/queries/interviews";
import { color, tw } from "@/theme";

import { InterviewFeedbackCard } from "./interview-feedback-card";
import { interviewTitle, questionLabel, VERDICTS } from "./labels";
import { ReportInterviewSheet } from "./report-interview-sheet";

/** Interview results (prompts/18; not in the design, built like quiz and viva Results). */
export function InterviewResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paddingTop = useTopPadding(56);
  const session = useInterviewSession(id);
  const [open, setOpen] = useState<number | null>(null);
  const [reporting, setReporting] = useState<{ sessionId: string; position: number | null } | null>(null);

  if (session.isPending) {
    return (
      <View accessibilityRole="progressbar" accessibilityLabel="Loading results" style={tw`flex-1 bg-surface items-center justify-center`}>
        <ActivityIndicator color={color("muted")} />
      </View>
    );
  }
  if (session.isError || !session.data) {
    return (
      <Pressable accessibilityRole="button" onPress={() => session.refetch()} style={tw`flex-1 bg-surface items-center justify-center gap-2`}>
        <AppText variant="callout">Couldn&apos;t load your results.</AppText>
        <AppText style={tw`text-14 font-semibold text-primary`}>Try again</AppText>
      </Pressable>
    );
  }

  const data = session.data;
  const summary = data.summary;
  const answered = data.questions.filter((question) => question.feedback && question.feedback.verdict !== "no_answer").length;

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <ScrollView style={tw`flex-1`} contentContainerStyle={[tw`px-screen pb-6`, { paddingTop }]}>
        <View style={tw`items-center`}>
          <View style={tw`w-20 h-20 rounded-full bg-primary-soft items-center justify-center mb-6 mt-6`}>
            <Icon as={Briefcase} size="2xl" color="primary" />
          </View>
          <AppText variant="badge" style={tw`mb-2 text-center`}>
            Interview practice · {interviewTitle(data)}
          </AppText>
          <AppText variant="display" accessibilityRole="header" style={tw`mb-1`}>
            {summary?.readiness == null ? "–" : `${summary.readiness}/10`}
          </AppText>
          <AppText variant="lead" style={tw`mb-8`}>
            {summary?.readiness == null ? "No answers marked" : `Readiness · ${answered} of ${data.questions.length} answered`}
          </AppText>
        </View>

        {summary?.summary ? (
          <Card style={tw`p-5 gap-5 mb-8`}>
            <AppText variant="body" style={tw`text-ink`}>
              {summary.summary}
            </AppText>
            <BulletList title="Top strengths" items={summary.topStrengths} />
            <BulletList title="Work on next" items={summary.nextSteps} />
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => setReporting({ sessionId: data.id, position: null })}
              style={tw`flex-row items-center gap-2 self-start py-1`}
            >
              <Icon as={Flag} size="xs" color="muted" />
              <AppText variant="footnote">Report this summary</AppText>
            </Pressable>
          </Card>
        ) : null}

        <View style={tw`gap-3`}>
          {data.questions.map((question) => (
            <ResultRow
              key={question.position}
              question={question}
              open={open === question.position}
              onToggle={() => setOpen((current) => (current === question.position ? null : question.position))}
              onReport={() => setReporting({ sessionId: data.id, position: question.position })}
            />
          ))}
        </View>

        <AppText variant="footnote" style={tw`text-center mt-6`}>
          AI feedback is for practice only. It isn&apos;t careers or professional advice.
        </AppText>
      </ScrollView>

      <StickyFooter>
        <View style={tw`flex-row gap-3`}>
          <Button title="Practise again" variant="outline" onPress={() => router.dismissTo("/interview")} style={tw`flex-1`} />
          <Button title="Back to Home" variant="outline" onPress={() => router.dismissTo("/home")} style={tw`flex-1`} />
        </View>
      </StickyFooter>

      <ReportInterviewSheet target={reporting} onClose={() => setReporting(null)} />
    </View>
  );
}

function ResultRow({
  question,
  open,
  onToggle,
  onReport,
}: {
  question: InterviewQuestion;
  open: boolean;
  onToggle: () => void;
  onReport: () => void;
}) {
  const feedback = question.feedback;
  return (
    <View style={tw`gap-3`}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled: !feedback }}
        disabled={!feedback}
        onPress={onToggle}
      >
        <Card style={tw`p-4 gap-2`}>
          <View style={tw`flex-row items-center gap-3`}>
            <AppText variant="caption-strong">Q{question.position}</AppText>
            {feedback ? <VerdictPill {...VERDICTS[feedback.verdict]} /> : <AppText variant="caption">Not answered</AppText>}
            <View style={tw`flex-1`} />
            {feedback ? (
              <>
                <AppText style={tw`text-15 font-bold text-ink`}>{feedback.score}/10</AppText>
                <Icon as={open ? ChevronUp : ChevronDown} size="sm" color="muted" />
              </>
            ) : null}
          </View>
          <AppText numberOfLines={open ? undefined : 2} style={tw`text-15 text-ink`}>
            {question.prompt}
          </AppText>
          <AppText variant="footnote">{questionLabel(question)}</AppText>
        </Card>
      </Pressable>
      {open && feedback ? <InterviewFeedbackCard feedback={feedback} onReport={onReport} /> : null}
    </View>
  );
}
