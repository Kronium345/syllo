import type { LucideIcon } from "lucide-react-native";

import { color as resolveColor, type ColorToken, iconSize } from "@/theme";

/** A Lucide icon at one of the design's sizes, in a colour token (stroke 2, as in the prototype). */
export function Icon({
  as: Glyph,
  size = "xl",
  color = "ink",
  filled = false,
}: {
  as: LucideIcon;
  size?: keyof typeof iconSize;
  color?: ColorToken;
  /** Lucide ships outlines; fill the shape for active states such as a selected star. */
  filled?: boolean;
}) {
  const value = resolveColor(color);
  return <Glyph size={iconSize[size]} color={value} strokeWidth={2} fill={filled ? value : "none"} />;
}
