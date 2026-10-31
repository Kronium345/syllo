import { Image } from "expo-image";

// Third-party marks keep their own brand colors, so they ship as SVG assets (from
// havenly) rather than lucide icons or theme tokens. On the dark theme Apple's mark is the
// white variant (Apple's rule for dark buttons); Google's coloured "G" works on both.
const sources = {
  google: require("@/assets/brand/google-g.svg"),
  apple: require("@/assets/brand/apple-white.svg"),
} as const;

export function BrandLogo({ name, size = 20 }: { name: keyof typeof sources; size?: number }) {
  return (
    <Image
      source={sources[name]}
      contentFit="contain"
      // Decorative: the button title already names the provider.
      accessible={false}
      style={{ width: size, height: size }}
    />
  );
}
