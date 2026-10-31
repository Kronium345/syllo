import type { LucideIcon } from "lucide-react-native";
import { CircleCheck } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { pressScale, tw } from "@/theme";

/**
 * A goal choice (goal_selection_quiz `.option-card`): icon tile, title, description and a
 * check when selected. The prototype doesn't style `.active`, so the selected border and
 * fill are estimated from the interest cards (border-2 primary on blue-50).
 */
export function OptionCard({
  icon,
  title,
  description,
  selected,
  onPress,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}. ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        tw.style(
          "rounded-2xl flex-row items-center gap-4",
          // p-5 with a 1px border; the 2px selected border takes 1px of padding so nothing moves.
          selected ? "p-[19px] border-2 border-primary bg-primary-tint" : "p-5 border border-border bg-surface",
        ),
        pressScale(pressed),
      ]}
    >
      <View style={tw`w-12 h-12 rounded-xl bg-primary-tint items-center justify-center`}>
        <Icon as={icon} size="xl" color="primary" />
      </View>
      <View style={tw`flex-1`}>
        <AppText variant="option">{title}</AppText>
        <AppText variant="callout">{description}</AppText>
      </View>
      {selected ? <Icon as={CircleCheck} size="xl" color="primary" /> : null}
    </Pressable>
  );
}
