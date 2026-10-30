import type { ComponentRef, ReactNode, Ref } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { SocialProvider } from "./use-social-sign-in";

// The building blocks of the auth screens. Plain placeholder styles until the design
// system exists (prompts/01-design-system.md); the Clerk logic lives in the screens.

export function AuthScreen({ title, body, children }: { title: string; body?: string; children: ReactNode }) {
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {body ? <Text style={styles.muted}>{body}</Text> : null}
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export type TextInputRef = ComponentRef<typeof TextInput>;

type AuthFieldProps = TextInputProps & { label: string; error?: string; ref?: Ref<TextInputRef> };

export function AuthField({ label, error, ref, style, ...input }: AuthFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        ref={ref}
        accessibilityLabel={label}
        accessibilityHint={error}
        placeholderTextColor="#9CA3AF"
        style={[styles.input, error ? styles.inputError : null, style]}
        {...input}
      />
    </View>
  );
}

/** One line for what went wrong (local checks or Clerk's message), above the submit button. */
export function ErrorLine({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <Text accessibilityRole="alert" style={styles.error}>
      {message}
    </Text>
  );
}

export function SubmitButton({ title, busy, onPress }: { title: string; busy?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy, busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.submit, busy && styles.disabled]}
    >
      <Text style={styles.submitText}>{busy ? "…" : title}</Text>
    </Pressable>
  );
}

export function SocialButtons({
  pending,
  onPress,
}: {
  pending: SocialProvider | null;
  onPress: (provider: SocialProvider) => void;
}) {
  return (
    <View style={styles.social}>
      <Text style={[styles.muted, styles.center]}>or</Text>
      {(["google", "apple"] as const).map((provider) => (
        <Pressable
          key={provider}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!pending, busy: pending === provider }}
          disabled={!!pending}
          onPress={() => onPress(provider)}
          style={[styles.secondary, pending && styles.disabled]}
        >
          <Text>
            {pending === provider ? "…" : `Continue with ${provider === "google" ? "Google" : "Apple"}`}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function FooterLink({ prompt, action, onPress }: { prompt: string; action: string; onPress: () => void }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.muted}>{prompt}</Text>
      <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
        <Text style={styles.link}>{action}</Text>
      </Pressable>
    </View>
  );
}

// Placeholder styles until the design system exists (prompts/01-design-system.md).
const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flexGrow: 1, justifyContent: "center", gap: 16, padding: 24 },
  title: { fontSize: 28, fontWeight: "700" },
  muted: { color: "#6B7280" },
  center: { textAlign: "center" },
  field: { gap: 6 },
  label: { fontWeight: "500" },
  input: { borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  inputError: { borderColor: "#DC2626" },
  error: { color: "#DC2626" },
  submit: { alignItems: "center", backgroundColor: "#208AEF", borderRadius: 999, paddingVertical: 14 },
  submitText: { color: "#FFFFFF", fontWeight: "600" },
  disabled: { opacity: 0.5 },
  social: { gap: 10 },
  secondary: { alignItems: "center", borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 999, paddingVertical: 12 },
  footer: { flexDirection: "row", justifyContent: "center", gap: 6 },
  link: { color: "#208AEF", fontWeight: "600" },
});
