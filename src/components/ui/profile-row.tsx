import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors } from "./placeholder-colors";

/** One tappable settings row: icon tile, label, chevron. Ported from havenly. */
export function ProfileRow({ icon: Glyph, label, onPress }: { icon: LucideIcon; label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.canvas }]}
    >
      <View style={styles.tile}>
        <Glyph size={22} color={colors.ink} strokeWidth={2} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <ChevronRight size={20} color={colors.muted} strokeWidth={2} />
    </Pressable>
  );
}

/** Groups rows on one surface with hairlines between them, not a box per row. */
export function ProfileRowGroup({
  title,
  children,
  style,
}: {
  title?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const rows = Children.toArray(children);
  return (
    <View style={[styles.group, style]}>
      {title ? (
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
      <View style={styles.surface}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={styles.hairline} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 16, paddingHorizontal: 12, paddingVertical: 10 },
  tile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.canvas,
  },
  label: { flex: 1, fontSize: 16, color: colors.ink },
  group: { gap: 12 },
  title: { paddingHorizontal: 4, fontSize: 18, fontWeight: "700", color: colors.ink },
  surface: { overflow: "hidden", borderRadius: 16, backgroundColor: colors.surface },
  hairline: { marginLeft: 72, marginRight: 12, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
