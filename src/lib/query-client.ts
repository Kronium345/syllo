import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { addNetworkStateListener } from "expo-network";
import { AppState, Platform } from "react-native";

// The app's single TanStack Query client (prompts/06-tanstack-query.md). Every Supabase
// read and write goes through hooks in src/lib/queries/ that use it.

/** Postgres/PostgREST errors that a retry can't fix: no permission, bad request, not found. */
function isPermanentError(error: unknown) {
  const code = (error as { code?: string } | null)?.code ?? "";
  return code === "42501" || code.startsWith("PGRST") || code.startsWith("22") || code.startsWith("23");
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: (failureCount, error) => !isPermanentError(error) && failureCount < 2,
    },
    mutations: {
      retry: false,
    },
  },
});

// On native, "focus" is the app coming back to the foreground and "online" comes from
// expo-network. On web TanStack already listens to window focus and online events.
if (Platform.OS !== "web") {
  focusManager.setEventListener((setFocused) => {
    const subscription = AppState.addEventListener("change", (state) => setFocused(state === "active"));
    return () => subscription.remove();
  });

  onlineManager.setEventListener((setOnline) => {
    const subscription = addNetworkStateListener((state) =>
      setOnline(state.isInternetReachable ?? state.isConnected ?? true),
    );
    return () => subscription.remove();
  });
}
