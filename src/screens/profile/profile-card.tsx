import { Pressable, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { AppText } from "@/components/ui/text";
import { pressScale, tw } from "@/theme";

/** Photo, name and email at the top of Profile, as a hero card (rounded-card + shadow). Opens Account. */
export function ProfileCard({
  name,
  email,
  imageUrl,
  onPress,
}: {
  name: string;
  email?: string;
  imageUrl?: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}${email ? `, ${email}` : ""}`}
      accessibilityHint="Opens your account"
      onPress={onPress}
      style={({ pressed }) => [
        tw`flex-row items-center gap-4 rounded-card border border-border bg-surface p-5 shadow-card`,
        pressScale(pressed),
      ]}
    >
      <Avatar imageUrl={imageUrl} name={name} size="md" />
      <View style={tw`flex-1 gap-1`}>
        <AppText variant="title" numberOfLines={2}>
          {name}
        </AppText>
        {email ? (
          <AppText variant="callout" numberOfLines={1}>
            {email}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}
