import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Children, Fragment, type ReactNode } from "react";
import { Pressable, type StyleProp, View, type ViewStyle } from "react-native";

import { tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

/**
 * One tappable settings row: icon tile, label, chevron. Not in the design: built like its
 * curriculum rows (primary-soft tile, rounded-lg, 14 medium ink label).
 */
export function ProfileRow({ icon, label, onPress }: { icon: LucideIcon; label: string; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [tw`flex-row items-center gap-4 px-4 py-3`, pressed && tw`bg-subtle`]}
    >
      <View style={tw`w-10 h-10 rounded-xl bg-primary-tint items-center justify-center`}>
        <Icon as={icon} size="lg" color="primary" />
      </View>
      <AppText style={tw`flex-1 text-15 font-medium text-ink`}>{label}</AppText>
      <Icon as={ChevronRight} size="md" color="muted" />
    </Pressable>
  );
}

/** Groups rows in one bordered card with hairlines between them, not a box per row. */
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
    <View style={[tw`gap-3`, style]}>
      {title ? (
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
      ) : null}
      <View style={tw`rounded-2xl bg-surface border border-border overflow-hidden`}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={tw`ml-18 mr-4 h-px bg-track`} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
    </View>
  );
}
