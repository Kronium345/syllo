import type { ReactNode } from "react";
import { type StyleProp, View, type ViewStyle } from "react-native";

import { tw } from "@/theme";

/** White surface with the hairline border; `shadow` adds the prototype's custom-shadow. */
export function Card({
  children,
  shadow = false,
  radius = "2xl",
  style,
}: {
  children: ReactNode;
  shadow?: boolean;
  /** `2xl` (16) for most cards, `card` (20) for the dashboard hero card. */
  radius?: "2xl" | "card";
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        tw.style("bg-surface border border-border overflow-hidden", radius === "card" ? "rounded-card" : "rounded-2xl"),
        shadow && tw`shadow-card`,
        style,
      ]}
    >
      {children}
    </View>
  );
}
