import { router } from "expo-router";
import { ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { INTERESTS, MIN_INTERESTS } from "@/lib/onboarding/options";
import { onboarding, useOnboardingAnswers } from "@/lib/onboarding/store";
import { tw } from "@/theme";

import { InterestCard } from "./interest-card";
import { OnboardingHeader } from "./onboarding-header";

// Two tiles per row (`grid grid-cols-2 gap-3`).
const ROWS = Array.from({ length: Math.ceil(INTERESTS.length / 2) }, (_, row) => INTERESTS.slice(row * 2, row * 2 + 2));

/** interest_selection_quiz (step 2/6): at least three topics. */
export function InterestsScreen() {
  const { interests } = useOnboardingAnswers();
  return (
    <View style={tw`flex-1 bg-surface`}>
      <OnboardingHeader step={2} />
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-screen pb-6`}>
        <View style={tw`mb-8 mt-4`}>
          <AppText variant="title-xl" accessibilityRole="header" style={tw`mb-3`}>
            Choose your interests
          </AppText>
          <AppText variant="subtitle">Pick at least 3 topics to help us personalize your learning path.</AppText>
        </View>
        <View style={tw`gap-3`}>
          {ROWS.map((row) => (
            <View key={row[0].id} style={tw`flex-row gap-3`}>
              {row.map((interest) => (
                <InterestCard
                  key={interest.id}
                  icon={interest.icon}
                  label={interest.label}
                  selected={interests.includes(interest.id)}
                  onPress={() => onboarding.toggleInterest(interest.id)}
                />
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
      <StickyFooter>
        <Button
          title="Continue"
          disabled={interests.length < MIN_INTERESTS}
          onPress={() => router.push("/onboarding/insight")}
        />
      </StickyFooter>
    </View>
  );
}
