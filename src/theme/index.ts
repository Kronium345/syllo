import { Platform, type TextStyle } from "react-native";
import { create } from "twrnc";

// All colour, type, radius, spacing and shadow tokens live in tailwind.config.js
// (prompts/01-design-system.md). Import `tw` and the helpers below; never hardcode values.
// eslint-disable-next-line @typescript-eslint/no-require-imports
export const tw = create(require("../../tailwind.config.js"));

export type ColorToken =
  | "transparent"
  | "white"
  | "black"
  | "primary"
  | "primary-tint"
  | "primary-soft"
  | "on-primary"
  | "ink"
  | "muted"
  | "faint"
  | "placeholder"
  | "canvas"
  | "surface"
  | "subtle"
  | "track"
  | "border"
  | "star"
  | "star-deep"
  | "streak"
  | "streak-deep"
  | "streak-tint"
  | "streak-line"
  | "success"
  | "success-deep"
  | "success-tint"
  | "danger"
  | "danger-deep"
  | "danger-tint"
  | "danger-line"
  | "info"
  | "glass"
  | "glass-soft"
  | "veil"
  | "veil-strong"
  | "veil-dark"
  | "video-shade"
  | "scrim"
  | "shade";

/** Resolves a colour token to its value, for props that take a colour string (icons, spinners). */
export function color(token: ColorToken): string {
  return tw.color(token) ?? "transparent";
}

export type TextVariant =
  | "display"
  | "insight"
  | "title-xl"
  | "title-lg"
  | "title"
  | "heading"
  | "lead"
  | "option"
  | "subtitle"
  | "body"
  | "card-title"
  | "callout"
  | "callout-strong"
  | "caption"
  | "caption-strong"
  | "footnote"
  | "badge"
  | "tab"
  | "button";

/** The prototype's icon sizes (`text-xs` … `text-3xl` on iconify icons). */
export const iconSize = { xs: 12, sm: 14, md: 18, lg: 20, xl: 24, "2xl": 30 } as const;

/** Fixed control sizes from the prototype. */
export const control = {
  /** w-10 h-10 square icon buttons and avatars. */
  icon: 40,
  /** w-12 h-12 filter button and quiz icon tiles. */
  lg: 48,
  /** The tab bar's h-[84px], bottom inset included. */
  tabBar: 84,
} as const;

/** `active:scale-[0.98]` / `active:scale-95` for a Pressable's style callback. */
export function pressScale(pressed: boolean, amount: 0.9 | 0.95 | 0.98 = 0.98) {
  return pressed ? { transform: [{ scale: amount }] } : null;
}

/**
 * The monospace face for code in lesson notes (prompts/19): Menlo on iOS, the system monospace
 * on Android, and a ui-monospace stack on web. Kept here because fontFamily is only allowed in
 * src/theme/ (eslint.config.js).
 */
export const mono: TextStyle = {
  fontFamily: Platform.select({
    ios: "Menlo",
    android: "monospace",
    default: 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace',
  }),
};
