import type { ComponentType, ReactNode } from "react";

/** Any icon component with lucide's props (no icon library is installed yet). */
type NotificationIcon = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;

interface IDynamicNotification {
  id?: string;
  title: string;
  message?: string;
  /** Leading image: a URL or a bundled `require(...)`. Defaults to the Syllo app icon. */
  avatar?: string | number;
  /** Trailing icon, tinted with the accent. Replaces upstream's iOS-only SF Symbol. */
  icon?: NotificationIcon;
  accent?: string;
  duration?: number | null;
  onPress?: () => void;
  render?: (notification: IDynamicNotification) => ReactNode;
}

export type { IDynamicNotification };
