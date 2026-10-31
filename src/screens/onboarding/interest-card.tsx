import type { LucideIcon } from "lucide-react-native";
import { Pressable } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { pressScale, tw } from "@/theme";

/** A topic tile (interest_selection_quiz): primary border and blue-50 fill when picked. */
export function InterestCard({
  icon,
  label,
  selected,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        tw.style(
          "flex-1 p-4 rounded-2xl gap-3",
          selected ? "border-2 border-primary bg-primary-tint" : "border border-border bg-surface",
        ),
        pressScale(pressed, 0.95),
      ]}
    >
      <Icon as={icon} size="xl" color={selected ? "primary" : "muted"} />
      <AppText style={tw`text-16 font-semibold text-ink`}>{label}</AppText>
    </Pressable>
  );
}
