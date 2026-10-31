import { Star } from "lucide-react-native";
import { type StyleProp, View, type ViewStyle } from "react-native";

import { tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

/**
 * Small labels from the prototype:
 * - `pill`: "In Progress", "Chapter 01" (11 bold uppercase, primary on primary-tint, rounded-md).
 * - `insight`: "Did you know?" (13 bold uppercase, primary on primary-soft, rounded-full).
 * - `rating`: the star + score on course photos (white/90, rounded-lg, shadow-sm).
 */
export function Badge({
  label,
  variant = "pill",
  style,
}: {
  label: string;
  variant?: "pill" | "insight" | "rating";
  style?: StyleProp<ViewStyle>;
}) {
  if (variant === "rating") {
    return (
      <View style={[tw`flex-row items-center gap-1 bg-glass px-2 py-1 rounded-lg shadow-sm`, style]}>
        <Icon as={Star} size="xs" color="star" />
        <AppText style={tw`text-11 font-bold text-ink`}>{label}</AppText>
      </View>
    );
  }
  if (variant === "insight") {
    return (
      <View style={[tw`self-center bg-primary-soft px-4 py-1.5 rounded-full`, style]}>
        <AppText variant="badge" style={tw`text-13 tracking-wide`}>
          {label}
        </AppText>
      </View>
    );
  }
  return (
    <View style={[tw`self-start bg-primary-tint px-2.5 py-1 rounded-md`, style]}>
      <AppText variant="badge">{label}</AppText>
    </View>
  );
}
