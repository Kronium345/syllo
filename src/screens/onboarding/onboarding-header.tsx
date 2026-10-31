import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { View } from "react-native";

import { IconButton } from "@/components/ui/icon-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AppText } from "@/components/ui/text";
import { useTopPadding } from "@/components/ui/use-top-padding";
import { tw } from "@/theme";

/** Six steps in all: four questions, the paywall, then sign-up. */
const TOTAL_STEPS = 6;

/**
 * The quiz header (`px-6 pt-12 pb-6`): back button, step progress and "n/6".
 * `tone="canvas"` is the insight step's (gray-200 track on the grey page).
 */
export function OnboardingHeader({ step, tone = "surface" }: { step: number; tone?: "surface" | "canvas" }) {
  const paddingTop = useTopPadding(48);
  return (
    <View style={[tw`px-screen pb-6 flex-row items-center justify-between`, { paddingTop }]}>
      <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
      <View style={tw`flex-1 mx-8`}>
        <ProgressBar progress={step / TOTAL_STEPS} size="md" track={tone === "canvas" ? "bg-border" : "bg-track"} />
      </View>
      <AppText style={tw`w-10 text-right text-13 font-semibold text-muted`}>
        {step}/{TOTAL_STEPS}
      </AppText>
    </View>
  );
}
