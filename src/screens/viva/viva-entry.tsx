import { router } from "expo-router";
import { Mic } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";

import { Button, buttonInk } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useMyProfile } from "@/lib/queries/profiles";
import { usePremium } from "@/lib/queries/purchases";
import { useStartViva, useVivaSessionsLeft } from "@/lib/queries/viva";
import { AiConsentRequiredError, VivaLimitError } from "@/services/errors";
import { tw } from "@/theme";

import { AiConsentSheet } from "./ai-consent-sheet";

/**
 * "Explain it out loud" on quiz Results (prompts/17): asks for AI consent once, then starts
 * (or reopens) a viva for this attempt. Recording needs the app, so web shows a notice instead.
 */
export function VivaEntry({ attemptId }: { attemptId: string }) {
  const native = process.env.EXPO_OS !== "web";
  const profile = useMyProfile();
  const premium = usePremium();
  const left = useVivaSessionsLeft({ enabled: native });
  const start = useStartViva();
  const [consentOpen, setConsentOpen] = useState(false);

  if (!native) {
    return (
      <AppText variant="footnote" style={tw`text-center mb-3`}>
        Viva practice is available in the Syllo app.
      </AppText>
    );
  }

  const isPro = premium.data === true;
  const period = isPro ? "today" : "this week";

  const begin = () =>
    start.mutate(attemptId, {
      onSuccess: (sessionId) => router.push({ pathname: "/viva/[id]", params: { id: sessionId } }),
      onError: (error) => {
        if (error instanceof AiConsentRequiredError) {
          setConsentOpen(true);
        } else if (error instanceof VivaLimitError) {
          if (isPro) {
            toast.info("Come back tomorrow", error.message);
          } else {
            toast.info("Weekly viva used", "Upgrade to Pro for 5 vivas a day.");
            router.push("/premium");
          }
        } else if ((error as { code?: string }).code === "P0001") {
          // "Nothing to practise in this quiz." / "Finish the quiz first."
          toast.info(error.message);
        } else {
          toast.error("Couldn't start the viva.", "Check your connection and try again.");
        }
      },
    });

  const onPress = () => (profile.data?.aiConsentAt ? begin() : setConsentOpen(true));

  return (
    <View style={tw`mb-3`}>
      <Button
        title="Explain it out loud"
        variant="outline-primary"
        leading={<Icon as={Mic} size="md" color={buttonInk("outline-primary")} />}
        loading={start.isPending}
        onPress={onPress}
      />
      {left.data !== undefined ? (
        <AppText variant="footnote" style={tw`text-center mt-2`}>
          {left.data === 0 ? `No vivas left ${period}` : `${left.data} ${left.data === 1 ? "viva" : "vivas"} left ${period}`}
        </AppText>
      ) : null}
      <AiConsentSheet
        visible={consentOpen}
        onClose={() => setConsentOpen(false)}
        onAgreed={() => {
          setConsentOpen(false);
          begin();
        }}
      />
    </View>
  );
}
