# 02 · Clerk auth: email + password, Google, Apple, sessions and sign out

Status: done (verification pending)

## Goal
Learners create a Syllo account with their name, email and password and verify the email with a 6-digit code, or continue with Google or Apple. Sign-in uses email and password and asks for an emailed code when Clerk wants one (a new device). Sessions survive app restarts, the app is only reachable when signed in, and the home placeholder shows who is signed in with a Sign out button.

## Decisions
- **Clerk application (done while planning):** created with the Clerk CLI as **Syllo** (`app_3LPYHBqYlZHx8rxLESWCHWOXoim`), development instance `ins_3LPYHF0pFSthnc4cObVU63937GP`. The project is linked (`clerk link`, resolved through the git remote), and `clerk env pull` wrote `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local` (gitignored). There's no production instance yet.
- **Screens (user choice: custom):** our own sign-up, sign-in and verify-email screens built on Clerk's custom-flow hooks, so they can match the Screensdesign designs later. Until the design system exists (`prompts/01-design-system.md`), they use plain React Native `Text`/`TextInput`/`Pressable` with `StyleSheet`. Each style block is marked as a placeholder, and nothing is designed here. When the auth designs are attached, a later plan restyles these screens without touching the Clerk logic.
- **Methods (user choice):** email + password, Google and Apple.
- **Tutor role (user choice):** later, in Part 2. Everyone is a learner here, and nothing goes in metadata.
- **SDK:** `@clerk/expo` (4.14.x now, supports Expo `>=54 <59`). It's newer than memory, so every call is checked against the installed types in `node_modules/@clerk/shared/dist/types/` (`signUpFuture.d.ts`, `signInFuture.d.ts`) and the Clerk MCP before use. Use the current method API (`useSignUp`/`useSignIn` → `{ signUp | signIn, errors, fetchStatus }`, `.password()`, `.verifications.sendEmailCode()` / `.verifyEmailCode()`, `signIn.mfa.*EmailCode`, `.finalize()`). Never `@clerk/expo/legacy` (`prepareFirstFactor`, `setActive` from the hooks).
- **Clerk instance settings (development), changed with `patch_instance_config` (dry run first):**
  - `auth_password.min_length` 15 → **8**, with the app's own check also 8. Breached-password check (HIBP) stays on.
  - `user_model.first_name` / `last_name` → **enabled, not required**, so Google and Apple users without names still pass.
  - `connection_oauth_apple.enabled` → **true** (Clerk's shared dev credentials). Google is already on with shared dev credentials.
  - Email stays required and verified with `email_code`; device trust (code on a new device) stays on.
- **Native API:** must be on (Dashboard → Native applications) so native requests skip browser CAPTCHA. The CLI and MCP don't expose it, so it's a dashboard step for you.
- **Sign-up:** fields Full name, Email and Password. Full name is split on the first space into `firstName`/`lastName` (one word → first name only) and passed to `signUp.password({ emailAddress, password, firstName, lastName })`. If a leftover attempt exists (`signUp.id`), use `signUp.create(...)` instead, because `.password()` patches a stale attempt and fails with "No sign up attempt was found" (a known issue from havenly). Then `signUp.verifications.sendEmailCode()` and push `/verify-email`. The screen renders `<View nativeID="clerk-captcha" />` (web bot protection).
- **Sign-in:** `signIn.password({ emailAddress, password })`. Status `complete` → `finalize()`. Status `needs_client_trust` or `needs_second_factor` with an email code factor → `signIn.mfa.sendEmailCode()` and push `/verify-email?flow=sign-in`. Any other status → the message "This sign-in needs a step Syllo doesn't support yet." and `signIn.reset()`.
- **Verify email:** one screen for both flows, with a `flow` param `sign-up` (default) or `sign-in` (not personal data). The email shown comes from the Clerk attempt, never the URL. A 6-digit code input, plus Resend with a 30s cooldown. When the status becomes `complete` → `finalize()`. If nothing is pending (e.g. after a reload), redirect to `/sign-up` or `/sign-in`.
- **Google and Apple:** `useSSO()` from wherever the installed 4.14 types export it (it was in `@clerk/expo/experimental` in havenly; check first). Strategies `oauth_google` / `oauth_apple`. It runs as a browser flow (works in Expo Go) and activates the session itself. A cancelled flow does nothing. `src/app/sso-callback.tsx` redirects to `/`, so Android's return deep link (`syllo://sso-callback`) never hits an unmatched route. On web the buttons show "Google/Apple sign-in works in the Syllo app." instead. Native Google/Apple sheets need a development build and come later.
- **Errors and feedback:** there are no toasts yet, so errors show as one line of red text above the submit button, and field borders turn red from `errors.fields.*`. `clerkErrorMessage(error)` returns the first error's `longMessage ?? message`, with the fallback "Something went wrong. Try again." Local checks (empty fields, email shape, password ≥ 8) run first, so empty forms never reach Clerk. Submit buttons are disabled and show "…" while `fetchStatus === "fetching"` or an SSO flow is open.
- **Routes:**
  - `src/app/(auth)/` holds `sign-in`, `sign-up` and `verify-email`.
  - `src/app/(app)/` holds `index`, the home placeholder.
  - `src/app/sso-callback.tsx` sits at the top level.
  - Route files stay thin and render screens from `src/screens/auth/` and `src/screens/home/`.
  - The root layout uses `Stack.Protected` with `guard={!isSignedIn}` for `(auth)` and `guard={!!isSignedIn}` for `(app)`. While Clerk loads, `(app)` stays closed and `(auth)` stays open, so a web reload of `/sign-in` keeps its place, and the server render matches.
  - Signing in or out makes no `router` calls: `finalize()`/`signOut()` flips the guard. The first screen for a signed-out user is `/sign-in`, which links to sign-up.
- **Provider order:** `GestureHandlerRootView` → `ClerkProvider` (`publishableKey` from `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `tokenCache` from `@clerk/expo/token-cache`) → `DynamicNotificationsHost` → the Stack. A missing key throws a clear error at startup.
- **Splash:** on native, `expo-splash-screen` stays up until Clerk is loaded, at most 5s, so an offline launch can't hang on the splash.
- **Home placeholder:** "Hi, {first name}" (else the capitalized email local part, else "there"), the email in grey, a Sign out button (`useClerk().signOut()`), and the existing "Show test banner" button. `displayFirstName(user)` and `splitFullName(fullName)` live in `src/lib/display-name.ts`.
- **Persistent sessions:** `tokenCache` stores the session in the keychain via `expo-secure-store` on native. Web uses Clerk's own storage.
- **New dependencies (via `npx expo install`):** `@clerk/expo`, `expo-secure-store`, `expo-auth-session` and `expo-crypto` (peers for `useSSO`). `expo-web-browser` and `expo-constants` are already installed. Add `"expo-secure-store"` and `"@clerk/expo"` to the `app.json` plugins.
- **Secrets:** the app reads only `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`. `CLERK_SECRET_KEY` stays in `.env.local` and nothing here uses it. Add a `.env.example` with both names and no values.

## Out of scope
- Styling to the Screensdesign designs (after the design system).
- Forgot password, MFA beyond the emailed code, passkeys, native Google/Apple sheets.
- Profile and account editing, and deleting the account.
- Learner/tutor roles (Part 2).
- Supabase: how it trusts Clerk sessions (Clerk as a third-party auth provider, `role` claim) and row-level security belong to the Supabase plan.
- The Clerk production instance, its custom domain, and production Google/Apple credentials (release plan). EAS environment variables (there's no EAS project yet).

## Steps
### 1. Clerk instance settings
Read the development config (`get_instance_config`) and schema (`get_instance_config_schema`) for `auth_password`, `user_model` and `connection_oauth_apple`. Then `patch_instance_config` with `dry_run: true` for: `auth_password.min_length: 8`, `user_model.first_name.enabled: true`, `user_model.last_name.enabled: true`, `connection_oauth_apple.enabled: true`. Apply it after the dry run shows only those changes. Done: re-reading the config shows the new values.

### 2. Dependencies and config
`npx expo install @clerk/expo expo-secure-store expo-auth-session expo-crypto`. Add `"expo-secure-store"` and `"@clerk/expo"` to the `app.json` plugins (the install may add them; check for duplicates). Create `.env.example` with `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=` and `CLERK_SECRET_KEY=`. Read the installed types for `useSignUp`, `useSignIn`, `useSSO`, `tokenCache` and `ClerkProvider`, and note any difference from Decisions before writing code. Done: `npx expo-doctor` shows no new problems and `tsc` passes.

### 3. Session plumbing and routes
Root layout: providers in the Decisions order; a `RootStack` that reads `useAuth()` with the `Stack.Protected` guards; the splash held on native until `isLoaded` (5s cap). Move `src/app/index.tsx` to `src/app/(app)/index.tsx`, rendering `src/screens/home/home-screen.tsx` (the placeholder plus the test banner button). Add `src/app/sso-callback.tsx` and `src/lib/display-name.ts`. Done: the app boots signed out to `/sign-in` (a stub screen for now) with no errors.

### 4. Shared auth pieces
`src/screens/auth/clerk-errors.ts` (`clerkErrorMessage`, `fieldHasError`); `src/screens/auth/validate.ts` (email shape, password ≥ 8, name present); `src/screens/auth/auth-form.tsx` (title, labelled `TextInput` fields with red error borders, error line, submit button with busy state, Google and Apple buttons, footer link), all with placeholder styles. Done: `tsc` passes.

### 5. Sign-up
`src/screens/auth/sign-up-screen.tsx` with `useSignUp()` as in Decisions, plus the captcha view. Done: a new email gets a code and opens `/verify-email`; an existing email shows Clerk's message.

### 6. Verify email
`src/screens/auth/verify-email-screen.tsx` for both flows. Done: the right code lands on home; a wrong code shows the error and clears the input; Resend works after the cooldown.

### 7. Sign-in
`src/screens/auth/sign-in-screen.tsx` with `useSignIn()` and its status branches. Done: the right password → home; a wrong password → red password border plus Clerk's message; the new-device check → `/verify-email?flow=sign-in`.

### 8. Google and Apple
`src/screens/auth/use-social-sign-in.ts` wraps `useSSO()` (busy state, cancel does nothing, errors in the error line, a web notice). Wire it into both screens. Done: Google in Expo Go lands on home, and cancelling returns quietly.

### 9. Close out
Lint, type check, web check, `AGENTS.md` updates, `## Result`.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass; `npx expo-doctor` shows no new issues.
- Web (`npx expo start --web`, Chrome at phone width; I create no accounts):
  - The app boots to `/sign-in` with no console errors.
  - Empty forms show local errors and red borders, and never call Clerk.
  - Google/Apple show the web notice.
  - Signed out, `/` redirects to `/sign-in`.
  - `/verify-email` with nothing pending redirects to `/sign-up`.
- On your phone in Expo Go, with real Clerk calls. Test emails like `name+clerk_test@example.com` take code `424242` and send no email.
  1. Sign up → code → home greets your first name.
  2. A wrong code shows the error; Resend sends a new code.
  3. Force-quit and reopen → still on home.
  4. Sign out → sign-in screen; reopen → still signed out.
  5. Sign in with the same account → home.
  6. A wrong password → error line and red password border.
  7. Google → browser → home; Apple → browser → home.
  8. Cancel Google halfway → back on the form, no error.
- End to end: steps 1–7 on one device, then a cold start lands on home.

## AGENTS.md updates
- **Expo:** routes are `(auth)` (sign-in, sign-up, verify-email) and `(app)`, gated by `Stack.Protected` on `useAuth().isSignedIn` (`!isSignedIn` / `!!isSignedIn`). Signing in or out needs no router calls. On native, the splash waits for Clerk (5s cap). Provider order in the root layout.
- **Who owns what → Auth:** replace "Clerk (the tutorial's sponsor) is the source of truth…" with the concrete setup:
  - The app and instance ids, and keys in `.env.local` via `clerk env pull`.
  - The custom-flow method API (never `@clerk/expo/legacy`) and the `signUp.create` rule for leftover attempts.
  - Names stored as first/last name. Password minimum 8 in both Clerk and `validate.ts`.
  - Email code on new devices.
  - Google/Apple via `useSSO` (browser flow), with `sso-callback`.
  - Sessions via `tokenCache`.
  - The Native API on.
  - `clerk-captcha` on sign-up.
- **Rules:** none replaced. Clerk errors show Clerk's message in the form's error line with red borders, until a toast exists.

## Result
Built as planned: Clerk app Syllo (dev instance) created and linked with the CLI, instance settings patched with the MCP (password minimum 8, first/last name on, Apple on), `@clerk/expo` 4.14.4 + `expo-secure-store`, `expo-auth-session`, `expo-crypto`; custom sign-up / sign-in / verify-email screens with placeholder styles; Google/Apple via experimental `useSSO()`; sessions in `tokenCache`; home placeholder with Sign out.

Changes from the plan:
- Home lives at `(app)/home`, and a root `src/app/index.tsx` waits for Clerk and redirects to `/home` or `/sign-in` (havenly's proven pattern), instead of `(app)/index`.
- Auth field refs use `ComponentRef<typeof TextInput>` (RN 0.88's `TextInput` is a function component) and are declared one by one, because the React Compiler lint rule rejects reading refs from an object during render.
- `npx expo install --fix` moved the SDK 58 packages to their expected patch versions: `expo-auth-session` had pulled in second copies of `expo-constants` and `expo-linking`. It also added the `expo-image` config plugin.

Verified: `tsc` and `expo lint` pass (before the patch bump). Not yet run: `tsc`/lint/`expo-doctor` after the patch bump, the web check, and the phone test, because the machine ran out of memory.

Follow-up (user request): havenly's toast setup replaced the inline error line. `react-native-toast-message` + `lucide-react-native` + `react-native-svg` (user chose lucide as the icon library); `src/components/ui/toast.tsx` with `ToastHost` last in the root layout; `reportInvalid` / `reportClerkError` show one toast per failure with red borders kept; welcome, signed-in, signed-out and code-sent toasts as in havenly; `showBanner` falls back to an info toast on web. `tsc` and `expo lint` pass after this change; `expo-doctor` could not run (ENOMEM).
