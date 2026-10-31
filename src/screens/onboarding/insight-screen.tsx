import { Image } from "expo-image";
import { router } from "expo-router";
import { ScrollView, View } from "react-native";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

import { OnboardingHeader } from "./onboarding-header";

/** educational_insight (step 3/6). */
export function InsightScreen() {
  return (
    <View style={tw`flex-1 bg-canvas`}>
      <OnboardingHeader step={3} tone="canvas" />
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`items-center px-8`}>
        <View style={tw`mt-12 mb-10 w-full items-center`}>
          <Image
            source={require("@/assets/images/onboarding/insight.png")}
            accessibilityIgnoresInvertColors
            contentFit="contain"
            style={tw`w-64 h-64`}
          />
        </View>
        <Badge label="Did you know?" variant="insight" style={tw`mb-6`} />
        <AppText variant="insight" accessibilityRole="header" style={tw`text-center mb-4`}>
          Structured learning increases retention by 40%.
        </AppText>
        <AppText variant="lead" style={tw`text-center`}>
          Students who follow a guided curriculum are twice as likely to finish their courses and apply their new skills
          effectively.
        </AppText>
      </ScrollView>
      <StickyFooter tone="canvas">
        <Button title="Continue journey" onPress={() => router.push("/onboarding/testimonials")} />
      </StickyFooter>
    </View>
  );
}
