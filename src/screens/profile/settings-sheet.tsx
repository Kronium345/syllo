import { useClerk } from "@clerk/expo";
import { useState } from "react";
import { Linking, Platform, Switch, View } from "react-native";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { AppText } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { requestPermission } from "@/lib/notifications/local";
import { setRemindersEnabled, useRemindersEnabled } from "@/lib/notifications/preferences";
import { cancelStudyReminders, resyncStudyReminders } from "@/lib/notifications/study-reminders";
import { color, tw } from "@/theme";

export function SettingsSheet({ visible, email, onClose }: { visible: boolean; email?: string; onClose: () => void }) {
  const { signOut } = useClerk();
  const [signingOut, setSigningOut] = useState(false);
  const reminders = useRemindersEnabled();

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      // This phone shouldn't keep reminding about a signed-out learner's work.
      await cancelStudyReminders().catch(() => undefined);
      // Ending the session closes the (app) group; the index route sends the learner to /welcome.
      await signOut();
      toast.success("You're signed out.");
    } catch {
      setSigningOut(false);
      toast.error("Couldn't sign out.", "Check your connection and try again.");
    }
  };

  // Study reminders (prompts/12). On asks for permission when needed; off cancels them all.
  const toggleReminders = async (next: boolean) => {
    if (!next) {
      await setRemindersEnabled(false);
      await cancelStudyReminders().catch(() => undefined);
      return;
    }
    const granted = await requestPermission();
    if (!granted) {
      toast.info("Notifications are off for Syllo", "Turn them on in your phone's settings to get reminders.");
      Linking.openSettings().catch(() => undefined);
      return;
    }
    await setRemindersEnabled(true);
    await resyncStudyReminders();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Settings"
      footer={<Button title="Sign out" variant="outline" loading={signingOut} onPress={handleSignOut} />}
    >
      <View style={tw`gap-6`}>
        {email ? (
          <View style={tw`gap-1`}>
            <AppText variant="caption">Signed in as</AppText>
            <AppText numberOfLines={1} style={tw`text-16 text-ink`}>
              {email}
            </AppText>
          </View>
        ) : null}
        {Platform.OS !== "web" ? (
          <View style={tw`flex-row items-center gap-4`}>
            <View style={tw`flex-1`}>
              <AppText style={tw`text-16 font-semibold text-ink`}>Study reminders</AppText>
              <AppText variant="caption">Daily at 6 PM and when you leave something unfinished</AppText>
            </View>
            <Switch
              accessibilityLabel="Study reminders"
              value={reminders}
              onValueChange={toggleReminders}
              trackColor={{ false: color("track"), true: color("primary") }}
              thumbColor={color("white")}
              ios_backgroundColor={color("track")}
            />
          </View>
        ) : null}
      </View>
    </Sheet>
  );
}
