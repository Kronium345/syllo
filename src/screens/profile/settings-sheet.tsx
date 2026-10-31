import { useClerk } from "@clerk/expo";
import { useState } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { tw } from "@/theme";

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
      footer={<Button title="Sign out" variant="outline" loading={signingOut} onPress={handleSignOut} />}
    >
      {email ? (
        <View style={tw`gap-1`}>
          <AppText variant="caption">Signed in as</AppText>
          <AppText numberOfLines={1} style={tw`text-16 text-ink`}>
            {email}
          </AppText>
        </View>
      ) : null}
    </Sheet>
  );
}
