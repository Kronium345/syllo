import { Image } from "expo-image";
import { memo } from "react";
import { View } from "react-native";

import { AppText } from "@/components/ui/text";
import { tw } from "@/theme";

import { useDynamicNotifications } from "../../hooks/use-dynamic-notifications";
import type { INotificationBody } from "../../interfaces/notification-content.interface";

// The card's contents: avatar, title in the accent, one-line message, optional icon.
const NotificationBody: React.FC<INotificationBody> = memo<INotificationBody>(({ notification }: INotificationBody) => {
  const context = useDynamicNotifications();
  const accent = notification.accent ?? context.accent;
  const TrailingIcon = notification.icon;

  return (
    <View style={tw`flex-1 flex-row items-center gap-3 pl-3 pr-5`}>
      {notification.avatar ? (
        <Image
          source={{ uri: notification.avatar }}
          style={tw`w-12 h-12 rounded-full bg-subtle`}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={tw`w-12 h-12 rounded-full bg-subtle`} />
      )}

      <View style={tw`flex-1`}>
        <AppText numberOfLines={1} style={[tw`text-16 font-semibold`, { color: accent }]}>
          {notification.title}
        </AppText>
        {notification.message ? (
          <AppText numberOfLines={1} style={tw`text-14 font-medium text-muted`}>
            {notification.message}
          </AppText>
        ) : null}
      </View>

      {TrailingIcon ? <TrailingIcon size={24} color={accent} strokeWidth={2} /> : null}
    </View>
  );
});

NotificationBody.displayName = "DynamicNotifications.Body";

export { NotificationBody };
