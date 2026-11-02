import { Mic, Square } from "lucide-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { formatSeconds, MIN_SECONDS } from "@/lib/speaking/recording";
import type { Take } from "@/lib/speaking/use-answer-recorder";
import { color, pressScale, tw } from "@/theme";

/**
 * The spoken-answer recorder for viva and interview practice (prompts/17, 18): a 64 px mic button
 * with the timer and status beside it. It sits in the StickyFooter so it stays on screen however
 * long the question is. While an answer is being marked it shows a spinner instead.
 */
export function RecorderBar({
  take,
  elapsedMs,
  maxSeconds,
  marking,
  hint,
  onStart,
  onStop,
}: {
  take: Take;
  elapsedMs: number;
  maxSeconds: number;
  /** The answer is being marked: show progress instead of the recorder. */
  marking: boolean;
  /** The idle caption, e.g. "Explain your reasoning, up to 2 minutes". */
  hint: string;
  onStart: () => void;
  onStop: () => void;
}) {
  if (marking) {
    return (
      <View accessibilityRole="progressbar" style={tw`flex-row items-center gap-4 mb-5`}>
        <View style={tw`w-16 h-16 rounded-full bg-primary-soft items-center justify-center`}>
          <ActivityIndicator color={color("primary")} />
        </View>
        <AppText variant="callout" style={tw`flex-1`}>
          Marking your answer…
        </AppText>
      </View>
    );
  }

  const recording = take.phase === "recording";
  const recordedSeconds = take.phase === "recorded" ? take.durationMs / 1000 : 0;
  return (
    <View style={tw`flex-row items-center gap-4 mb-5`}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recording ? "Stop recording" : "Record your answer"}
        disabled={take.phase === "starting"}
        onPress={recording ? onStop : onStart}
        style={({ pressed }) => [
          tw.style("w-16 h-16 rounded-full items-center justify-center shadow-card", recording ? "bg-danger" : "bg-primary"),
          pressScale(pressed, 0.95),
        ]}
      >
        {take.phase === "starting" ? (
          <ActivityIndicator color={color("on-primary")} />
        ) : (
          <Icon as={recording ? Square : Mic} size="xl" color="on-primary" />
        )}
      </Pressable>
      <View style={tw`flex-1 gap-0.5`}>
        {recording ? (
          <>
            <AppText accessibilityLiveRegion="polite" style={tw`text-20 font-bold text-ink`}>
              {formatSeconds(elapsedMs)} / {formatSeconds(maxSeconds * 1000)}
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
            <AppText variant="caption">{hint}</AppText>
          </>
        )}
      </View>
    </View>
  );
}

/** True when the take is long enough to submit. */
export function canSubmit(take: Take): boolean {
  return take.phase === "recorded" && take.durationMs / 1000 >= MIN_SECONDS;
}
