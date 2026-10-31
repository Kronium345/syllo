import type { BottomTabBarProps } from "expo-router/js-tabs";
import { BookOpen, House, type LucideIcon, Search, User } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { AppText } from "@/components/ui/text";
import { control, tw } from "@/theme";

const tabs: Record<string, { label: string; icon: LucideIcon }> = {
  home: { label: "Home", icon: House },
  "my-courses": { label: "My Courses", icon: BookOpen },
  explore: { label: "Explore", icon: Search },
  profile: { label: "Profile", icon: User },
};

/**
 * The design's tab bar (learning_dashboard / course_search_feed): h-[84px] white with a
 * top hairline, px-8, items spread evenly; icon 24, label 11 (bold + primary when active,
 * medium + muted otherwise). The bottom safe-area inset is added below the 84.
 */
export function AppTabBar({ state, navigateToTab, insets }: BottomTabBarProps) {
  return (
    <View
      accessibilityRole="tablist"
      style={[
        tw`flex-row items-center justify-between bg-surface border-t border-border px-8`,
        { height: control.tabBar + insets.bottom, paddingBottom: insets.bottom },
      ]}
    >
      {state.routes.map((route, index) => {
        const tab = tabs[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: focused }}
            onPress={() => {
              if (!focused) navigateToTab(route.key);
            }}
            style={tw`items-center gap-1`}
          >
            {({ pressed }) => (
              <>
                <Icon as={tab.icon} size="xl" color={focused || pressed ? "primary" : "muted"} />
                <AppText variant="tab" style={tw.style((focused || pressed) && "text-primary", focused && "font-bold")}>
                  {tab.label}
                </AppText>
              </>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
