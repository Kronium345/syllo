import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * The prototype's top padding (`pt-12`, `pt-14`) already includes the status bar. Use the
 * design's value, or the safe-area inset plus a small gap when the device's notch is taller.
 */
export function useTopPadding(design: number, gap = 8): number {
  const { top } = useSafeAreaInsets();
  return Math.max(design, top + gap);
}
