import { useSSO } from "@clerk/expo/experimental";
import { useState } from "react";
import { Platform } from "react-native";

import { toast } from "@/components/ui/toast";

import { type ClerkFailure, reportClerkError } from "./clerk-errors";

export type SocialProvider = "google" | "apple";

const providers: Record<SocialProvider, { strategy: "oauth_google" | "oauth_apple"; label: string }> = {
  google: { strategy: "oauth_google", label: "Google" },
  apple: { strategy: "oauth_apple", label: "Apple" },
};

/**
 * Google and Apple through Clerk's browser flow (works in Expo Go). It signs in or
 * creates the account and starts the session itself; the session guard then moves the
 * learner home. Not on web: that needs a redirect callback page we don't have yet.
 */
export function useSocialSignIn() {
  const { startSSOFlow } = useSSO();
  const [pending, setPending] = useState<SocialProvider | null>(null);

  const start = async (provider: SocialProvider) => {
    const { strategy, label } = providers[provider];
    if (Platform.OS === "web") {
      toast.info(`${label} sign-in works in the Syllo app.`);
      return;
    }
    if (pending) return;
    setPending(provider);
    try {
      const { createdSessionId } = await startSSOFlow({ strategy });
      // No session and no error: the learner closed the browser. Nothing to report.
      if (createdSessionId) toast.success("You're signed in.");
    } catch (error) {
      reportClerkError(error as ClerkFailure);
    } finally {
      setPending(null);
    }
  };

  return { start, pending };
}
