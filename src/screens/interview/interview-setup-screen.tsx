import { router } from "expo-router";
import { Briefcase, ChevronLeft, Clock, MessageSquareText, Mic, Pill } from "lucide-react-native";
import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { OptionCard } from "@/components/ui/option-card";
import { StickyFooter } from "@/components/ui/sticky-footer";
import { AppText } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { useTopPadding } from "@/components/ui/use-top-padding";
import {
  type InterviewMode,
  type InterviewStart,
  type InterviewTarget,
  useInterviewSessionsLeft,
  useStartInterview,
} from "@/lib/queries/interviews";
import { useMyProfile } from "@/lib/queries/profiles";
import { usePremium } from "@/lib/queries/purchases";
import { AiConsentSheet } from "@/screens/viva/ai-consent-sheet";
import { AiConsentRequiredError, InterviewLimitError, RoleNotAcceptedError } from "@/services/errors";
import { type ColorToken, tw } from "@/theme";

import { ROLE_PATTERN, TARGETS } from "./labels";

/** Interview practice setup (prompts/18; not in the design, built from its tokens). */
export function InterviewSetupScreen() {
  const paddingTop = useTopPadding(48);
  const native = process.env.EXPO_OS !== "web";
  const profile = useMyProfile();
  const premium = usePremium();
  const left = useInterviewSessionsLeft({ enabled: native });
  const start = useStartInterview();
  const [mode, setMode] = useState<InterviewMode>("pharmacy");
  const [target, setTarget] = useState<InterviewTarget | null>(null);
  const [role, setRole] = useState("");
  const [roleError, setRoleError] = useState<string | undefined>();
  const [consentOpen, setConsentOpen] = useState(false);

  const isPro = premium.data === true;
  const period = isPro ? "today" : "this week";
  const trimmedRole = role.trim().replace(/\s+/g, " ");
  const ready = mode === "pharmacy" ? target !== null : trimmedRole.length >= 2;

  const begin = () => {
    let request: InterviewStart;
    if (mode === "pharmacy") {
      if (!target) return;
      request = { mode, target };
    } else {
      if (!ROLE_PATTERN.test(trimmedRole)) {
        setRoleError("Use letters, numbers and simple punctuation (2-60 characters).");
        toast.error("Check the role", "Use letters, numbers and simple punctuation (2-60 characters).");
        return;
      }
      request = { mode, role: trimmedRole };
    }
    start.mutate(request, {
      onSuccess: (sessionId) => router.push({ pathname: "/interview/[id]", params: { id: sessionId } }),
      onError: (error) => {
        if (error instanceof AiConsentRequiredError) {
          setConsentOpen(true);
        } else if (error instanceof InterviewLimitError) {
          if (isPro) {
            toast.info("Come back tomorrow", "You've used today's 5 interviews.");
          } else {
            toast.info("Weekly interview used", "Upgrade to Pro for 5 interviews a day.");
            router.push("/premium");
          }
        } else if (error instanceof RoleNotAcceptedError) {
          setRoleError("Try a different role.");
          toast.error("Try a different role", "Type a real job, like “Retail assistant” or “Pharmacy technician”.");
        } else {
          toast.error("Couldn't start the interview.", "Check your connection and try again.");
        }
      },
    });
  };
  const onStart = () => (profile.data?.aiConsentAt ? begin() : setConsentOpen(true));

  return (
    <KeyboardAvoidingView behavior={process.env.EXPO_OS === "ios" ? "padding" : undefined} style={tw`flex-1 bg-canvas`}>
      <View style={[tw`px-screen pb-4 flex-row items-center gap-4`, { paddingTop }]}>
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={() => router.back()} />
        <AppText variant="title" accessibilityRole="header" style={tw`flex-1`}>
          Interview practice
        </AppText>
      </View>

      <ScrollView style={tw`flex-1`} contentContainerStyle={tw`px-screen pb-6 gap-6`} keyboardShouldPersistTaps="handled">
        <AppText variant="subtitle">
          Answer 5 interview questions out loud and get AI feedback on each one, then an overall summary.
        </AppText>

        {native ? (
          <>
            <View style={tw`gap-3`}>
              <OptionCard
                icon={Pill}
                title="Pharmacy careers"
                description="Foundation training, community, hospital or placement interviews"
                selected={mode === "pharmacy"}
                onPress={() => setMode("pharmacy")}
              />
              <OptionCard
                icon={Briefcase}
                title="Any role"
                description="Type the job you're applying for and get questions written for it"
                selected={mode === "general"}
                onPress={() => setMode("general")}
              />
            </View>

            {mode === "pharmacy" ? (
              <View style={tw`gap-3`}>
                <AppText variant="heading" accessibilityRole="header">
                  What are you applying for?
                </AppText>
                <View style={tw`flex-row flex-wrap gap-2`}>
                  {TARGETS.map((option) => (
                    <Chip
                      key={option.value}
                      label={option.label}
                      role="radio"
                      selected={target === option.value}
                      onPress={() => setTarget(option.value)}
                    />
                  ))}
                </View>
              </View>
            ) : (
              <TextField
                label="Role you're applying for"
                placeholder="e.g. Retail assistant"
                value={role}
                onChangeText={(text) => {
                  setRole(text);
                  setRoleError(undefined);
                }}
                error={roleError}
                maxLength={60}
                autoCapitalize="sentences"
                returnKeyType="done"
              />
            )}

            <Card style={tw`p-4 gap-3`}>
              <Fact icon={MessageSquareText} tint="primary" text="5 questions, read aloud" />
              <Fact icon={Clock} tint="streak" text="Up to 3 minutes per answer" />
              <Fact icon={Mic} tint="success" text="AI feedback after every answer, then a readiness score" />
            </Card>
          </>
        ) : (
          <AppText variant="callout">Interview practice is available in the Syllo app.</AppText>
        )}
      </ScrollView>

      {native ? (
        <StickyFooter>
          <Button
            title="Start interview"
            disabled={!ready}
            loading={start.isPending}
            onPress={onStart}
          />
          <AppText variant="footnote" style={tw`text-center mt-3`}>
            {start.isPending && mode === "general"
              ? "Writing questions for this role…"
              : left.data === undefined
                ? " "
                : left.data === 0
                  ? `No interviews left ${period}`
                  : `${left.data} ${left.data === 1 ? "interview" : "interviews"} left ${period}`}
          </AppText>
        </StickyFooter>
      ) : null}

      <AiConsentSheet
        visible={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAgreed={() => {
          setConsentOpen(false);
          begin();
        }}
      />
    </KeyboardAvoidingView>
  );
}

function Fact({ icon, tint, text }: { icon: typeof Mic; tint: ColorToken; text: string }) {
  return (
    <View style={tw`flex-row items-center gap-3`}>
      <Icon as={icon} size="md" color={tint} />
      <AppText style={tw`flex-1 text-15 text-ink`}>{text}</AppText>
    </View>
  );
}
