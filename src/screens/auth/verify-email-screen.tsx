import { useSignIn, useSignUp } from "@clerk/expo";
import { Redirect, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";

import { AuthScreen, SubmitButton } from "./auth-form";
import { type ClerkFailure, reportClerkError } from "./clerk-errors";

const CODE_LENGTH = 6;
const RESEND_SECONDS = 30;

type Flow = "sign-up" | "sign-in";

/**
 * Collects the 6-digit code Clerk emails. `flow=sign-up` (default) verifies a new
 * account's email; `flow=sign-in` is Clerk's new-device check after a password sign-in.
 */
export function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ flow?: string }>();
  const flow: Flow = params.flow === "sign-in" ? "sign-in" : "sign-up";
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const busy = (flow === "sign-up" ? signUpStatus : signInStatus) === "fetching";

  // Read once: the email comes from Clerk's pending attempt, never the URL (which lands
  // in browser history). Once the code is accepted the attempt completes, so a live read
  // would bounce the learner back to the form before the session guard moves them home.
  const [email] = useState(() => {
    if (flow === "sign-up") {
      const waiting = signUp.status === "missing_requirements" && signUp.unverifiedFields.includes("email_address");
      return waiting ? signUp.emailAddress : null;
    }
    const waiting = signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor";
    const factor = signIn.supportedSecondFactors.find((item) => item.strategy === "email_code");
    return waiting && factor && "safeIdentifier" in factor ? factor.safeIdentifier : null;
  });
  const [code, setCode] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (!email) {
    // Nothing to verify, e.g. after a reload: start again.
    return <Redirect href={flow === "sign-up" ? "/sign-up" : "/sign-in"} />;
  }

  const reject = (error?: ClerkFailure | null) => {
    setInvalid(true);
    setCode("");
    reportClerkError(error);
  };

  const verify = async () => {
    if (busy) return;
    if (code.length < CODE_LENGTH) {
      setInvalid(true);
      toast.error(`Enter the ${CODE_LENGTH}-digit code.`);
      return;
    }
    // Finalizing starts the session: the (auth) group closes and the index route
    // redirects to /home.
    if (flow === "sign-up") {
      const { error } = await signUp.verifications.verifyEmailCode({ code });
      if (error) return reject(error);
      if (signUp.status !== "complete") return reject();
      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) return reject(finalizeError);
      toast.success(signUp.firstName ? `Welcome to Syllo, ${signUp.firstName}.` : "Welcome to Syllo.");
      return;
    }
    const { error } = await signIn.mfa.verifyEmailCode({ code });
    if (error) return reject(error);
    if (signIn.status !== "complete") return reject();
    const { error: finalizeError } = await signIn.finalize();
    if (finalizeError) return reject(finalizeError);
    const firstName = signIn.userData.firstName;
    toast.success(firstName ? `Welcome back, ${firstName}.` : "Welcome back.");
  };

  const resend = async () => {
    const { error } =
      flow === "sign-up" ? await signUp.verifications.sendEmailCode() : await signIn.mfa.sendEmailCode();
    if (error) return reportClerkError(error);
    setCooldown(RESEND_SECONDS);
    setCode("");
    setInvalid(false);
    toast.info(`Code sent to ${email}.`);
  };

  return (
    <AuthScreen
      title="Check your email"
      body={`We sent a ${CODE_LENGTH}-digit code to ${email}${flow === "sign-in" ? " to verify it's you" : ""}.`}
    >
      <TextField
        label="Verification code"
        placeholder="123456"
        value={code}
        onChangeText={(text) => {
          setCode(text.replace(/\D/g, "").slice(0, CODE_LENGTH));
          setInvalid(false);
        }}
        error={invalid ? "Check the code and try again." : undefined}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={CODE_LENGTH}
        returnKeyType="done"
        onSubmitEditing={verify}
        autoFocus
      />
      <SubmitButton title="Verify" busy={busy} onPress={verify} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: cooldown > 0 || busy }}
        disabled={cooldown > 0 || busy}
        onPress={resend}
        hitSlop={8}
      >
        <Text style={[styles.resend, (cooldown > 0 || busy) && styles.disabled]}>
          {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
        </Text>
      </Pressable>
    </AuthScreen>
  );
}

// Placeholder styles until the design system exists (prompts/01-design-system.md).
const styles = StyleSheet.create({
  resend: { textAlign: "center", color: "#208AEF", fontWeight: "600" },
  disabled: { opacity: 0.5 },
});
