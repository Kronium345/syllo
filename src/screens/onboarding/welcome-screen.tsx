import { Image } from "expo-image";
import { router } from "expo-router";
import { Star } from "lucide-react-native";
import { ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Fade } from "@/components/ui/fade";
import { Icon } from "@/components/ui/icon";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

const LEARNERS = [
  require("@/assets/images/onboarding/avatar-1.png"),
  require("@/assets/images/onboarding/avatar-2.png"),
  require("@/assets/images/onboarding/avatar-3.png"),
];

/** welcome_onboarding: the first screen signed-out visitors see. */
export function WelcomeScreen() {
  return (
    <View style={tw`flex-1 bg-canvas`}>
      <ScrollView style={tw`flex-1`} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={tw`h-[480px] w-full overflow-hidden`}>
          <Image
            source={require("@/assets/images/onboarding/welcome-hero.png")}
            accessibilityIgnoresInvertColors
            contentFit="cover"
            style={tw`w-full h-full`}
          />
          <Fade to="canvas" via={50} />
        </View>

        <View style={tw`px-8 -mt-20`}>
          <View
            style={tw`self-start flex-row items-center gap-2 bg-surface border border-border rounded-full px-3 py-1.5 shadow-card mb-6`}
          >
            <View style={tw`flex-row`}>
              {LEARNERS.map((source, index) => (
                <Image
                  key={index}
                  source={source}
                  accessibilityIgnoresInvertColors
                  contentFit="cover"
                  style={tw.style("w-6 h-6 rounded-full border-2 border-surface", index > 0 && "-ml-2")}
                />
              ))}
            </View>
            <AppText style={tw`text-13 font-medium text-ink`}>Join 500k+ learners</AppText>
            <View style={tw`flex-row items-center gap-1 ml-1 pl-2 border-l border-border`}>
              <Icon as={Star} size="xs" color="star" />
              <AppText style={tw`text-13 font-bold text-ink`}>4.9</AppText>
            </View>
          </View>

          <AppText variant="display" accessibilityRole="header" style={tw`leading-tight tracking-tight mb-4`}>
            Master new skills at your own pace.
          </AppText>
          <AppText variant="lead" style={tw`mb-10`}>
            Access expert-led video lessons, interactive quizzes, and industry-recognized certificates in one calm
            space.
          </AppText>
        </View>
      </ScrollView>

      <StickyFooter tone="canvas">
        <Button title="Get Started" onPress={() => router.push("/onboarding/goal")} />
        <AppText variant="caption" style={tw`text-center mt-4`}>
          Already have an account?{" "}
          <AppText
            accessibilityRole="link"
            onPress={() => router.push("/sign-in")}
            style={tw`text-13 font-semibold text-primary`}
          >
            Log In
          </AppText>
        </AppText>
      </StickyFooter>
    </View>
  );
}
