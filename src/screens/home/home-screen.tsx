import { useClerk, useUser } from "@clerk/expo";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { displayFirstName } from "@/lib/display-name";
import { showBanner } from "@/lib/notifications/banner";

// Placeholder home until the design system and the home design exist: shows who is
// signed in, Sign out, and the Dynamic Island banner check.
export function HomeScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // The session guard closes (app) and the index route sends the learner to /sign-in.
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Hi, {displayFirstName(user)}</Text>
      {user?.primaryEmailAddress ? (
        <Text style={styles.muted}>{user.primaryEmailAddress.emailAddress}</Text>
      ) : null}

      {/* Temporary: checks the Dynamic Island banner until real screens exist. */}
      <Pressable
        accessibilityRole="button"
        onPress={() => showBanner({ title: "Lesson unlocked", message: "Chapter 2 is ready for you." })}
        style={styles.button}
      >
        <Text>Show test banner</Text>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        disabled={signingOut}
        onPress={handleSignOut}
        style={[styles.button, signingOut && styles.disabled]}
      >
        <Text>{signingOut ? "Signing out…" : "Sign out"}</Text>
      </Pressable>
    </View>
  );
}

// Placeholder styles until the design system exists (prompts/01-design-system.md).
const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 },
  title: { fontSize: 24, fontWeight: "600" },
  muted: { color: "#6B7280" },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 999, borderWidth: 1 },
  disabled: { opacity: 0.5 },
});
