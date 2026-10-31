import { Pressable } from "react-native";

import { tw } from "@/theme";

import { AppText } from "./text";

/** Category filter chip (Explore): primary fill when selected, subtle with a border otherwise. */
export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          "px-5 py-2.5 rounded-full border",
          selected ? "bg-primary border-primary" : pressed ? "bg-primary-tint border-border" : "bg-subtle border-border",
        )
      }
    >
      <AppText style={tw.style("text-14", selected ? "font-bold text-on-primary" : "font-medium text-muted")}>
        {label}
      </AppText>
    </Pressable>
  );
}
