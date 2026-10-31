import { Redirect } from "expo-router";

import { DesignSystemScreen } from "@/screens/design-system/design-system-screen";

// Dev-only preview of every token and shared component (prompts/01-design-system.md).
export default function DesignSystemRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <DesignSystemScreen />;
}
