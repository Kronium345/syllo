import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { tw } from "@/theme";

// The `footer` spacing token (p-8), read once so the safe-area inset can be added to it.
const FOOTER_PADDING = Number(tw.style("pb-footer").paddingBottom ?? 0);

/**
 * The prototype's bottom action bar (`p-8 bg-white border-t`), used under quizzes, course
 * details and the paywall. Adds the bottom safe-area inset below the padding.
 * `tone="canvas"` drops the border and uses the page background (welcome, insight).
 */
export function StickyFooter({
  children,
  tone = "surface",
  style,
}: {
  children: ReactNode;
  tone?: "surface" | "canvas";
  style?: StyleProp<ViewStyle>;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        tw.style("px-footer pt-footer", tone === "surface" ? "bg-surface border-t border-border" : "bg-canvas"),
        { paddingBottom: FOOTER_PADDING + insets.bottom },
        style,
      ]}
    >
      {children}
    </View>
  );
}
