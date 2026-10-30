import { Pressable, StyleSheet, Text, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { colors } from "@/components/ui/placeholder-colors";

/** Photo, name and email at the top of Profile. Opens Account. */
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
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.85 : 1 }]}
    >
      <Avatar imageUrl={imageUrl} name={name} size="xl" />
      <View style={styles.text}>
        <Text numberOfLines={2} style={styles.name}>
          {name}
        </Text>
        {email ? (
          <Text numberOfLines={1} style={styles.email}>
            {email}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    borderRadius: 20,
    backgroundColor: colors.canvas,
    padding: 12,
  },
  text: { flex: 1, gap: 4 },
  name: { fontSize: 22, fontWeight: "700", color: colors.ink },
  email: { fontSize: 15, color: colors.muted },
});
