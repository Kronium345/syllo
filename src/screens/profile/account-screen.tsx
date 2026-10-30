import { useUser } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { colors } from "@/components/ui/placeholder-colors";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { displayFirstName, profileImageUrl } from "@/lib/display-name";
import { type ClerkFailure, reportClerkError } from "@/screens/auth/clerk-errors";
import { reportInvalid } from "@/screens/auth/report-invalid";

import { ChangePasswordSheet } from "./change-password-sheet";
import { DeleteAccountSheet } from "./delete-account-sheet";
import { SessionsSection } from "./sessions-section";

const MAX_NAME_LENGTH = 50;

type Field = "firstName" | "lastName";

function validateNames(firstName: string, lastName: string): Partial<Record<Field, string>> {
  return {
    firstName: !firstName.trim()
      ? "Enter your first name."
      : firstName.trim().length > MAX_NAME_LENGTH
        ? `Keep your first name under ${MAX_NAME_LENGTH} characters.`
        : undefined,
    lastName:
      lastName.trim().length > MAX_NAME_LENGTH ? `Keep your last name under ${MAX_NAME_LENGTH} characters.` : undefined,
  };
}

// Account: photo and names (Clerk; the screen edits copies and writes them back on save),
// password, signed-in devices and account deletion. Ported from havenly's personal info.
export function AccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sheet, setSheet] = useState<"password" | "delete" | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.navigate("/profile"));
  const email = user?.primaryEmailAddress?.emailAddress;
  const changed = firstName.trim() !== (user?.firstName ?? "") || lastName.trim() !== (user?.lastName ?? "");

  // The photo is stored on Clerk: setProfileImage uploads it (or removes it with null) and
  // reload() refreshes user.imageUrl everywhere it's shown.
  const updatePhoto = async (file: string | null) => {
    if (!user) return;
    setPhotoBusy(true);
    try {
      await user.setProfileImage({ file });
      await user.reload();
      toast.success(file ? "Photo updated." : "Photo removed.");
    } catch (error) {
      reportClerkError(error as ClerkFailure);
    } finally {
      setPhotoBusy(false);
    }
  };

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    if (!asset.base64) {
      toast.error("Couldn't read that photo.", "Try a different one.");
      return;
    }
    await updatePhoto(`data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`);
  };

  const save = async () => {
    if (!user) return;
    const found = validateNames(firstName, lastName);
    setErrors(found);
    if (reportInvalid(found)) return;
    setSaving(true);
    try {
      await user.update({ firstName: firstName.trim(), lastName: lastName.trim() });
      toast.success("Details saved.");
    } catch (error) {
      reportClerkError(error as ClerkFailure);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="md" onPress={goBack} />
        <Text accessibilityRole="header" style={styles.title}>
          Account
        </Text>

        <View style={styles.photo}>
          <View>
            <Avatar imageUrl={profileImageUrl(user)} name={firstName || displayFirstName(user)} size="xl" />
            {photoBusy ? (
              <View accessibilityRole="progressbar" accessibilityLabel="Updating photo" style={styles.photoBusy}>
                <ActivityIndicator color={colors.ink} />
              </View>
            ) : null}
          </View>
          <View style={styles.photoActions}>
            <Pressable accessibilityRole="button" hitSlop={8} disabled={photoBusy} onPress={pickPhoto}>
              <Text style={styles.link}>{user?.hasImage ? "Change photo" : "Add photo"}</Text>
            </Pressable>
            {user?.hasImage ? (
              <Pressable accessibilityRole="button" hitSlop={8} disabled={photoBusy} onPress={() => updatePhoto(null)}>
                <Text style={styles.danger}>Remove photo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.fields}>
          <TextField
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            error={errors.firstName}
            autoComplete="given-name"
            textContentType="givenName"
            autoCapitalize="words"
            maxLength={MAX_NAME_LENGTH + 10}
          />
          <TextField
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            error={errors.lastName}
            autoComplete="family-name"
            textContentType="familyName"
            autoCapitalize="words"
            maxLength={MAX_NAME_LENGTH + 10}
          />
          {email ? (
            <View style={styles.email}>
              <Text style={styles.caption}>Email</Text>
              <Text style={styles.body}>{email}</Text>
            </View>
          ) : null}
        </View>

        <Button title="Save" loading={saving} disabled={!changed} onPress={save} style={styles.save} />

        <View style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>
            Password
          </Text>
          {user?.passwordEnabled ? (
            <Button title="Change password" variant="secondary" onPress={() => setSheet("password")} />
          ) : (
            <Text style={styles.caption}>
              You sign in with Google or Apple, so there&apos;s no Syllo password to change.
            </Text>
          )}
        </View>

        <View style={styles.section}>
          <SessionsSection />
        </View>

        <View style={[styles.section, styles.dangerZone]}>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setSheet("delete")} style={styles.start}>
            <Text style={styles.danger}>Delete account</Text>
          </Pressable>
          <Text style={styles.caption}>Permanently removes your Syllo account and profile.</Text>
        </View>
      </ScrollView>

      <ChangePasswordSheet visible={sheet === "password"} onClose={() => setSheet(null)} />
      <DeleteAccountSheet visible={sheet === "delete"} onClose={() => setSheet(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingHorizontal: 20 },
  title: { marginTop: 28, fontSize: 32, fontWeight: "700", color: colors.ink },
  photo: { marginTop: 28, alignItems: "center", gap: 12 },
  photoBusy: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: colors.glass,
  },
  photoActions: { flexDirection: "row", gap: 24 },
  link: { fontSize: 15, fontWeight: "600", color: colors.ink, textDecorationLine: "underline" },
  danger: { fontSize: 15, fontWeight: "600", color: colors.danger },
  fields: { marginTop: 32, gap: 16 },
  email: { gap: 2, paddingHorizontal: 4 },
  caption: { fontSize: 13, lineHeight: 18, color: colors.muted },
  body: { fontSize: 15, color: colors.ink },
  save: { marginTop: 32 },
  section: { marginTop: 40, gap: 12 },
  heading: { fontSize: 18, fontWeight: "700", color: colors.ink },
  dangerZone: { gap: 8, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 24 },
  start: { alignSelf: "flex-start" },
});
