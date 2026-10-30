import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, type StyleProp, StyleSheet, Text, type ViewStyle } from "react-native";

import { colors } from "./placeholder-colors";

const variants = {
  primary: { box: { backgroundColor: colors.accent }, text: colors.onAccent },
  secondary: { box: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }, text: colors.ink },
  danger: { box: { backgroundColor: colors.danger }, text: colors.onAccent },
} as const;

/** Full-width pill button. Ported from havenly, with placeholder styles. */
export function Button({
  title,
  variant = "primary",
  leading,
  loading = false,
  disabled = false,
  onPress,
  style,
}: {
  title: string;
  variant?: keyof typeof variants;
  /** Node before the title, e.g. a provider logo. */
  leading?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const inactive = disabled || loading;
  const v = variants[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [styles.box, v.box, { opacity: disabled ? 0.4 : pressed ? 0.85 : 1 }, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <>
          {leading}
          <Text numberOfLines={1} style={[styles.title, { color: v.text }]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 999,
    paddingHorizontal: 24,
  },
  title: { fontSize: 16, fontWeight: "600" },
});
