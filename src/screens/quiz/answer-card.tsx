import { CircleCheck, CircleX } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { pressScale, tw } from "@/theme";

/**
 * One answer (prompts/09, estimated in the option-card style): a letter tile and the text.
 * - `idle`: tappable, border.
 * - `correct`: the right answer once graded (success border and tint, check).
 * - `wrong`: the learner's wrong pick (danger border and tint, cross).
 * - `dimmed`: the other answers after grading.
 * The 2px border takes 1px of padding so cards don't move when graded.
 */
export type AnswerState = "idle" | "correct" | "wrong" | "dimmed";

export function AnswerCard({
  letter,
  text,
  state,
  disabled,
  onPress,
}: {
  letter: string;
  text: string;
  state: AnswerState;
  disabled?: boolean;
  onPress?: () => void;
}) {
  const graded = state === "correct" || state === "wrong";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${letter}. ${text}${state === "correct" ? ", correct answer" : state === "wrong" ? ", your answer, wrong" : ""}`}
      accessibilityState={{ disabled: disabled || state !== "idle" }}
      disabled={disabled || state !== "idle"}
      onPress={onPress}
      style={({ pressed }) => [
        tw.style(
          "rounded-2xl flex-row items-center gap-4",
          state === "correct" && "p-[15px] border-2 border-success bg-success-tint",
          state === "wrong" && "p-[15px] border-2 border-danger bg-danger-tint",
          !graded && "p-4 border border-border bg-surface",
        ),
        { opacity: state === "dimmed" ? 0.6 : 1 },
        state === "idle" && pressScale(pressed),
      ]}
    >
      <View
        style={tw.style(
          "w-8 h-8 rounded-lg items-center justify-center",
          state === "correct" ? "bg-success" : state === "wrong" ? "bg-danger" : "bg-primary-tint",
        )}
      >
        <AppText style={tw.style("text-14 font-bold", graded ? "text-on-primary" : "text-primary")}>{letter}</AppText>
      </View>
      <AppText style={tw`flex-1 text-16 font-medium text-ink leading-snug`}>{text}</AppText>
      {state === "correct" ? <Icon as={CircleCheck} size="xl" color="success" /> : null}
      {state === "wrong" ? <Icon as={CircleX} size="xl" color="danger" /> : null}
    </Pressable>
  );
}
