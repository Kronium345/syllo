import { Redirect } from "expo-router";

// Google/Apple return here when the browser hands back to the app (Android opens the
// deep link). The SSO flow finishes on its own; the index route then picks the screen.
export default function SsoCallback() {
  return <Redirect href="/" />;
}
