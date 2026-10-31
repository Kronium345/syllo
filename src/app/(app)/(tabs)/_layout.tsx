import { Tabs } from "expo-router/js-tabs";

import { AppTabBar } from "@/components/app-tab-bar";
import { tw } from "@/theme";

// JS tabs with our own bar (the design's: Home, My Courses, Explore, Profile). Tab screens
// stay mounted after their first visit, so switching is instant and keeps scroll position.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppTabBar {...props} />}
      screenOptions={{ headerShown: false, animation: "none", sceneStyle: tw`bg-canvas` }}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="my-courses" />
      <Tabs.Screen name="explore" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
