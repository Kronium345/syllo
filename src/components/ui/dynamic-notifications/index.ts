import { Content } from "./components/dynamic-notifications/content";
import { Gooey } from "./components/dynamic-notifications/gooey";
import { Overlay } from "./components/dynamic-notifications/overlay";
import { Root } from "./components/dynamic-notifications/root";
import { NotificationBody } from "./components/ui/notification-body";

const DynamicNotifications = Object.assign(Root, {
  Overlay,
  Gooey,
  Content,
  Body: NotificationBody,
});

export { useDynamicNotifications } from "./hooks/use-dynamic-notifications";
export type { IDynamicNotification } from "./interfaces/dynamic-notification.interface";
export type { IDynamicNotifications } from "./interfaces/dynamic-notifications.interface";
export { DynamicNotifications };

