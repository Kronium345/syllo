import { Image } from "expo-image";
import { ArrowLeft, ArrowRight, Bell, ChevronLeft, CirclePlay, Share2, SlidersHorizontal, X } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button, buttonInk } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Fade } from "@/components/ui/fade";
import { Glass } from "@/components/ui/glass";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SearchField } from "@/components/ui/search-field";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { showBanner } from "@/lib/notifications/banner";
import { GOALS, INTERESTS } from "@/lib/onboarding/options";
import { InterestCard } from "@/screens/onboarding/interest-card";
import { OnboardingHeader } from "@/screens/onboarding/onboarding-header";
import { AnswerCard } from "@/screens/quiz/answer-card";
import { OptionCard } from "@/components/ui/option-card";
import { type ColorToken, type TextVariant, tw } from "@/theme";

const COLORS: ColorToken[] = [
  "primary",
  "primary-tint",
  "primary-soft",
  "ink",
  "muted",
  "faint",
  "placeholder",
  "canvas",
  "surface",
  "subtle",
  "track",
  "border",
  "star",
  "star-deep",
  "streak",
  "streak-tint",
  "success",
  "success-deep",
  "danger",
  "danger-tint",
  "info",
  "scrim",
];

const VARIANTS: TextVariant[] = [
  "display",
  "insight",
  "title-xl",
  "title-lg",
  "title",
  "heading",
  "lead",
  "option",
  "subtitle",
  "body",
  "card-title",
  "callout",
  "callout-strong",
  "caption",
  "caption-strong",
  "footnote",
  "badge",
  "tab",
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={tw`gap-4`}>
      <AppText variant="heading" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

// Dev-only preview of the design system (prompts/01-design-system.md): every colour token,
// text variant and component state, to compare with the prototype at 393 wide on web.
export function DesignSystemScreen() {
  const insets = useSafeAreaInsets();
  const [chip, setChip] = useState("All Courses");
  const [search, setSearch] = useState("");
  const [goal, setGoal] = useState(true);

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <ScrollView contentContainerStyle={[tw`gap-10 px-screen pb-10`, { paddingTop: insets.top + 24 }]}>
        <AppText variant="title-xl" accessibilityRole="header">
          Design system
        </AppText>

        <Section title="Colours">
          <View style={tw`flex-row flex-wrap gap-3`}>
            {COLORS.map((token) => (
              <View key={token} style={tw`w-20 gap-1`}>
                <View style={tw.style("h-12 rounded-xl border border-border", `bg-${token}`)} />
                <AppText variant="footnote">{token}</AppText>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Type">
          {VARIANTS.map((variant) => (
            <AppText key={variant} variant={variant}>
              {variant} · Master new skills
            </AppText>
          ))}
        </Section>

        <Section title="Buttons">
          <Button title="Get Started" />
          <Button
            title="Resume Lesson"
            variant="primary-bold"
            leading={<Icon as={CirclePlay} size="md" color={buttonInk("primary-bold")} />}
          />
          <View style={tw`flex-row gap-4`}>
            <Button
              title="Previous"
              variant="outline"
              leading={<Icon as={ArrowLeft} size="sm" color={buttonInk("outline")} />}
              style={tw`flex-1`}
            />
            <Button
              title="Next Lesson"
              variant="primary-bold"
              trailing={<Icon as={ArrowRight} size="sm" color={buttonInk("primary-bold")} />}
              style={tw`flex-1`}
            />
          </View>
          <View style={tw`flex-row items-center gap-4`}>
            <Button title="Follow" variant="outline-primary" />
            <Button title="See All" variant="link" />
            <Button title="Loading" loading style={tw`flex-1`} />
          </View>
          <Button title="Delete" variant="danger" />
          <Button title="Disabled" disabled />
        </Section>

        <Section title="Icon buttons">
          <View style={tw`flex-row items-center gap-3`}>
            <IconButton icon={ChevronLeft} accessibilityLabel="Back" />
            <IconButton icon={Bell} accessibilityLabel="Notifications" />
            <IconButton icon={Share2} accessibilityLabel="Share" variant="glass" />
            <IconButton icon={SlidersHorizontal} accessibilityLabel="Filters" variant="filter" />
            <IconButton icon={X} accessibilityLabel="Close" variant="close" />
            <View style={tw`bg-black p-2 rounded-xl`}>
              <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="glass-dark" />
            </View>
          </View>
        </Section>

        <Section title="Badges and chips">
          <View style={tw`flex-row items-center gap-3`}>
            <Badge label="In Progress" />
            <Badge label="Did you know?" variant="insight" />
            <View style={tw`bg-ink p-2 rounded-xl`}>
              <Badge label="4.8" variant="rating" />
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw`gap-2`}>
            {["All Courses", "Design", "Business", "Coding", "Marketing"].map((label) => (
              <Chip key={label} label={label} selected={chip === label} onPress={() => setChip(label)} />
            ))}
          </ScrollView>
        </Section>

        <Section title="Cards and progress">
          <Card shadow radius="card" style={tw`p-5 gap-4`}>
            <Badge label="In Progress" />
            <AppText variant="title">Mastering Figma: Advanced UI Design Systems</AppText>
            <AppText variant="callout">by Alex Rivera • 12/18 Lessons</AppText>
            <View style={tw`gap-2`}>
              <View style={tw`flex-row justify-between`}>
                <AppText variant="caption-strong">Course Progress</AppText>
                <AppText style={tw`text-13 font-bold text-primary`}>65%</AppText>
              </View>
              <ProgressBar progress={0.65} />
            </View>
          </Card>
          <ProgressBar progress={1 / 6} size="md" />
          <View style={tw`bg-black p-4 rounded-xl`}>
            <ProgressBar progress={0.65} size="sm" track="bg-veil-strong" />
          </View>
        </Section>

        <Section title="Fields">
          <View style={tw`flex-row items-center gap-3`}>
            <SearchField placeholder="Search for any course..." value={search} onChangeText={setSearch} />
            <IconButton icon={SlidersHorizontal} accessibilityLabel="Filters" variant="filter" />
          </View>
          <TextField label="Email address" placeholder="you@example.com" />
          <TextField label="Password" placeholder="At least 8 characters" secureTextEntry error="Too short" />
        </Section>

        <Section title="People">
          <View style={tw`flex-row items-center gap-4`}>
            <Avatar name="Sarah" size="xs" />
            <Avatar name="Sarah" size="sm" bordered />
            <Avatar name="Alex" size="md" />
            <Avatar name="Jane" size="xl" />
          </View>
        </Section>

        <Section title="Glass">
          <View style={tw`bg-primary rounded-2xl p-4`}>
            <Glass style={tw`rounded-xl p-4`}>
              <AppText variant="callout-strong">Translucent bar (white/80 + blur on iOS)</AppText>
            </Glass>
          </View>
        </Section>

        <Section title="Fade">
          <View style={tw`h-32 rounded-2xl overflow-hidden bg-primary`}>
            <Image
              source={require("@/assets/images/courses/advanced-animations.jpg")}
              contentFit="cover"
              style={tw`absolute inset-0`}
            />
            <Fade to="canvas" via={50} />
          </View>
        </Section>

        <Section title="Onboarding">
          <OnboardingHeader step={2} />
          <OptionCard
            icon={GOALS[0].icon}
            title={GOALS[0].title}
            description={GOALS[0].description}
            selected={goal}
            onPress={() => setGoal((value) => !value)}
          />
          <View style={tw`flex-row gap-3`}>
            <InterestCard icon={INTERESTS[0].icon} label={INTERESTS[0].label} selected onPress={() => {}} />
            <InterestCard icon={INTERESTS[1].icon} label={INTERESTS[1].label} selected={false} onPress={() => {}} />
          </View>
        </Section>

        <Section title="Quiz answers">
          <AnswerCard letter="A" text="Idle answer" state="idle" />
          <AnswerCard letter="B" text="Correct answer" state="correct" />
          <AnswerCard letter="C" text="Wrong pick" state="wrong" />
          <AnswerCard letter="D" text="Other answers after grading" state="dimmed" />
        </Section>

        <Section title="Notifications">
          <Button
            title="Show test banner"
            variant="outline"
            onPress={() => showBanner({ title: "Lesson unlocked", message: "Chapter 2 is ready for you." })}
          />
        </Section>
      </ScrollView>
      <StickyFooter>
        <Button title="Continue" />
      </StickyFooter>
    </View>
  );
}
