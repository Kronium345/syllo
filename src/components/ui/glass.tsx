import { BlurView } from "expo-blur";
import type { ReactNode } from "react";
import { Platform, type StyleProp, View, type ViewStyle } from "react-native";

import { tw } from "@/theme";

/**
 * The prototype's translucent bars (`bg-white/80 backdrop-blur-md`). iOS blurs what's
 * behind; Android (blur is costly there) and web use the translucent `glass` colour.
 */
export function Glass({
  children,
  tone = "soft",
  style,
}: {
  children?: ReactNode;
  /** `soft` = white/80 (top bars), `strong` = white/90 (floating buttons, search header). */
  tone?: "soft" | "strong";
  style?: StyleProp<ViewStyle>;
}) {
  const fill = tw.style(tone === "strong" ? "bg-glass" : "bg-glass-soft");
  if (Platform.OS === "ios") {
    return (
      <BlurView intensity={40} tint="light" style={[fill, tw`overflow-hidden`, style]}>
        {children}
      </BlurView>
    );
  }
  return <View style={[fill, style]}>{children}</View>;
}
