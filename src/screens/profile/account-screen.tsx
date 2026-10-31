import { useUser } from "@clerk/expo";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { AppText } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { toast } from "@/components/ui/toast";
import { displayFirstName, profileImageUrl } from "@/lib/display-name";
import { type ClerkFailure, reportClerkError } from "@/screens/auth/clerk-errors";
import { reportInvalid } from "@/screens/auth/report-invalid";
import { color, tw } from "@/theme";

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
    <View style={tw`flex-1 bg-canvas`}>
      <ScrollView
        contentContainerStyle={[tw`px-screen`, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <IconButton icon={ChevronLeft} accessibilityLabel="Back" onPress={goBack} />
        <AppText variant="title-xl" accessibilityRole="header" style={tw`mt-6`}>
          Account
        </AppText>

        <View style={tw`mt-6 items-center gap-3`}>
          <View>
            <Avatar imageUrl={profileImageUrl(user)} name={firstName || displayFirstName(user)} size="xl" />
            {photoBusy ? (
              <View
                accessibilityRole="progressbar"
                accessibilityLabel="Updating photo"
                style={tw`absolute inset-0 items-center justify-center rounded-full bg-glass`}
              >
                <ActivityIndicator color={color("ink")} />
              </View>
            ) : null}
          </View>
          <View style={tw`flex-row gap-6`}>
            <Pressable accessibilityRole="button" hitSlop={8} disabled={photoBusy} onPress={pickPhoto}>
              <AppText style={tw`text-14 font-semibold text-primary`}>{user?.hasImage ? "Change photo" : "Add photo"}</AppText>
            </Pressable>
            {user?.hasImage ? (
              <Pressable accessibilityRole="button" hitSlop={8} disabled={photoBusy} onPress={() => updatePhoto(null)}>
                <AppText style={tw`text-14 font-semibold text-danger`}>Remove photo</AppText>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={tw`mt-8 gap-4`}>
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
            <View style={tw`gap-1 px-1`}>
              <AppText variant="caption">Email</AppText>
              <AppText style={tw`text-15 text-ink`}>{email}</AppText>
            </View>
          ) : null}
        </View>

        <Button title="Save" loading={saving} disabled={!changed} onPress={save} style={tw`mt-8`} />

        <View style={tw`mt-10 gap-3`}>
          <AppText variant="heading" accessibilityRole="header">
            Password
          </AppText>
          {user?.passwordEnabled ? (
            <Button title="Change password" variant="outline" onPress={() => setSheet("password")} />
          ) : (
            <AppText variant="caption">You sign in with Google or Apple, so there&apos;s no Syllo password to change.</AppText>
          )}
        </View>

        <View style={tw`mt-10`}>
          <SessionsSection />
        </View>

        <View style={tw`mt-10 gap-2 border-t border-border pt-6`}>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setSheet("delete")} style={tw`self-start`}>
            <AppText style={tw`text-15 font-semibold text-danger`}>Delete account</AppText>
          </Pressable>
          <AppText variant="caption">Permanently removes your Syllo account and profile.</AppText>
        </View>
      </ScrollView>

      <ChangePasswordSheet visible={sheet === "password"} onClose={() => setSheet(null)} />
      <DeleteAccountSheet visible={sheet === "delete"} onClose={() => setSheet(null)} />
    </View>
  );
}
