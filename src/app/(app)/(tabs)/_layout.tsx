import { Tabs } from "expo-router/js-tabs";

import { AppTabBar } from "@/components/app-tab-bar";
import { colors } from "@/components/ui/placeholder-colors";

// JS tabs with our own bar: tab screens stay mounted after their first visit, so
// switching is instant and each tab keeps its scroll position.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: "none", sceneStyle: { backgroundColor: colors.surface } }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
