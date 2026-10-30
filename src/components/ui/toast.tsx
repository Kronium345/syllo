import { CircleAlert, CircleCheck, Info, type LucideIcon } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast, { type ToastConfig, type ToastConfigParams } from "react-native-toast-message";

// Ported from havenly. Placeholder colors until the design system exists
// (prompts/01-design-system.md); then these become theme tokens.

const VISIBILITY_MS = 3500;

const tones: Record<"success" | "error" | "info", { tint: string; color: string; icon: LucideIcon }> = {
  success: { tint: "#DCFCE7", color: "#16A34A", icon: CircleCheck },
  error: { tint: "#FEE2E2", color: "#DC2626", icon: CircleAlert },
  info: { tint: "#DBEAFE", color: "#208AEF", icon: Info },
};

function ToastCard({ type, text1, text2 }: ToastConfigParams<unknown> & { type: keyof typeof tones }) {
  const tone = tones[type];
  const Glyph = tone.icon;
  return (
    <Pressable
      accessibilityRole="alert"
      accessibilityLabel={[text1, text2].filter(Boolean).join(" ")}
      onPress={() => Toast.hide()}
      style={styles.card}
    >
      <View style={[styles.badge, { backgroundColor: tone.tint }]}>
        <Glyph size={20} color={tone.color} strokeWidth={2} />
      </View>
      <View style={styles.text}>
        {text1 ? <Text style={styles.title}>{text1}</Text> : null}
        {text2 ? <Text style={styles.message}>{text2}</Text> : null}
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

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    boxShadow: "0 6px 16px rgba(16, 19, 28, 0.12)",
  },
  badge: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: "600", color: "#0B0B1A" },
  message: { fontSize: 13, lineHeight: 18, color: "#6B7280" },
});
