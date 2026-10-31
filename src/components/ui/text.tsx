import { Text, type TextProps } from "react-native";

import { type TextVariant, tw } from "@/theme";

/**
 * All text in the app. `variant` picks a shared style from the design (type-* in
 * tailwind.config.js); `style` adds one-off overrides such as a colour token.
 */
export function AppText({ variant = "body", style, ...props }: TextProps & { variant?: TextVariant }) {
  return <Text style={[tw.style(`type-${variant}`), style]} {...props} />;
}
