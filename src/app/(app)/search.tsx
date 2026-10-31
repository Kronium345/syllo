import { Redirect } from "expo-router";

// The Search tab is now Explore (prompts/01-design-system.md); keep old links working.
export default function SearchRedirect() {
  return <Redirect href="/explore" />;
}
