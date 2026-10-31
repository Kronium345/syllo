import { router } from "expo-router";
import { ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { GOALS } from "@/lib/onboarding/options";
import { onboarding, useOnboardingAnswers } from "@/lib/onboarding/store";
import { tw } from "@/theme";

import { OnboardingHeader } from "./onboarding-header";
import { OptionCard } from "./option-card";

/** goal_selection_quiz (step 1/6): one primary goal. */
export function GoalScreen() {
  const { goal } = useOnboardingAnswers();
  return (
    <View style={tw`flex-1 bg-surface`}>
      <OnboardingHeader step={1} />
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-screen pb-6`}>
        <View style={tw`mb-8 mt-4`}>
          <AppText variant="title-xl" accessibilityRole="header" style={tw`mb-3`}>
            What&apos;s your primary goal?
          </AppText>
          <AppText variant="subtitle">We&apos;ll customize your course recommendations based on your choice.</AppText>
        </View>
        <View accessibilityRole="radiogroup" style={tw`gap-4`}>
          {GOALS.map((option) => (
            <OptionCard
              key={option.id}
              icon={option.icon}
              title={option.title}
              description={option.description}
              selected={goal === option.id}
              onPress={() => onboarding.setGoal(option.id)}
            />
          ))}
        </View>
      </ScrollView>
      <StickyFooter>
        <Button title="Continue" disabled={!goal} onPress={() => router.push("/onboarding/interests")} />
      </StickyFooter>
    </View>
  );
}
