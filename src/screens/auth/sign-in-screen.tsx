import { useSignIn } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

import { AuthField, AuthScreen, ErrorLine, FooterLink, SocialButtons, SubmitButton, type TextInputRef } from "./auth-form";
import { clerkErrorMessage, clerkFieldErrors } from "./clerk-errors";
import { useSocialSignIn } from "./use-social-sign-in";
import { firstInvalid, validateEmail, validatePassword } from "./validate";

type Field = "email" | "password";
const FIELDS: Field[] = ["email", "password"];

// Clerk's param names for the fields on this form.
const fieldForParam: Record<string, Field> = {
  identifier: "email",
  email_address: "email",
  password: "password",
};

export function SignInScreen() {
  const router = useRouter();
  const { signIn, fetchStatus } = useSignIn();
  const social = useSocialSignIn();
  const [values, setValues] = useState<Record<Field, string>>({ email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [message, setMessage] = useState<string | null>(null);
  const emailRef = useRef<TextInputRef>(null);
  const passwordRef = useRef<TextInputRef>(null);
  const refs = { email: emailRef, password: passwordRef };

  const update = (field: Field) => (text: string) => {
    setValues((current) => ({ ...current, [field]: text }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const fail = (fieldErrors: Partial<Record<Field, string>>, text: string) => {
    setErrors(fieldErrors);
    setMessage(text);
    const field = firstInvalid(fieldErrors, FIELDS);
    if (field) refs[field].current?.focus();
  };

  const submit = async () => {
    const local = { email: validateEmail(values.email), password: validatePassword(values.password) };
    const invalid = firstInvalid(local, FIELDS);
    if (invalid) return fail(local, local[invalid]!);

    setMessage(null);
    const { error } = await signIn.password({ emailAddress: values.email.trim(), password: values.password });
    if (error) return fail(clerkFieldErrors(error, fieldForParam), clerkErrorMessage(error));

    if (signIn.status === "complete") {
      // Starting the session closes the (auth) group; the index route redirects to /home.
      const { error: finalizeError } = await signIn.finalize();
      if (finalizeError) setMessage(clerkErrorMessage(finalizeError));
      return;
    }

    // A new device (or an account with email-code 2FA): Clerk wants a code first.
    const needsCode = signIn.status === "needs_client_trust" || signIn.status === "needs_second_factor";
    if (needsCode && signIn.supportedSecondFactors.some((factor) => factor.strategy === "email_code")) {
      const { error: sendError } = await signIn.mfa.sendEmailCode();
      if (sendError) return setMessage(clerkErrorMessage(sendError));
      router.push({ pathname: "/verify-email", params: { flow: "sign-in" } });
      return;
    }

    setMessage("This sign-in needs a step Syllo doesn't support yet.");
    await signIn.reset();
  };

  return (
    <AuthScreen title="Welcome back" body="Sign in to pick up where you left off.">
      <View style={{ gap: 12 }}>
        <AuthField
          ref={emailRef}
          label="Email address"
          placeholder="you@example.com"
          value={values.email}
          onChangeText={update("email")}
          error={errors.email}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType="emailAddress"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <AuthField
          ref={passwordRef}
          label="Password"
          placeholder="Your password"
          value={values.password}
          onChangeText={update("password")}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </View>
      <ErrorLine message={message ?? social.message} />
      <SubmitButton title="Sign in" busy={fetchStatus === "fetching"} onPress={submit} />
      <SocialButtons pending={social.pending} onPress={social.start} />
      <FooterLink prompt="New to Syllo?" action="Create an account" onPress={() => router.replace("/sign-up")} />
    </AuthScreen>
  );
}
