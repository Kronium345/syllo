import type { LucideIcon } from "lucide-react-native";
import { Pressable, type StyleProp, type ViewStyle } from "react-native";

import { colors } from "./placeholder-colors";

const sizes = { md: { box: 40, icon: 20 }, lg: { box: 48, icon: 24 } } as const;

/** A round icon-only button. `accessibilityLabel` names the action. Ported from havenly. */
export function IconButton({
  icon: Glyph,
  accessibilityLabel,
  variant = "plain",
  size = "lg",
  onPress,
  style,
}: {
  icon: LucideIcon;
  accessibilityLabel: string;
  variant?: "plain" | "outline";
  size?: keyof typeof sizes;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const s = sizes[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: s.box,
          height: s.box,
          borderRadius: s.box / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: variant === "outline" ? colors.surface : colors.canvas,
          borderWidth: variant === "outline" ? 1 : 0,
          borderColor: colors.border,
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Glyph size={s.icon} color={colors.ink} strokeWidth={2} />
    </Pressable>
  );
}
