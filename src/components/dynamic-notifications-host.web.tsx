import { ReactNode } from "react";

/** Web has no banner (Skia needs extra setup there); showBanner does nothing until a toast exists. */
export function DynamicNotificationsHost({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
