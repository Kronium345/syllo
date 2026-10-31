import { type StyleProp, View, type ViewStyle } from "react-native";

import { color, type ColorToken, tw } from "@/theme";

/**
 * The prototype's `bg-gradient-to-t from-X to-transparent` over a photo, as an absolute
 * overlay. `via` = the stop where it's fully transparent (welcome's `via-transparent` = 50%).
 */
export function Fade({
  to = "surface",
  via = 100,
  style,
}: {
  /** The colour at the bottom edge (the page background). */
  to?: ColorToken;
  via?: 50 | 100;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        tw`absolute inset-0`,
        { backgroundImage: `linear-gradient(to top, ${color(to)} 0%, transparent ${via}%)` },
        style,
      ]}
    />
  );
}
