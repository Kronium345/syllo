import { type StyleProp, View, type ViewStyle } from "react-native";

import { tw } from "@/theme";

const heights = { sm: "h-1", md: "h-1.5", lg: "h-2" } as const;

/**
 * Rounded progress track: `lg` (h-2) course progress, `md` (h-1.5) onboarding steps,
 * `sm` (h-1) the video scrubber. `progress` is 0–1. `track` overrides the track colour
 * (the player uses `veil-strong`, the insight step `border`).
 */
export function ProgressBar({
  progress,
  size = "lg",
  track = "bg-track",
  style,
}: {
  progress: number;
  size?: keyof typeof heights;
  track?: "bg-track" | "bg-border" | "bg-veil-strong";
  style?: StyleProp<ViewStyle>;
}) {
  const percent = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={[tw.style("w-full rounded-full overflow-hidden", heights[size], track), style]}
    >
      <View style={[tw`h-full bg-primary`, { width: `${percent}%` }]} />
    </View>
  );
}
