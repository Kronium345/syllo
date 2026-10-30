# 03 · Profile: tabs, profile photo, names, password, devices, delete account

Status: done (verification pending)

## Goal
Signed-in learners get a bottom tab bar (Home, Profile). Profile shows their photo, name and email, and links to Account, Help & support (email) and Settings (Sign out). On Account they can add, change or remove their profile photo (stored on Clerk), edit their first and last name, change their password, see and sign out other signed-in devices, and delete their account. This follows havenly's profile pattern, with havenly's travel-only parts left out.

## Decisions
- **Navigation (user choice: bottom tabs):** `src/app/(app)/(tabs)/` with `home` and `profile`, using `Tabs` from `expo-router/js-tabs` with our own `AppTabBar` (`src/components/app-tab-bar.tsx`): lucide `House` and `User` icons, labels, the active tab in the accent `#208AEF`, and a bottom safe-area inset. `APP_TAB_BAR_HEIGHT` is exported so tab screens can pad their bottom. Tab screens stay mounted, as in havenly. `(app)/account.tsx` is pushed over the tabs. The `/home` and `/profile` URLs keep working because `(tabs)` is a group. Placeholder styles until the design system exists.
- **Profile screen (user choice: basics):** a header "Profile" with a Settings (gear) button, then the `ProfileCard` (avatar, full name or `displayFirstName`, email; tap → `/account`), then rows: **Account** (→ `/account`) and **Help & support** (opens `mailto:` the support email with subject "Syllo help"; if no mail app, an info toast shows the address). No stats until Supabase progress data exists.
- **Support email (default):** `SUPPORT_EMAIL = "awolowodaniel@yahoo.ie"` (the same as havenly and your Clerk account), in `src/lib/support.ts`. Change it whenever you like.
- **Settings sheet:** "Signed in as {email}" plus a **Sign out** button (secondary). Sign-out moves here from the home placeholder, with toasts "You're signed out." / "Couldn't sign out." Home keeps the greeting and the test banner button.
- **Sheet:** port havenly's `Sheet` (`src/components/ui/sheet.tsx`: RN `Modal`, slide-up card with title, close X, scrollable body and footer). It works on web too, unlike `@expo/ui`'s BottomSheet. Placeholder styles.
- **Shared UI ported from havenly, with placeholder `StyleSheet` styles (no `tw`/theme yet):**
  - `Avatar`: the photo when there is one, otherwise the first initial on a tinted circle. Sizes md 44 and xl 104.
  - `ProfileRow` / `ProfileRowGroup`: icon, label, chevron.
  - `Button`: primary/secondary, `loading`, `disabled`.
  - `IconButton`: lucide icon, outline variant.
  - Auth's `AuthField` moves to `src/components/ui/text-field.tsx` as `TextField` (same API, including the eye toggle), so Account and the sheets can use it. The auth screens import it from there.
- **Profile photo (user request, "the whole setup, including on Clerk"):**
  - Picked with `expo-image-picker`: library only, square crop (`allowsEditing`, aspect 1:1), quality 0.7, `base64`.
  - Uploaded with `user.setProfileImage({ file: "data:<mime>;base64,…" })`, then `user.reload()`. Remove uses `setProfileImage({ file: null })`.
  - Clerk stores the image and serves it from `user.imageUrl`. There's no instance setting to change: the Syllo instance allows it by default (checked: no profile-image key in the config schema; the image endpoints are part of the Frontend API).
  - `profileImageUrl(user)` in `src/lib/display-name.ts` returns `user.imageUrl` only when `user.hasImage`, so Clerk's generated default image shows as our initial avatar instead. Google/Apple sign-ups bring their provider photo (`hasImage` true).
  - While uploading, a spinner covers the avatar. Toasts: "Photo updated." / "Photo removed." / Clerk's message. If the photo can't be read: "Couldn't read that photo." with "Try a different one."
  - The photo shows on the Profile card, on Account, and as a small avatar on Home's greeting.
