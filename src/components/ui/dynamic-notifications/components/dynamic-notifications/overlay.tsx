import { useDynamicNotifications } from "../../hooks/use-dynamic-notifications";
import type { INotificationOverlay } from "../../interfaces/notification-overlay.interface";
import { memo } from "react";
import { StyleSheet, View } from "react-native";
import { Content } from "./content";
import { Gooey } from "./gooey";

const Overlay: React.FC<INotificationOverlay> &
  React.FunctionComponent<INotificationOverlay> = memo<INotificationOverlay>(
  ({
    style,
  }: INotificationOverlay):
    | (React.ReactNode & React.ReactElement & React.JSX.Element)
    | null => {
    const { layout, isVisible } = useDynamicNotifications();

    // Only draw the island while a notification is on screen (isVisible stays
    // true until the exit animation has shrunk it back). An always-on pill
    // hides behind an iPhone's Dynamic Island, but shows as a black bar on
    // phones without one.
    if (!isVisible) {
      return null;
    }

    return (
      <View
        pointerEvents="box-none"
        style={[styles.overlay, { height: layout.canvasHeight }, style]}
      >
        <Gooey />
        <Content />
      </View>
    );
  },
);

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
});

Overlay.displayName = "DynamicNotifications.Overlay";

export { Overlay };
