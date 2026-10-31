import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { CircleHelp, Settings, User } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/icon-button";
import { ProfileRow, ProfileRowGroup } from "@/components/ui/profile-row";
import { AppText } from "@/components/ui/text";
import { displayFirstName, profileImageUrl } from "@/lib/display-name";
import { emailSupport } from "@/lib/support";
import { tw } from "@/theme";

import { ProfileCard } from "./profile-card";
import { SettingsSheet } from "./settings-sheet";

// Profile tab: who is signed in, Account, Help & support and Settings (sign out).
// Not in the design: built from its tokens (canvas page, title-xl, bordered cards).
export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName?.trim() || displayFirstName(user);

  return (
    <View style={tw`flex-1 bg-canvas`}>
      <ScrollView contentContainerStyle={[tw`gap-6 px-screen pb-8`, { paddingTop: insets.top + 16 }]}>
        <View style={tw`flex-row items-center justify-between`}>
          <AppText variant="title-xl" accessibilityRole="header">
            Profile
          </AppText>
          <IconButton icon={Settings} accessibilityLabel="Settings" onPress={() => setSettingsOpen(true)} />
        </View>

        <ProfileCard name={name} email={email} imageUrl={profileImageUrl(user)} onPress={() => router.push("/account")} />

        <ProfileRowGroup>
          <ProfileRow icon={User} label="Account" onPress={() => router.push("/account")} />
          <ProfileRow icon={CircleHelp} label="Help & support" onPress={emailSupport} />
        </ProfileRowGroup>
      </ScrollView>

      <SettingsSheet visible={settingsOpen} email={email} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}