- **`expo-image-picker` config:** `app.json` plugin with `photosPermission: "Allow Syllo to use your photos for your profile picture."` (the iOS permission text). It works in Expo Go.
- **Names:** First name (required) and Last name, max 50 characters each. Edited copies are written back with `user.update({ firstName, lastName })` on **Save**, which is disabled until something changes. Errors use `reportInvalid` / `reportClerkError`. Toast "Details saved." The email is shown read-only.
- **Change password (user choice):**
  - A sheet with Current, New (min 8, `validateNewPassword`) and Confirm.
  - It calls `user.updatePassword({ currentPassword, newPassword, signOutOfOtherSessions: false })` inside `useReverification`. When Clerk asks for re-verification, it cancels and shows the info toast "Please sign in again", because there's no native re-verify prompt.
  - Success: "Password changed." Users without a password (Google/Apple only, `!user.passwordEnabled`) see "You sign in with Google or Apple, so there's no Syllo password to change."
- **Signed-in devices (user choice):**
  - `user.getSessions()`, active only, with loading, error (+ Retry) and list states.
  - Device names follow havenly's rule: native HTTP clients (okhttp/dalvik → Android, CFNetwork/Darwin → iPhone, or "syllo"/"expo") show as "Syllo app on {platform}"; others show "{browser} on {device}". Then "{city, country} · last active {date}". This device is marked "This device".
  - Other devices get **Sign out**, with a confirm sheet → `session.revoke()` → toast "Signed out of that device."
  - Dates are formatted with `Intl.DateTimeFormat` (short day and month), with no new date library.
