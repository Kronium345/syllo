import { type Href, router } from "expo-router";

/** Back when there's somewhere to go back to, otherwise `fallback` (e.g. opened from a link). */
export function goBackOr(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
