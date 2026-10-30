import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { DynamicNotificationsHost } from "@/components/dynamic-notifications-host";
import { ToastHost } from "@/components/ui/toast";

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
        <DynamicNotificationsHost>
          <RootStack />
        </DynamicNotificationsHost>
      </ClerkProvider>
      <ToastHost />
    </GestureHandlerRootView>
  );
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
