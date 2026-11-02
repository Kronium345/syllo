import Flag from "@expo/material-symbols/flag.xml";
import CheckCircle from "@expo/material-symbols/check_circle.xml";
import ChevronLeft from "@expo/material-symbols/chevron_left.xml";
import ChevronRight from "@expo/material-symbols/chevron_right.xml";
import Unchecked from "@expo/material-symbols/radio_button_unchecked.xml";
import { Stack } from "expo-router";
import { ArrowLeft, ArrowRight, Circle, CircleCheck } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, buttonInk } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { color, pressScale, tw } from "@/theme";

type Props = {
  /** Null on the course's first lesson. */
  previous: (() => void) | null;
  /** The next lesson, or back to the course after the last one. */
  next: () => void;
  isLast: boolean;
  completed: boolean;
  locked: boolean;
  saving: boolean;
  onToggleCompleted: () => void;
};

const isIOS = process.env.EXPO_OS === "ios";
/**
 * Fixed gap between the three buttons (user decision): a tight centred group reads as lesson
 * controls rather than Android's spread-out bottom tabs.
 */
const BUTTON_GAP = 24;

/**
 * The lesson's previous / completed / next actions. iOS and Android use a native bottom
 * Stack.Toolbar with icons only (user decision: the design's footer took too much space);
 * web has no native toolbar, so it keeps the design's footer.
 */
export function LessonActions(props: Props) {
  return process.env.EXPO_OS === "web" ? <WebFooter {...props} /> : <NativeToolbar {...props} />;
}

function NativeToolbar({ previous, next, isLast, completed, locked, saving, onToggleCompleted }: Props) {
  const spacer = <Stack.Toolbar.Spacer width={BUTTON_GAP} />;

  return (
    <Stack.Toolbar placement="bottom" tintColor={color("ink")} backgroundColor={color("surface")}>
      <Stack.Toolbar.Button
        icon={isIOS ? "chevron.left" : ChevronLeft}
        accessibilityLabel="Previous lesson"
        disabled={!previous}
        // Android doesn't dim a disabled toolbar button by itself.
        tintColor={previous ? undefined : color("faint")}
        onPress={() => previous?.()}
      />
      {spacer}
      <Stack.Toolbar.Button
        icon={completed ? (isIOS ? "checkmark.circle.fill" : CheckCircle) : isIOS ? "circle" : Unchecked}
        tintColor={completed ? color("primary") : undefined}
        selected={completed}
        accessibilityLabel={completed ? "Completed. Tap to mark as not completed" : "Mark as completed"}
        disabled={locked || saving}
        onPress={onToggleCompleted}
      />
      {spacer}
      <Stack.Toolbar.Button
        icon={isLast ? (isIOS ? "flag.checkered" : Flag) : isIOS ? "chevron.right" : ChevronRight}
        accessibilityLabel={isLast ? "Finish course" : "Next lesson"}
        onPress={next}
      />
    </Stack.Toolbar>
  );
}

/** The design's footer (lesson_player #bottom-actions), kept for web. */
function WebFooter({ previous, next, isLast, completed, locked, saving, onToggleCompleted }: Props) {
  const insets = useSafeAreaInsets();
  const disabled = locked || saving;
  return (
    <View style={[tw`bg-surface border-t border-border px-screen pt-6`, { paddingBottom: Math.max(40, insets.bottom + 16) }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: completed, disabled }}
        disabled={disabled}
        onPress={onToggleCompleted}
        style={({ pressed }) => [
          tw.style(
            "flex-row items-center justify-center gap-2 border py-3 rounded-xl mb-4",
            completed || pressed ? "border-primary bg-primary-tint" : "border-border",
          ),
          { opacity: locked ? 0.4 : 1 },
        ]}
      >
        <Icon as={completed ? CircleCheck : Circle} size="lg" color={completed ? "primary" : "ink"} />
        <AppText style={tw`text-15 font-semibold text-ink`}>{completed ? "Completed" : "Mark as Completed"}</AppText>
      </Pressable>

      <View style={tw`flex-row items-center gap-4`}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !previous }}
          disabled={!previous}
          onPress={() => previous?.()}
          style={({ pressed }) => [
            tw`flex-1 flex-row items-center justify-center gap-2 py-3.5 border border-border rounded-2xl`,
            pressScale(pressed, 0.95),
            { opacity: previous ? 1 : 0.4 },
          ]}
        >
          <Icon as={ArrowLeft} size="md" color="ink" />
          <AppText style={tw`text-16 font-bold text-ink`}>Previous</AppText>
        </Pressable>
        <Button
          title={isLast ? "Finish Course" : "Next Lesson"}
          variant="primary-bold"
          trailing={<Icon as={ArrowRight} size="md" color={buttonInk("primary-bold")} />}
          onPress={next}
          style={tw`flex-1 py-3.5`}
        />
      </View>
    </View>
  );
}
