import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { DynamicNotificationsHost } from "@/components/dynamic-notifications-host";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DynamicNotificationsHost>
        <Stack />
      </DynamicNotificationsHost>
    </GestureHandlerRootView>
  );
}
