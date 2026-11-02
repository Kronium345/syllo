import { router, useLocalSearchParams } from "expo-router";
import { ChevronDown, ChevronUp, Mic } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { type VivaQuestion, type VivaVerdict, useVivaSession } from "@/lib/queries/viva";
import { color, tw } from "@/theme";

import { ReportFeedbackSheet } from "./report-feedback-sheet";
import { VerdictBadge, VivaFeedbackCard } from "./viva-feedback-card";
import { averageScore, REASON_LABELS } from "./viva-player-screen";

const COUNTS: { verdict: VivaVerdict; label: string }[] = [
  { verdict: "correct", label: "Correct" },
  { verdict: "partly_correct", label: "Partly" },
  { verdict: "incorrect", label: "Incorrect" },
];

/** Viva results (prompts/17; not in the design, built like quiz Results). */
export function VivaResultsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const paddingTop = useTopPadding(56);
  const session = useVivaSession(id);
  const [open, setOpen] = useState<string | null>(null);
  const [reporting, setReporting] = useState<{ sessionId: string; questionId: string } | null>(null);

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
  const average = averageScore(data);
  const answered = data.questions.filter((question) => question.feedback).length;

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <ScrollView style={tw`flex-1`} contentContainerStyle={[tw`px-screen pb-6`, { paddingTop }]}>
        <View style={tw`items-center`}>
          <View style={tw`w-20 h-20 rounded-full bg-primary-soft items-center justify-center mb-6 mt-6`}>
            <Icon as={Mic} size="2xl" color="primary" />
          </View>
          <AppText variant="badge" style={tw`mb-2`}>
            Viva practice · {data.quizTitle}
          </AppText>
          <AppText variant="display" accessibilityRole="header" style={tw`mb-1`}>
            {average === null ? "–" : `${average}/10`}
          </AppText>
          <AppText variant="lead" style={tw`mb-8`}>
            {answered === 0 ? "No answers marked" : `Average score · ${answered} of ${data.questions.length} answered`}
          </AppText>
        </View>

        <View style={tw`flex-row gap-3 mb-8`}>
          {COUNTS.map(({ verdict, label }) => (
            <View key={verdict} style={tw`flex-1 bg-surface p-4 border border-border rounded-2xl shadow-card items-center`}>
              <AppText style={tw`text-20 font-bold text-ink`}>
                {data.questions.filter((question) => question.feedback?.verdict === verdict).length}
              </AppText>
              <AppText variant="footnote">{label}</AppText>
            </View>
          ))}
        </View>

        <View style={tw`gap-3`}>
          {data.questions.map((question, index) => (
            <ResultRow
              key={question.questionId}
              number={index + 1}
              question={question}
              open={open === question.questionId}
              onToggle={() => setOpen((current) => (current === question.questionId ? null : question.questionId))}
              onReport={() => setReporting({ sessionId: data.id, questionId: question.questionId })}
            />
          ))}
        </View>

        <AppText variant="footnote" style={tw`text-center mt-6`}>
          AI feedback is for study practice. Check clinical facts in the BNF.
        </AppText>
      </ScrollView>

      <StickyFooter>
        <View style={tw`flex-row gap-3`}>
          <Button
            title="Quiz results"
            variant="outline"
            onPress={() => router.dismissTo({ pathname: "/attempt/[id]/results", params: { id: data.attemptId } })}
            style={tw`flex-1`}
          />
          <Button
            title="Back to course"
            variant="outline"
            onPress={() =>
              data.courseId
                ? router.dismissTo({ pathname: "/course/[id]", params: { id: data.courseId } })
                : router.replace("/home")
            }
            style={tw`flex-1`}
          />
        </View>
      </StickyFooter>

      <ReportFeedbackSheet target={reporting} onClose={() => setReporting(null)} />
    </View>
  );
}

function ResultRow({
  number,
  question,
  open,
  onToggle,
  onReport,
}: {
  number: number;
  question: VivaQuestion;
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
            <AppText variant="caption-strong">Q{number}</AppText>
            {feedback ? (
              <VerdictBadge verdict={feedback.verdict} />
            ) : (
              <AppText variant="caption">Not answered</AppText>
            )}
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
          <AppText variant="footnote">{REASON_LABELS[question.reason]}</AppText>
        </Card>
      </Pressable>
      {open && feedback ? (
        <VivaFeedbackCard feedback={feedback} referenceUrl={question.referenceUrl} onReport={onReport} />
      ) : null}
    </View>
  );
}
