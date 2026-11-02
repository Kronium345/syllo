import { router } from "expo-router";
import { Briefcase, ChevronRight } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { useInterviewSessionsLeft } from "@/lib/queries/interviews";
import { usePremium } from "@/lib/queries/purchases";
import { pressScale, tw } from "@/theme";

/** Home's way into interview practice (prompts/18; not in the design, built from its tokens). */
export function InterviewCard() {
  const native = process.env.EXPO_OS !== "web";
  const left = useInterviewSessionsLeft({ enabled: native });
  const premium = usePremium();
  const period = premium.data === true ? "today" : "this week";
  const footnote = !native
    ? "Available in the Syllo app"
    : left.data === undefined
      ? null
      : left.data === 0
        ? `No interviews left ${period}`
        : `${left.data} ${left.data === 1 ? "interview" : "interviews"} left ${period}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Practise an interview${footnote ? `. ${footnote}` : ""}`}
      onPress={() => router.push("/interview")}
      style={({ pressed }) => [tw`px-screen mt-8`, pressScale(pressed)]}
    >
      <Card shadow style={tw`p-5 flex-row items-center gap-4`}>
        <View style={tw`w-12 h-12 rounded-2xl bg-primary-soft items-center justify-center`}>
          <Icon as={Briefcase} size="xl" color="primary" />
        </View>
        <View style={tw`flex-1 gap-0.5`}>
          <AppText variant="card-title">Practise an interview</AppText>
          <AppText variant="caption">Answer real interview questions out loud and get AI feedback</AppText>
          {footnote ? (
            <AppText style={tw`text-12 font-semibold text-primary mt-1`}>{footnote}</AppText>
          ) : null}
        </View>
        <Icon as={ChevronRight} size="md" color="muted" />
      </Card>
    </Pressable>
  );
}
