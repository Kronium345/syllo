import { CircleAlert, CircleCheck, Info, type LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast, { type ToastConfig, type ToastConfigParams } from "react-native-toast-message";

import { type ColorToken, tw } from "@/theme";

import { Icon } from "./icon";
import { AppText } from "./text";

// Ported from havenly. Not in the design: a white card with the design's border,
// rounded-2xl and custom-shadow, and a tinted icon badge per tone.

const VISIBILITY_MS = 3500;

const tones: Record<"success" | "error" | "info", { tint: string; color: ColorToken; icon: LucideIcon }> = {
  success: { tint: "bg-success-tint", color: "success-deep", icon: CircleCheck },
  error: { tint: "bg-danger-tint", color: "danger-deep", icon: CircleAlert },
  info: { tint: "bg-primary-tint", color: "primary", icon: Info },
};

function ToastCard({ type, text1, text2 }: ToastConfigParams<unknown> & { type: keyof typeof tones }) {
  const tone = tones[type];
  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLabel={[text1, text2].filter(Boolean).join(" ")}
      onPress={() => Toast.hide()}
      style={tw`mx-4 self-stretch flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-card`}
    >
      <View style={tw.style("w-8 h-8 rounded-full items-center justify-center", tone.tint)}>
        <Icon as={tone.icon} size="lg" color={tone.color} />
      </View>
      <View style={tw`flex-1 gap-0.5`}>
        {text1 ? <AppText variant="callout-strong">{text1}</AppText> : null}
        {text2 ? <AppText variant="caption">{text2}</AppText> : null}
      </View>
    </Pressable>
  );
}

const config: ToastConfig = {
  success: (params) => <ToastCard {...params} type="success" />,
  error: (params) => <ToastCard {...params} type="error" />,
  info: (params) => <ToastCard {...params} type="info" />,
};

/** The single app-wide toast host. Mount once, last, in the root layout. */
export function ToastHost() {
  const insets = useSafeAreaInsets();
  return <Toast config={config} position="top" topOffset={insets.top + 8} visibilityTime={VISIBILITY_MS} />;
}

const show = (type: keyof typeof tones) => (title: string, message?: string) =>
  Toast.show({ type, text1: title, text2: message });

/** App feedback. Screens call this, never the toast library directly. */
export const toast = {
  success: show("success"),
  error: show("error"),
  info: show("info"),
  hide: () => Toast.hide(),
};
