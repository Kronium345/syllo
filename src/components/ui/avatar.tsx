import { Image, type ImageSource } from "expo-image";
import { type StyleProp, View, type ViewStyle } from "react-native";

import { tw } from "@/theme";

import { AppText } from "./text";

// The prototype's people: w-6 (welcome stack), w-10 (top bar, testimonials),
// w-14 (tutor card), and Account's large 104 (not in the design; estimated).
const sizes = {
  xs: { box: 24, text: "text-11" },
  sm: { box: 40, text: "text-16" },
  md: { box: 56, text: "text-20" },
  xl: { box: 104, text: "text-34" },
} as const;

/** A person: their photo when they have one, otherwise the first letter of their name. */
export function Avatar({
  imageUrl,
  source,
  name,
  size = "sm",
  bordered = false,
  style,
}: {
  imageUrl?: string | null;
  /** A bundled image (src/lib/local-images.ts); wins over `imageUrl`. */
  source?: ImageSource | null;
  name: string;
  size?: keyof typeof sizes;
  /** The hairline border the dashboard's top-bar photo has. */
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const s = sizes[size];
  return (
    <View
      style={[
        tw.style("items-center justify-center overflow-hidden rounded-full bg-primary-tint", bordered && "border border-border"),
        { width: s.box, height: s.box },
        style,
      ]}
    >
      {source || imageUrl ? (
        <Image
          source={source ?? { uri: imageUrl ?? undefined }}
          accessibilityIgnoresInvertColors
          contentFit="cover"
          transition={200}
          style={tw`w-full h-full`}
        />
      ) : (
        <AppText style={tw.style(s.text, "font-bold text-primary")}>{name[0]?.toUpperCase()}</AppText>
      )}
    </View>
  );
}