- **Delete account (user choice):**
  - A sheet explaining that this permanently deletes the Syllo account and profile. You type `DELETE` to enable **Delete**, with **Keep account** next to it.
  - It calls `user.delete()` (Clerk's `delete_self` is already on for the instance) inside `useReverification`, with the same "Please sign in again" fallback.
  - Success: the session ends, the guard sends the learner to `/sign-in`, toast "Account deleted."
  - There's no server route: Syllo has no backend data yet. When Supabase holds learner data, this moves to an API route that deletes that data first (Supabase plan).
- **New dependency:** `expo-image-picker` via `npx expo install`. No others: lucide, expo-image and safe-area are already installed.
- **Analytics:** none (no PostHog in Syllo).

## Out of scope
- Real designs (restyled after the design system).
- Other tabs (Courses etc.), progress stats, notification settings, and an in-app help/FAQ screen.
- Taking a photo with the camera (library only, as in havenly).
- Changing the email address, MFA, passkeys.
- Server-side account deletion and Supabase cleanup.

## Steps
### 1. Dependency and config
`npx expo install expo-image-picker`; add the plugin with `photosPermission` to `app.json`. Check the installed types for `launchImageLibraryAsync`, `user.setProfileImage`, `user.update`, `user.updatePassword`, `user.getSessions`, `session.revoke`, `user.delete` and `useReverification` (in `node_modules/@clerk/shared/dist/types/`). Done: `tsc` passes.

### 2. Shared UI
Port `Sheet`, `Avatar`, `Button`, `IconButton`, `ProfileRow`/`ProfileRowGroup` into `src/components/ui/`, and move `AuthField` to `src/components/ui/text-field.tsx` (`TextField`), updating the auth screens' imports. Add `profileImageUrl` to `display-name.ts` and `src/lib/support.ts`. Done: auth screens unchanged on screen, and `tsc`/lint pass.

### 3. Tabs
Move `(app)/home.tsx` to `(app)/(tabs)/home.tsx`, add `(tabs)/_layout.tsx` with `AppTabBar` and `(tabs)/profile.tsx`, and add `account` to `(app)/_layout.tsx`. Home: greeting with the small avatar, plus the test banner button; Sign out removed. Done: signing in lands on Home with tabs; Profile tab switches.

### 4. Profile screen and Settings sheet
`src/screens/profile/profile-screen.tsx`, `profile-card.tsx`, `settings-sheet.tsx` as in Decisions. Done: the card and rows navigate, the mail link opens, and Sign out returns to `/sign-in`.

### 5. Account: photo and names
`src/screens/profile/account-screen.tsx` with a back button, photo actions and the names form. Done: Add/Change/Remove photo updates Clerk and the avatar everywhere; Save updates names.

### 6. Change password, devices, delete account
`change-password-sheet.tsx`, `sessions-section.tsx`, `delete-account-sheet.tsx` wired into Account. Done: each flow works as described, including the Google-only note.

### 7. Close out
Lint, type check, `expo-doctor`, the web check, `AGENTS.md` updates, `## Result`.

## Verification
- `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` (no new issues).
- Web at phone width, signed in with a test account (`you+clerk_test@example.com`, code `424242`):
  - Tabs switch between Home and Profile.
  - Profile shows the initial avatar, name and email; Account opens.
  - Saving a name shows "Details saved." and Profile updates.
  - Change password with a wrong current password shows Clerk's message.
  - Devices lists this browser as "This device".
  - Delete with the wrong word keeps Delete disabled.
  - Settings → Sign out returns to `/sign-in`.
  - On web the photo picker opens the browser's file chooser, so the photo upload is tested there too.
- On your phone in Expo Go:
  1. Add photo → pick and crop → the avatar updates on Account, Profile and Home.
  2. Change photo, then Remove photo → back to the initial.
  3. Change password, then sign out and sign in with the new one.
  4. Sign in on web too → the phone's Account lists the web session → Sign out of it → web returns to sign-in.
  5. Google account: its photo shows; Account shows the no-password note.
  6. Delete a test account → back to sign-in; signing in again fails ("couldn't find your account").
- End to end: sign up → add photo → rename → change password → sign out → sign in → delete.

## AGENTS.md updates
- **Expo → Route groups:** `(app)` is a Stack holding `(tabs)` (home, profile: `expo-router/js-tabs` with our `AppTabBar`; tab screens pad their bottom by `APP_TAB_BAR_HEIGHT`) plus `account`, pushed over the tabs.
- **Who owns what → Auth:**
  - Profile photos live on Clerk: `user.setProfileImage({ file: dataUrl | null })` + `user.reload()`, picked with `expo-image-picker` (library, square crop, base64). Read with `profileImageUrl(user)` (only when `hasImage`).
  - Names are edited with `user.update`; password with `user.updatePassword` in `useReverification`.
  - Devices via `user.getSessions()` / `session.revoke()`.
  - Delete via `user.delete()` (Clerk `delete_self` on), until learner data exists in Supabase, when it moves to an API route.
  - Sign out lives in Profile's Settings sheet.
- **Rules:** the support email lives in `src/lib/support.ts`.
- **Shared UI:** `Sheet`, `Avatar`, `Button`, `IconButton`, `ProfileRow`, `TextField` in `src/components/ui/` (placeholder styles until the design system).

## Result
Built as planned: `(app)/(tabs)` (Home, Profile) with `AppTabBar`; Profile (photo card, Account, Help & support email, Settings sheet with Sign out); `/account` with Clerk profile photo (add/change/remove via `expo-image-picker` + `user.setProfileImage`), names, change password, signed-in devices and delete account. Shared UI ported from havenly into `src/components/ui/` with colors in `placeholder-colors.ts`; `AuthField` became `TextField`.

Changes from the plan:
- The tab bar sits below the screen (not floating like havenly's), so `APP_TAB_BAR_HEIGHT` isn't exported and tab screens need no bottom padding. Expo Router 58's `BottomTabBarProps` gives `navigateToTab` and `insets`, not `navigation`.
- Delete account wraps `user.delete()` so the call reports whether it ran, because `delete()` returns nothing and a cancelled re-verification would otherwise show "Account deleted.".
- Avatar gained an `sm` size (36) for Home's greeting.

Verified: `tsc` and `expo lint` pass. Not run: `expo-doctor`, the web check and the phone flows, because the machine ran out of memory (Node "Zone Allocation failed").
