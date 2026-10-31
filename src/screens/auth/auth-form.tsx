import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BrandLogo } from "@/components/ui/brand-logo";
import { Button } from "@/components/ui/button";
import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

import type { SocialProvider } from "./use-social-sign-in";

// The building blocks of the auth screens. The design has no auth screens, so they follow
// its onboarding quizzes: canvas page, 24 gutter, title-xl + subtitle header, primary
// button, and the welcome screen's "Already have an account? Log In" footer.

export function AuthScreen({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <SafeAreaView style={tw`flex-1 bg-canvas`}>
      <KeyboardAvoidingView style={tw`flex-1`} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={tw`grow justify-center gap-6 px-screen py-8`} keyboardShouldPersistTaps="handled">
          <View style={tw`gap-3`}>
            <AppText variant="title-xl" accessibilityRole="header">
              {title}
            </AppText>
            {body ? <AppText variant="subtitle">{body}</AppText> : null}
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function SubmitButton({ title, busy, onPress }: { title: string; busy?: boolean; onPress: () => void }) {
  return <Button title={title} loading={busy} onPress={onPress} />;
}

export function SocialButtons({
  pending,
  onPress,
}: {
  pending: SocialProvider | null;
  onPress: (provider: SocialProvider) => void;
}) {
  return (
    <View style={tw`gap-3`}>
      <View style={tw`flex-row items-center gap-3`}>
        <View style={tw`flex-1 h-px bg-border`} />
        <AppText variant="caption">or</AppText>
        <View style={tw`flex-1 h-px bg-border`} />
      </View>
      {(["google", "apple"] as const).map((provider) => (
        <Button
          key={provider}
          variant="outline"
          title={`Continue with ${provider === "google" ? "Google" : "Apple"}`}
          leading={<BrandLogo name={provider} />}
          loading={pending === provider}
          disabled={!!pending && pending !== provider}
          onPress={() => onPress(provider)}
        />
      ))}
    </View>
  );
}

export function FooterLink({ prompt, action, onPress }: { prompt: string; action: string; onPress: () => void }) {
  return (
    <View style={tw`flex-row justify-center gap-1`}>
      <AppText variant="caption">{prompt}</AppText>
      <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
        <AppText style={tw`text-13 font-semibold text-primary`}>{action}</AppText>
      </Pressable>
    </View>
  );
}
