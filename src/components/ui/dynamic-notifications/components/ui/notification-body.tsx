import { Image } from "expo-image";
import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { PALETTE } from "../../conf/palette";
import { useDynamicNotifications } from "../../hooks/use-dynamic-notifications";
import type { INotificationBody } from "../../interfaces/notification-content.interface";

// The card's contents: avatar, title in the accent, one-line message, optional icon.
// Plain Text styles until the design system adds a text component and tokens.
const NotificationBody: React.FC<INotificationBody> = memo<INotificationBody>(({ notification }: INotificationBody) => {
  const context = useDynamicNotifications();
  const accent = notification.accent ?? context.accent;
  const TrailingIcon = notification.icon;

  return (
    <View style={styles.row}>
      {notification.avatar ? (
        <Image
          source={{ uri: notification.avatar }}
          style={styles.avatar}
          contentFit="cover"
          transition={180}
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={styles.avatar} />
      )}

      <View style={styles.text}>
        <Text numberOfLines={1} style={[styles.title, { color: accent }]}>
          {notification.title}
        </Text>
        {notification.message ? (
          <Text numberOfLines={1} style={styles.message}>
            {notification.message}
          </Text>
        ) : null}
      </View>

      {TrailingIcon ? <TrailingIcon size={24} color={accent} strokeWidth={2} /> : null}
    </View>
  );
});

NotificationBody.displayName = "DynamicNotifications.Body";

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 12, paddingRight: 20 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: PALETTE.avatar },
  text: { flex: 1 },
  title: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
  message: { fontSize: 14, lineHeight: 20, fontWeight: "500", color: PALETTE.message },
});

export { NotificationBody };
