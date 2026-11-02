import * as WebBrowser from "expo-web-browser";
import { ChevronDown, ChevronUp, ExternalLink, Flag } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppText } from "@/components/ui/text";
import type { VivaFeedback, VivaVerdict } from "@/lib/queries/viva";
import { tw } from "@/theme";

const VERDICTS: Record<VivaVerdict, { label: string; box: string; text: string }> = {
  correct: { label: "Correct", box: "bg-success-tint border-success", text: "text-success-deep" },
  partly_correct: { label: "Partly correct", box: "bg-streak-tint border-streak-line", text: "text-streak-deep" },
  incorrect: { label: "Incorrect", box: "bg-danger-tint border-danger-line", text: "text-danger-deep" },
  no_answer: { label: "No answer", box: "bg-subtle border-border", text: "text-muted" },
};

export function VerdictBadge({ verdict }: { verdict: VivaVerdict }) {
  const style = VERDICTS[verdict];
  return (
    <View style={tw.style("self-start px-2.5 py-1 rounded-full border", style.box)}>
      <AppText style={tw.style("text-12 font-bold", style.text)}>{style.label}</AppText>
    </View>
  );
}

function Rating({ label, value }: { label: string; value: number }) {
  return (
    <View style={tw`gap-1.5`}>
      <View style={tw`flex-row justify-between`}>
        <AppText variant="caption-strong">{label}</AppText>
        <AppText variant="caption">{value}/5</AppText>
      </View>
      <ProgressBar progress={value / 5} size="sm" />
    </View>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <View style={tw`gap-1.5`}>
      <AppText style={tw`text-14 font-semibold text-ink`}>{title}</AppText>
      {items.map((item) => (
        <View key={item} style={tw`flex-row gap-2`}>
          <AppText variant="body">•</AppText>
          <AppText variant="body" style={tw`flex-1`}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/**
 * AI feedback for one spoken answer (prompts/17, not in the design: built in the quiz screens'
 * style). Verdict + score, three ratings, what went well / to improve, a model answer, the
 * reference link, the transcript (collapsed) and "Report this feedback".
 */
export function VivaFeedbackCard({
  feedback,
  referenceUrl,
  onReport,
}: {
  feedback: VivaFeedback;
  referenceUrl?: string | null;
  onReport?: () => void;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  return (
    <Card style={tw`p-5 gap-5`}>
      <View style={tw`flex-row items-center justify-between`}>
        <VerdictBadge verdict={feedback.verdict} />
        <AppText accessibilityLabel={`Score ${feedback.score} out of 10`} style={tw`text-24 font-bold text-ink`}>
          {feedback.score}
          <AppText style={tw`text-16 font-semibold text-muted`}>/10</AppText>
        </AppText>
      </View>

      <View style={tw`gap-3`}>
        <Rating label="Accuracy" value={feedback.accuracy} />
        <Rating label="Reasoning" value={feedback.reasoning} />
        <Rating label="Clarity" value={feedback.clarity} />
      </View>

      <List title="What went well" items={feedback.strengths} />
      <List title="To improve" items={feedback.improvements} />

      {feedback.modelAnswer ? (
        <View style={tw`gap-1.5 p-4 rounded-xl bg-primary-tint`}>
          <AppText style={tw`text-14 font-semibold text-ink`}>A strong answer</AppText>
          <AppText variant="body" style={tw`text-ink`}>
            {feedback.modelAnswer}
          </AppText>
        </View>
      ) : null}

      {referenceUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => WebBrowser.openBrowserAsync(referenceUrl).catch(() => undefined)}
          style={tw`flex-row items-center gap-2`}
        >
          <Icon as={ExternalLink} size="sm" color="primary" />
          <AppText style={tw`text-14 font-semibold text-primary`}>Open reference</AppText>
        </Pressable>
      ) : null}

      {feedback.transcript ? (
        <View style={tw`gap-2`}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showTranscript }}
            onPress={() => setShowTranscript((open) => !open)}
            style={tw`flex-row items-center justify-between`}
          >
            <AppText variant="caption-strong">What we heard</AppText>
            <Icon as={showTranscript ? ChevronUp : ChevronDown} size="sm" color="muted" />
          </Pressable>
          {showTranscript ? (
            <AppText variant="caption" style={tw`italic`}>
              “{feedback.transcript}”
            </AppText>
          ) : null}
        </View>
      ) : null}

      {onReport ? (
        <Pressable accessibilityRole="button" onPress={onReport} style={tw`flex-row items-center gap-2 self-start`}>
          <Icon as={Flag} size="xs" color="muted" />
          <AppText variant="footnote">Report this feedback</AppText>
        </Pressable>
      ) : null}
    </Card>
  );
}
