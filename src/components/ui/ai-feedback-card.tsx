import * as WebBrowser from "expo-web-browser";
import { ChevronDown, ChevronUp, ExternalLink, Flag } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

/** How a verdict looks: good (green), middling (orange), poor (red) or none (grey). */
export type VerdictTone = "good" | "middling" | "poor" | "none";

const TONES: Record<VerdictTone, { box: string; text: string }> = {
  good: { box: "bg-success-tint border-success", text: "text-success-deep" },
  middling: { box: "bg-streak-tint border-streak-line", text: "text-streak-deep" },
  poor: { box: "bg-danger-tint border-danger-line", text: "text-danger-deep" },
  none: { box: "bg-subtle border-border", text: "text-muted" },
};

export function VerdictPill({ label, tone }: { label: string; tone: VerdictTone }) {
  const style = TONES[tone];
  return (
    <View style={tw.style("self-start px-2.5 py-1 rounded-full border", style.box)}>
      <AppText style={tw.style("text-12 font-bold", style.text)}>{label}</AppText>
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

export function BulletList({ title, items }: { title: string; items: string[] }) {
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
 * AI feedback for one spoken answer (viva prompts/17, interview prompts/18; not in the design,
 * built in the quiz screens' style): verdict + score, three 1-5 ratings, what went well and what
 * to improve, an example answer, an optional reference link, the transcript (collapsed) and
 * "Report this feedback".
 */
export function AiFeedbackCard({
  verdict,
  score,
  ratings,
  strengths,
  improvements,
  exampleTitle,
  example,
  transcript,
  referenceUrl,
  onReport,
}: {
  verdict: { label: string; tone: VerdictTone };
  score: number;
  ratings: { label: string; value: number }[];
  strengths: string[];
  improvements: string[];
  exampleTitle: string;
  example: string;
  transcript: string;
  referenceUrl?: string | null;
  onReport?: () => void;
}) {
  const [showTranscript, setShowTranscript] = useState(false);
  return (
    <Card style={tw`p-5 gap-5`}>
      <View style={tw`flex-row items-center justify-between`}>
        <VerdictPill label={verdict.label} tone={verdict.tone} />
        <AppText accessibilityLabel={`Score ${score} out of 10`} style={tw`text-24 font-bold text-ink`}>
          {score}
          <AppText style={tw`text-16 font-semibold text-muted`}>/10</AppText>
        </AppText>
      </View>

      <View style={tw`gap-3`}>
        {ratings.map((rating) => (
          <Rating key={rating.label} label={rating.label} value={rating.value} />
        ))}
      </View>

      <BulletList title="What went well" items={strengths} />
      <BulletList title="To improve" items={improvements} />

      {example ? (
        <View style={tw`gap-1.5 p-4 rounded-xl bg-primary-tint`}>
          <AppText style={tw`text-14 font-semibold text-ink`}>{exampleTitle}</AppText>
          <AppText variant="body" style={tw`text-ink`}>
            {example}
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

      {transcript ? (
        <View style={tw`gap-2`}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showTranscript }}
            onPress={() => setShowTranscript((open) => !open)}
            style={tw`flex-row items-center justify-between py-1`}
          >
            <AppText variant="caption-strong">What we heard</AppText>
            <Icon as={showTranscript ? ChevronUp : ChevronDown} size="sm" color="muted" />
          </Pressable>
          {showTranscript ? (
            <AppText variant="caption" style={tw`italic`}>
              “{transcript}”
            </AppText>
          ) : null}
        </View>
      ) : null}

      {onReport ? (
        <Pressable
          accessibilityRole="button"
          onPress={onReport}
          hitSlop={12}
          style={tw`flex-row items-center gap-2 self-start py-1`}
        >
          <Icon as={Flag} size="xs" color="muted" />
          <AppText variant="footnote">Report this feedback</AppText>
        </Pressable>
      ) : null}
    </Card>
  );
}
