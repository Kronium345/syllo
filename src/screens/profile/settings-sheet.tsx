import { useClerk } from "@clerk/expo";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/ui/button";
import { colors } from "@/components/ui/placeholder-colors";
import { Sheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";

export function SettingsSheet({ visible, email, onClose }: { visible: boolean; email?: string; onClose: () => void }) {
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // Ending the session closes the (app) group; the index route sends the learner to /sign-in.
      await signOut();
      toast.success("You're signed out.");
    } catch {
      setSigningOut(false);
      toast.error("Couldn't sign out.", "Check your connection and try again.");
    }
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Settings"
      footer={<Button title="Sign out" variant="secondary" loading={signingOut} onPress={handleSignOut} />}
    >
      {email ? (
        <View style={styles.signedIn}>
          <Text style={styles.caption}>Signed in as</Text>
          <Text numberOfLines={1} style={styles.email}>
            {email}
          </Text>
        </View>
      ) : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  signedIn: { gap: 4 },
  caption: { fontSize: 13, color: colors.muted },
  email: { fontSize: 16, color: colors.ink },
});
