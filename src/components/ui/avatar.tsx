import { Image } from "expo-image";
import { type StyleProp, Text, View, type ViewStyle } from "react-native";

import { colors } from "./placeholder-colors";

const sizes = {
  sm: { box: 36, text: 15 },
  md: { box: 44, text: 18 },
  xl: { box: 104, text: 40 },
} as const;

/** A person: their photo when they have one, otherwise the first letter of their name. Ported from havenly. */
export function Avatar({
  imageUrl,
  name,
  size = "md",
  style,
}: {
  imageUrl?: string | null;
  name: string;
  size?: keyof typeof sizes;
  style?: StyleProp<ViewStyle>;
}) {
  const s = sizes[size];
  return (
    <View
      style={[
        {
          width: s.box,
          height: s.box,
          borderRadius: s.box / 2,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.accentTint,
        },
        style,
      ]}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          accessibilityIgnoresInvertColors
          contentFit="cover"
          transition={200}
          style={{ width: "100%", height: "100%" }}
        />
      ) : (
        <Text style={{ fontSize: s.text, fontWeight: "600", color: colors.ink }}>{name[0]?.toUpperCase()}</Text>
      )}
    </View>
  );
}
