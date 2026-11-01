import { Image } from "expo-image";
import { router } from "expo-router";
import { Star } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Fade } from "@/components/ui/fade";
import { Icon } from "@/components/ui/icon";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

// The prototype's hero is 480 tall; on shorter screens it gives way to the text, down to this.
const HERO_MAX = 480;
const HERO_MIN = 200;
// The text block's -mt-20: it overlaps the bottom of the hero by this much.
const HERO_OVERLAP = 80;

const LEARNERS = [
  require("@/assets/images/onboarding/avatar-1.png"),
  require("@/assets/images/onboarding/avatar-2.png"),
  require("@/assets/images/onboarding/avatar-3.png"),
];

/** welcome_onboarding: the first screen signed-out visitors see. Onboarding follows sign-up (prompts/11). */
export function WelcomeScreen() {
  // Measured with onLayout (not window size, which the server render can't know): the scroll
  // area's height and the text block's, so the hero takes exactly what's left.
  const [viewport, setViewport] = useState(0);
  const [textBlock, setTextBlock] = useState(0);
  const heroHeight =
    viewport > 0 && textBlock > 0
      ? Math.max(HERO_MIN, Math.min(HERO_MAX, viewport - textBlock + HERO_OVERLAP))
      : HERO_MAX;

  return (
    <View style={tw`flex-1 bg-canvas`}>
      {/* The hero takes whatever height the text and footer leave (up to the prototype's 480),
          so on shorter phones the photo shrinks instead of the paragraph disappearing under
          the footer. Flex sizing can't do this inside a ScrollView on Android, so it's measured. */}
      <ScrollView
        style={tw`flex-1`}
        bounces={false}
        showsVerticalScrollIndicator={false}
        onLayout={(event) => setViewport(event.nativeEvent.layout.height)}
      >
        <View style={[tw`w-full overflow-hidden`, { height: heroHeight }]}>
          <Image
            source={require("@/assets/images/onboarding/welcome-hero.png")}
            accessibilityIgnoresInvertColors
            contentFit="cover"
            style={tw`w-full h-full`}
          />
          <Fade to="canvas" via={50} />
        </View>

        <View style={tw`px-8 -mt-20`} onLayout={(event) => setTextBlock(event.nativeEvent.layout.height)}>
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
        <Button title="Get Started" onPress={() => router.push("/sign-up")} />
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
