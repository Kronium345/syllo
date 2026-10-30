import type { BottomTabBarProps } from "expo-router/js-tabs";
import { House, type LucideIcon, Search, User } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/components/ui/placeholder-colors";

// Height of the bar above the bottom inset. The bar sits below the screen (not floating
// over it), so tab screens need no extra bottom padding.
const TAB_HEIGHT = 60;

const tabs: Record<string, { label: string; icon: LucideIcon }> = {
  home: { label: "Home", icon: House },
  search: { label: "Search", icon: Search },
  profile: { label: "Profile", icon: User },
};

/** The app's bottom tab bar. Placeholder styles until the design system exists. */
export function AppTabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: insets.bottom }]}>
      {state.routes.map((route, index) => {
        const tab = tabs[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const tint = focused ? colors.accent : colors.muted;
        const Glyph = tab.icon;
        const onPress = () => {
          if (!focused) navigateToTab(route.key);
        };
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
            onPress={onPress}
            style={styles.tab}
          >
            <Glyph size={24} color={tint} strokeWidth={2} />
            <Text style={[styles.label, { color: tint }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: { flex: 1, height: TAB_HEIGHT, alignItems: "center", justifyContent: "center", gap: 4 },
  label: { fontSize: 12, fontWeight: "600" },
});
