import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { DynamicNotificationsHost } from "@/components/dynamic-notifications-host";
import { ToastHost } from "@/components/ui/toast";
import { queryClient } from "@/lib/query-client";

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

if (!publishableKey) {
  throw new Error(
    "Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY. Run `clerk env pull` to write it to .env.local, then restart the dev server.",
  );
}

// If Clerk can't load (e.g. offline), stop holding the splash after this long.
const CLERK_SPLASH_TIMEOUT_MS = 5000;

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <QueryClientProvider client={queryClient}>
          <QueryCacheReset />
          <DynamicNotificationsHost>
            <RootStack />
          </DynamicNotificationsHost>
        </QueryClientProvider>
      </ClerkProvider>
      <ToastHost />
    </GestureHandlerRootView>
  );
}

/**
 * RLS makes Supabase results per learner (enrollments unlock content), so the cache must
 * never outlive the account it was fetched for: clear it on sign out or account switch.
 */
function QueryCacheReset() {
  const { isLoaded, userId } = useAuth();
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    if (lastUserId.current !== undefined && lastUserId.current !== userId) queryClient.clear();
    lastUserId.current = userId ?? null;
  }, [isLoaded, userId]);

  return null;
}

function RootStack() {
  const { isLoaded, isSignedIn } = useAuth();
  const [clerkTimedOut, setClerkTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setClerkTimedOut(true), CLERK_SPLASH_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoaded || clerkTimedOut) SplashScreen.hideAsync();
  }, [isLoaded, clerkTimedOut]);

  // isSignedIn is undefined until Clerk restores the session, so (app) stays closed
  // while loading and the index route waits before redirecting. Signing in or out
  // flips these guards; no router call is needed.
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!isSignedIn}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Screen name="sso-callback" />
    </Stack>
  );
}
