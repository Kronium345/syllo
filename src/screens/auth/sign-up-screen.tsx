import { useSignUp } from "@clerk/expo";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { View } from "react-native";

import { TextField, type TextInputRef } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { tw } from "@/theme";
import { splitFullName } from "@/lib/display-name";

import { AuthScreen, FooterLink, SocialButtons, SubmitButton } from "./auth-form";
import { clerkFieldErrors, reportClerkError } from "./clerk-errors";
import { reportInvalid } from "./report-invalid";
import { useSocialSignIn } from "./use-social-sign-in";
import { firstInvalid, MIN_PASSWORD_LENGTH, validateEmail, validateName, validateNewPassword } from "./validate";

type Field = "name" | "email" | "password";
const FIELDS: Field[] = ["name", "email", "password"];

// Clerk's param names for the fields on this form.
const fieldForParam: Record<string, Field> = {
  first_name: "name",
  last_name: "name",
  email_address: "email",
  password: "password",
};

export function SignUpScreen() {
  const router = useRouter();
  const { signUp, fetchStatus } = useSignUp();
  const social = useSocialSignIn();
  const [values, setValues] = useState<Record<Field, string>>({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const nameRef = useRef<TextInputRef>(null);
  const emailRef = useRef<TextInputRef>(null);
  const passwordRef = useRef<TextInputRef>(null);
  const refs = { name: nameRef, email: emailRef, password: passwordRef };

  const update = (field: Field) => (text: string) => {
    setValues((current) => ({ ...current, [field]: text }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  // Red borders on the failed fields, focus on the first; the caller shows the toast.
  const markInvalid = (fieldErrors: Partial<Record<Field, string>>) => {
    setErrors(fieldErrors);
    const field = firstInvalid(fieldErrors, FIELDS);
    if (field) refs[field].current?.focus();
  };

  const submit = async () => {
    const local = {
      name: validateName(values.name),
      email: validateEmail(values.email),
      password: validateNewPassword(values.password),
    };
    if (reportInvalid(local)) return markInvalid(local);

    const { firstName, lastName } = splitFullName(values.name);
    const params = { emailAddress: values.email.trim(), password: values.password, firstName, lastName };
    // password() updates the client's current sign-up when one exists. One left over from an
    // earlier attempt (a finished Google sign-up, or one that expired) is gone on Clerk's side,
    // so updating it fails with "No sign up attempt was found". create() always starts a new one.
    const { error } = signUp.id ? await signUp.create(params) : await signUp.password(params);
    if (error) {
      markInvalid(clerkFieldErrors(error, fieldForParam));
      return reportClerkError(error);
    }

    if (signUp.status === "complete") {
      // The instance didn't ask for verification: start the session straight away.
      const { error: finalizeError } = await signUp.finalize();
      if (finalizeError) return reportClerkError(finalizeError);
      toast.success(`Welcome to Syllo, ${firstName}.`);
      return;
    }

    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) return reportClerkError(sendError);
    // The email stays on Clerk's sign-up, never in the URL.
    router.push("/verify-email");
  };

  return (
    <AuthScreen title="Create your account" body="Learn at your own pace, one lesson at a time.">
      <View style={tw`gap-4`}>
        <TextField
          ref={nameRef}
          label="Full name"
          placeholder="e.g. Alex Morgan"
          value={values.name}
          onChangeText={update("name")}
          error={errors.name}
          autoComplete="name"
          textContentType="name"
          returnKeyType="next"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <TextField
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
        <TextField
          ref={passwordRef}
          label="Password"
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          value={values.password}
          onChangeText={update("password")}
          error={errors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="done"
          onSubmitEditing={submit}
        />
      </View>
      {/* Mount point for Clerk's bot protection challenge (web). */}
      <View nativeID="clerk-captcha" />
      <SubmitButton title="Create account" busy={fetchStatus === "fetching"} onPress={submit} />
      <SocialButtons pending={social.pending} onPress={social.start} />
      <FooterLink prompt="Already have an account?" action="Sign in" onPress={() => router.replace("/sign-in")} />
    </AuthScreen>
  );
}
