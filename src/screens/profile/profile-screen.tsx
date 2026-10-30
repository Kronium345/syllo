import { useUser } from "@clerk/expo";
import { useRouter } from "expo-router";
import { CircleHelp, Settings, User } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/icon-button";
import { colors } from "@/components/ui/placeholder-colors";
import { ProfileRow, ProfileRowGroup } from "@/components/ui/profile-row";
import { displayFirstName, profileImageUrl } from "@/lib/display-name";
import { emailSupport } from "@/lib/support";

import { ProfileCard } from "./profile-card";
import { SettingsSheet } from "./settings-sheet";

// Profile tab: who is signed in, Account, Help & support and Settings (sign out).
// Placeholder styles until the design system exists.
export function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress;
  const name = user?.fullName?.trim() || displayFirstName(user);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Profile
          </Text>
          <IconButton icon={Settings} accessibilityLabel="Settings" onPress={() => setSettingsOpen(true)} />
        </View>

        <ProfileCard
          name={name}
          email={email}
          imageUrl={profileImageUrl(user)}
          onPress={() => router.push("/account")}
        />

        <View style={styles.panel}>
          <ProfileRowGroup>
            <ProfileRow icon={User} label="Account" onPress={() => router.push("/account")} />
            <ProfileRow icon={CircleHelp} label="Help & support" onPress={emailSupport} />
          </ProfileRowGroup>
        </View>
      </ScrollView>

      <SettingsSheet visible={settingsOpen} email={email} onClose={() => setSettingsOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { gap: 16, paddingHorizontal: 20, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { fontSize: 32, fontWeight: "700", color: colors.ink },
  panel: { borderRadius: 20, backgroundColor: colors.canvas, padding: 4 },
});
