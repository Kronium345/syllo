import { Circle, CircleCheck } from "lucide-react-native";
import { useState } from "react";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useAiConsent } from "@/lib/queries/viva";
import { tw } from "@/theme";

function Check({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={onToggle}
      style={tw`flex-row items-center gap-3 py-2`}
    >
      <Icon as={checked ? CircleCheck : Circle} size="lg" color={checked ? "primary" : "muted"} />
      <AppText style={tw`flex-1 text-15 text-ink`}>{label}</AppText>
    </Pressable>
  );
}

const POINTS = [
  "In viva and interview practice, Syllo reads each question aloud and records your spoken answer (up to 3 minutes).",
  "The recording and the question are sent to Google Gemini to transcribe and grade your answer. For interviews about a role you type, the role is sent too.",
  "Recordings aren't kept. The transcript and feedback are saved to your account and deleted with it.",
  "Feedback is AI-generated study help, not clinical or professional advice.",
];

/**
 * One-time consent before the first viva or interview (prompts/17, 18): Apple guideline 5.1.2(i) needs explicit
 * permission before sending personal data to third-party AI, and the Gemini API terms need
 * users to be 18+. Sets profiles.ai_consent_at; start_viva_session refuses without it.
 */
export function AiConsentSheet({ visible, onClose, onAgreed }: { visible: boolean; onClose: () => void; onAgreed: () => void }) {
  const consent = useAiConsent();
  const [adult, setAdult] = useState(false);
  const [agreed, setAgreed] = useState(false);
  // Start unticked every time the sheet opens (state adjusted during render).
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) {
      setAdult(false);
      setAgreed(false);
    }
  }

  const accept = () =>
    consent.mutate(true, {
      onSuccess: onAgreed,
      onError: () => toast.error("Couldn't save your choice.", "Check your connection and try again."),
    });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Practice with AI feedback"
      footer={
        <Button title="Continue" disabled={!adult || !agreed} loading={consent.isPending} onPress={accept} />
      }
    >
      <View style={tw`gap-4 pt-1`}>
        <View style={tw`gap-3`}>
          {POINTS.map((point) => (
            <View key={point} style={tw`flex-row gap-2`}>
              <AppText variant="body">•</AppText>
              <AppText variant="body" style={tw`flex-1`}>
                {point}
              </AppText>
            </View>
          ))}
        </View>
        <View>
          <Check checked={adult} label="I'm 18 or over" onToggle={() => setAdult((value) => !value)} />
          <Check
            checked={agreed}
            label="I agree to send my voice answers to Google Gemini for feedback"
            onToggle={() => setAgreed((value) => !value)}
          />
        </View>
        <AppText variant="footnote">You can withdraw this any time in Profile → Settings.</AppText>
      </View>
    </Sheet>
  );
}
