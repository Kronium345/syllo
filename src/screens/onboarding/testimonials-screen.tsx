import { Image } from "expo-image";
import { router } from "expo-router";
import { Star } from "lucide-react-native";
import { ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

import { OnboardingHeader } from "./onboarding-header";

// The prototype's sample testimonials. Replace them with real learners' words (and their
// permission) before release.
const TESTIMONIALS = [
  {
    quote: "The UI/UX course was a game-changer. I landed my first design job just 2 months after finishing the curriculum.",
    name: "Sarah Jenkins",
    role: "Junior Product Designer",
    photo: require("@/assets/images/onboarding/testimonial-1.png"),
  },
  {
    quote: "Incredible depth in the Python for Data Science module. The interactive quizzes really helped me practice.",
    name: "Marcus Zhao",
    role: "Data Analyst",
    photo: require("@/assets/images/onboarding/testimonial-2.png"),
  },
];

/** social_proof_testimonials (step 4/6). */
export function TestimonialsScreen() {
  return (
    <View style={tw`flex-1 bg-surface`}>
      <OnboardingHeader step={4} />
      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-screen pb-6`}>
        <View style={tw`mb-8 mt-4`}>
          <AppText variant="title-xl" accessibilityRole="header" style={tw`mb-3`}>
            Loved by thousands
          </AppText>
          <AppText variant="subtitle">Hear from real students who transformed their careers with us.</AppText>
        </View>
        <View style={tw`gap-4`}>
          {TESTIMONIALS.map((item, index) => (
            <View
              key={item.name}
              style={tw.style("p-6 border border-border rounded-2xl bg-surface", index === 0 && "shadow-card")}
            >
              <View accessibilityLabel="5 out of 5 stars" style={tw`flex-row items-center gap-1 mb-3`}>
                {[0, 1, 2, 3, 4].map((star) => (
                  <Icon key={star} as={Star} size="md" color="star" />
                ))}
              </View>
              <AppText style={tw`text-16 text-ink italic leading-relaxed mb-4`}>&quot;{item.quote}&quot;</AppText>
              <View style={tw`flex-row items-center gap-3`}>
                <Image
                  source={item.photo}
                  accessibilityIgnoresInvertColors
                  contentFit="cover"
                  style={tw`w-10 h-10 rounded-full`}
                />
                <View>
                  <AppText style={tw`text-14 font-bold text-ink`}>{item.name}</AppText>
                  <AppText variant="footnote">{item.role}</AppText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <StickyFooter>
        <Button title="Next" onPress={() => router.push("/paywall")} />
      </StickyFooter>
    </View>
  );
}
