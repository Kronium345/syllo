import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, type StyleProp, View, type ViewStyle } from "react-native";

import { color, type ColorToken, pressScale, tw } from "@/theme";

import { AppText } from "./text";

// The prototype's buttons. Text colour per variant also tints `leading`/`trailing` icons.
const variants: Record<
  Variant,
  { box: string; text: string; ink: ColorToken; shadow?: boolean }
> = {
  // "Get Started", "Continue", "Subscribe Now": py-4 rounded-2xl semibold + custom-shadow.
  primary: { box: "bg-primary py-4 rounded-2xl", text: "text-16 font-semibold text-on-primary", ink: "on-primary", shadow: true },
  // "Enroll in Course", "Next Lesson", "Resume Lesson": the same in bold.
  "primary-bold": { box: "bg-primary py-4 rounded-2xl", text: "text-16 font-bold text-on-primary", ink: "on-primary", shadow: true },
  // "Previous", "Mark as Completed": hairline border, ink bold.
  outline: { box: "bg-surface border border-border py-3.5 rounded-2xl", text: "text-16 font-bold text-ink", ink: "ink" },
  // "Follow": primary border and text, small.
  "outline-primary": { box: "border border-primary px-4 py-2 rounded-xl", text: "text-13 font-bold text-primary", ink: "primary" },
  // "See All", "View Details", "Log In".
  link: { box: "py-1", text: "text-14 font-semibold text-primary", ink: "primary" },
  // Destructive confirmations (not in the design; estimated in its language).
  danger: { box: "bg-danger py-4 rounded-2xl", text: "text-16 font-semibold text-on-primary", ink: "on-primary" },
};

type Variant = "primary" | "primary-bold" | "outline" | "outline-primary" | "link" | "danger";

export function Button({
  title,
  variant = "primary",
  leading,
  trailing,
  loading = false,
  disabled = false,
  onPress,
  style,
}: {
  title: string;
  variant?: Variant;
  /** Node before the title, e.g. an Icon or a provider logo. */
  leading?: ReactNode;
  trailing?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const v = variants[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        tw.style("flex-row items-center justify-center gap-2", v.box),
        v.shadow && tw`shadow-card`,
        variant !== "link" && pressScale(pressed),
        { opacity: disabled ? 0.4 : variant === "link" && pressed ? 0.7 : 1 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color(v.ink)} />
      ) : (
        <>
          {leading}
          <AppText numberOfLines={1} style={tw.style(v.text)}>
            {title}
          </AppText>
          {trailing}
        </>
      )}
      {/* Keeps the pressable's height while loading. */}
      {loading ? <View style={tw`h-0`} /> : null}
    </Pressable>
  );
}

/** The ink colour a variant uses for its text, for tinting icons passed as leading/trailing. */
export function buttonInk(variant: Variant = "primary"): ColorToken {
  return variants[variant].ink;
}
