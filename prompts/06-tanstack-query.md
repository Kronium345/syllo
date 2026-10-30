# 06 · TanStack Query for all Supabase data

Status: done

## Goal
Every read and write against Supabase goes through TanStack Query (`@tanstack/react-query` v5). Screens no longer hand-roll `useEffect` + `useState` fetching, loading, error and retry. Data is cached and shared between screens, refreshed when the app comes back to the foreground or back online, invalidated after writes, and cleared when the learner signs out or switches account.

## Decisions
- **Sources:** the Expo `expo-data-fetching` skill (React Query setup, `onlineManager`, focus on native) and the installed v5 types, checked before use.
- **Packages (`npx expo install`):**
  - `@tanstack/react-query` (5.x, JS only, works in Expo Go).
  - `expo-network` for online status, the Expo module the `AGENTS.md` rule prefers over NetInfo. It works in Expo Go.
  - No devtools, persistence or eslint plugin for now.
- **Client (`src/lib/query-client.ts`):** one `QueryClient`.
  - Queries: `staleTime` 60s, `gcTime` 5 min. `retry` up to 2 times, but never for permission or not-found errors (Postgres `42501`, PostgREST `PGRST*`), since retrying those can't help.
  - Mutations: no retry.
- **React Native wiring (`src/lib/query-client.ts`, set up once at import):**
  - `focusManager` follows `AppState` (`active`), so stale queries refetch when the app returns to the foreground.
  - `onlineManager` follows `expo-network`'s `addNetworkStateListener` (`isInternetReachable ?? isConnected`), so queries pause offline and resume online.
  - Both are skipped on web, where TanStack already uses window focus and online events.
- **Provider:** `QueryClientProvider` in the root layout, inside `ClerkProvider`: `GestureHandlerRootView` → `ClerkProvider` → `QueryClientProvider` → `DynamicNotificationsHost` → Stack, with `ToastHost` last.
- **Account switches:** a `QueryCacheReset` component in the root layout watches `useAuth().userId`. When it changes (sign out, or another account signs in), it calls `queryClient.clear()`, because RLS makes results per learner (enrollments unlock content) and the next account must never see the last one's cache.
- **Supabase errors:** supabase-js returns `{ data, error }` instead of throwing. A helper `unwrap(result)` in `src/lib/queries/supabase-result.ts` throws the `PostgrestError`, so TanStack sees failures, and returns `data`.
- **Query keys (`src/lib/queries/keys.ts`):** one factory, `queryKeys.courses.all = ["courses"]`, `.list() = ["courses", "list"]`, `.count() = ["courses", "count"]`, `queryKeys.profiles.mine(userId)`. Invalidating `["courses"]` refreshes every course query.
- **Hooks, one file per area in `src/lib/queries/`** (screens import hooks, never `useSupabase` directly):
  - `courses.ts`:
    - `useCourses()`: id + title, by title.
    - `useCourseCount()`: `count: "exact", head: true`.
    - `useDeleteCourse()`: mutation; `.delete().eq("id").select("id")`; 0 rows → throws `NotAllowedError` ("Only its tutor can."). On success it removes the course from the cached list right away (`setQueryData`) and invalidates `["courses"]`.
  - `profiles.ts`:
    - `useUpsertProfile()`: mutation, used by `useSyncProfile`.
    - `useDeleteMyProfile()` and `useRestoreMyProfile()`: mutations used by the delete-account flow.
- **Screens:**
  - **Home:** `useCourseCount()` with `isPending` / `isError` + `refetch` ("Try again"). Same copy as now.
  - **Search:** `useCourses()` with the same loading, error and empty states, plus pull-to-refresh (`refreshing={isRefetching}`, `onRefresh={refetch}`). Delete uses `useDeleteCourse()` (`isPending` drives the button), with the same toasts.
  - **`useSyncProfile`:** calls the upsert mutation when the user's id, name or photo changes. The behaviour is unchanged; failures are still only logged.
  - **Delete account:** the same order (delete profile → delete Clerk user → restore the profile if Clerk's step doesn't happen) through `mutateAsync`.
- **Not Supabase, not changed:** Clerk calls (names, photo, password, sessions/devices, sign-in) stay as they are. This plan covers Supabase data only. `useSupabase()` stays the only way to get the client, now used only inside `src/lib/queries/`.

## Out of scope
- Cache persistence across restarts, offline mutation queues, React Query devtools.
- Moving Clerk device/session loading to TanStack (not Supabase).
- New screens or data (course details, enroll, quizzes); they will use the same pattern.

## Steps
### 1. Install and client
`npx expo install @tanstack/react-query expo-network`; check the installed types for `focusManager`, `onlineManager` and `useMutation`, and `expo-network`'s listener API; write `query-client.ts`, `keys.ts` and `supabase-result.ts`; add the provider and `QueryCacheReset` to the root layout. Done: `tsc` passes and the app boots.

### 2. Course queries and screens
`courses.ts`; Home and Search moved onto it, with pull-to-refresh on Search. Done: Home shows the count, Search lists and deletes as before, and a delete updates both screens without a manual reload.

### 3. Profile mutations
`profiles.ts`; `useSyncProfile` and `DeleteAccountSheet` moved onto it. Done: the same behaviour as before.

### 4. Close out
`tsc`, lint, a grep showing no `useSupabase(` outside `src/lib/queries/` and `src/lib/supabase.ts`, the web check if memory allows, `AGENTS.md`, `## Result`.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass. `grep -rn "useSupabase(" src` lists only `src/lib/supabase.ts` and `src/lib/queries/*`.
- In the app (web, then Expo Go):
  - Home shows "7 courses available"; Search lists 7.
  - Delete a course you tutor: it disappears at once and Home's count drops without reloading.
  - Delete a course you don't tutor: the error toast shows and the list is unchanged.
  - Pull to refresh on Search refetches.
  - Airplane mode, then back online: queries resume.
  - Sign out and sign in as another account: no cached data from the first.
- Profile sync still upserts on sign-in and name change (checked in Supabase).

## AGENTS.md updates
- **Who owns what → Data:** remote data goes only through TanStack Query hooks in `src/lib/queries/` (keys in `keys.ts`; `unwrap` for supabase-js results; writes invalidate the matching keys). The cache is cleared on account change. `focusManager` / `onlineManager` are wired to AppState / `expo-network`.
- **Rules:** screens never call `useSupabase()` or fetch in `useEffect`; they use query/mutation hooks and show `isPending` / `isError` (+ `refetch`) states.

## Result
Built as planned: `@tanstack/react-query` 5.105 + `expo-network`; `src/lib/query-client.ts` (defaults, focus/online managers on native); `src/lib/queries/` (`keys.ts`, `supabase-result.ts` with `unwrap`/`throwIfError`/`NotAllowedError`, `courses.ts`, `profiles.ts`); `QueryClientProvider` + `QueryCacheReset` in the root layout. Home, Search (with pull-to-refresh), `useSyncProfile` and the delete-account sheet use the hooks; `useSupabase()` is now called only inside `src/lib/queries/`.

Changes from the plan:
- No separate restore mutation: restoring the profile is `useUpsertProfile` again. No profile query key, since nothing reads profiles yet.
- `throwIfError()` was added for writes without `.select()` (supabase-js returns `data: null` for them), and `unwrap()` returns the non-null data type.

Verified: `tsc` and `expo lint` pass; grep shows `useSupabase(` only in `src/lib/queries/*` and its definition. Not run: the app on web or a phone (this PC is short on memory), so cache sharing between Home and Search, pull-to-refresh, offline resume and the cache clear on account switch are for your device test.
