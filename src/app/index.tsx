import { useAuth } from "@clerk/expo";
import { Redirect } from "expo-router";

export default function Index() {
  const { isLoaded, isSignedIn } = useAuth();
  // Wait for Clerk to restore the session (the splash covers this on native).
  if (!isLoaded) return null;
  return <Redirect href={isSignedIn ? "/home" : "/welcome"} />;
}
