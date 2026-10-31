import type { LucideIcon } from "lucide-react-native";
import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";

import { type ColorToken, pressScale, tw } from "@/theme";

import { Glass } from "./glass";
import { Icon } from "./icon";

// The prototype's icon buttons.
const variants: Record<Variant, { box: string; ink: ColorToken; glass?: boolean; scale: 0.9 | 0.95 }> = {
  // Back buttons on quizzes, the bell: 40, rounded-xl, border (white on canvas pages).
  outline: { box: "w-10 h-10 rounded-xl border border-border bg-surface", ink: "ink", scale: 0.9 },
  // Floating over photos (course details): 40, white/90 + blur + border.
  glass: { box: "w-10 h-10 rounded-xl border border-border", ink: "ink", glass: true, scale: 0.9 },
  // Over the video (lesson player): 40, black/20 + white/20 border, white icon.
  "glass-dark": { box: "w-10 h-10 rounded-xl border border-veil bg-veil-dark", ink: "white", scale: 0.9 },
  // Explore's filter button: 48, rounded-2xl, border, white.
  filter: { box: "w-12 h-12 rounded-2xl border border-border bg-surface", ink: "ink", scale: 0.9 },
  // The paywall's close: 32, round, white/80.
  close: { box: "w-8 h-8 rounded-full bg-glass-soft", ink: "ink", scale: 0.95 },
};

type Variant = "outline" | "glass" | "glass-dark" | "filter" | "close";

/** A square/round icon-only button. `accessibilityLabel` names the action. */
export function IconButton({
  icon,
  accessibilityLabel,
  variant = "outline",
  onPress,
  style,
}: {
  icon: LucideIcon;
  accessibilityLabel: string;
  variant?: Variant;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const v = variants[variant];
  const content = <Icon as={icon} size="lg" color={v.ink} />;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [pressScale(pressed, v.scale), style]}
    >
      {v.glass ? (
        <Glass tone="strong" style={tw.style("items-center justify-center", v.box)}>
          {content}
        </Glass>
      ) : (
        <View style={tw.style("items-center justify-center", v.box)}>{content}</View>
      )}
    </Pressable>
  );
}
