# Syllo

Expo React Native LMS (Learning Management System) app for online courses. Learners browse courses, enroll, and work through them chapter by chapter, lesson by lesson. Tutors create and publish the courses. Full stack: the mobile client plus its own backend.

Built following notJust.dev's "Full-stack LMS App" tutorial (https://notjust.notion.site/Full-stack-LMS-App-32cb0ec93c5a801c9e91d5e3d6674d41, video https://www.youtube.com/watch?v=hIoCb0aVJ-Y). The tutorial has two parts: **Part 1, the learner side**, and **Part 2, the course creator (tutor) side**.

This file is the project's memory: it holds every decision that is still true. Plans in `prompts/` are history.

## Commands

~~~bash
npx expo install <package>  # ALWAYS use instead of npm install: resolves SDK-compatible versions
npx expo start              # dev server (press w for web)
npx expo lint               # lint
npx tsc --noEmit            # type check
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
npx eas-cli@latest <cmd>    # EAS builds, submits, and updates (use instead of bare `eas`)
~~~

## Expo

- Expo SDK 58 (React Native 0.88, React 19.3, React Compiler and typed routes on). Expo ships breaking changes every SDK release, so don't trust memory. Before touching an Expo, EAS, or React Native API, check the `expo` major version in `package.json` and read `https://docs.expo.dev/versions/v<major>.0.0/`. For anything else, start from https://docs.expo.dev/llms.txt and follow its links.
- Routes live in `src/app/`: every file is a screen and `_layout.tsx` files define navigators. Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`. Keep components, hooks, and utils outside `src/app/`. Route files stay thin and render a screen from `src/screens/<screen>/`, where screen-only components live. Shared ones go in `src/components/ui/`.
- Never put personal data (emails, names) in route params: on web they land in browser history. Pass them in memory.
- Route groups: `(auth)` (sign-in, sign-up, verify-email) and `(app)` (home). The root layout gates them with `Stack.Protected` on Clerk's `useAuth().isSignedIn` (`!isSignedIn` / `!!isSignedIn`; undefined while loading keeps `(app)` closed), and `/` waits for `isLoaded`, then redirects to `/home` or `/sign-in`. Signing in or out needs no `router` call: `finalize()`/`signOut()` flips the guard. On native the splash waits for Clerk (at most 5s). Root layout order: `GestureHandlerRootView` → `ClerkProvider` → `DynamicNotificationsHost` → Stack. `src/app/sso-callback.tsx` catches the Google/Apple return link.
- `ios/` and `android/` are generated. Never create or edit them by hand; configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, switch to a development build (`npx expo run:ios|android` or `eas build --profile development`).
- Web uses server output (`web.output: "server"`), so the first client render must match the server's. Never nest pressables, and don't size layout from `useWindowDimensions` on web (the server sees 0×0); measure with `onLayout`.
- Android EAS builds are memory-limited (copied from havenly, where they ran the Gradle daemon out of memory with Skia): `plugins/with-gradle-memory-limits.js` runs Gradle one task at a time (`org.gradle.workers.max=1`) and compiles Kotlin in-process, and the `development` profile in `eas.json` compiles only `arm64-v8a` (`ORG_GRADLE_PROJECT_reactNativeArchitectures`). Preview and production keep every ABI.
- `.easignore` replaces `.gitignore` for EAS uploads: keep the two in sync, and keep agent/editor folders (`.claude/`, `.agents/`, `.argent/`, `.cursor/`, `.vscode/`, `.mcp.json`, `skills-lock.json`) out of it, since `.claude/skills` junctions make the EAS CLI fail with EPERM.
- **Argent** (`@swmansion/argent`, dev dependency) is the MCP for driving simulators/emulators and devices: config in `.argent/`, `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`; skills `argent-*` in `.agents/skills/` (pinned in `skills-lock.json`); always-on rules in `.claude/rules/argent.md` and `.cursor/rules/argent.md`.
- Prefer Expo modules over third-party libraries, and load the matching skill (`expo-overview`, `expo-router`, `expo-ui`, `expo-data-fetching`, …) before writing code it covers.

## Who owns what

Each tool has one job. Ask before moving a responsibility to a different tool.

- **UI:** React Native + Expo Router, styled with **NativeWind** (per the tutorial; not installed yet). Set it up from the current NativeWind docs for the installed Expo SDK, not from memory.
- **Auth:** Clerk (`@clerk/expo` 4.x) is the source of truth for who the user is (prompts/02). Clerk app **Syllo** `app_3LPYHBqYlZHx8rxLESWCHWOXoim`, development instance only (no production yet); the project is linked with the Clerk CLI and `clerk env pull` writes the keys to `.env.local`. Instance settings (password minimum 8, first/last name on and optional, Google and Apple with Clerk's shared dev credentials, email code on new devices) are changed with the Clerk MCP `patch_instance_config` (dry run first). Check the installed types in `node_modules/@clerk/shared/dist/types/` and the Clerk MCP before using an API.
  - Custom screens (`src/screens/auth/`) use the current method API: `useSignUp`/`useSignIn` → `.password()`, `signUp.verifications.*EmailCode`, `signIn.mfa.*EmailCode`, `.finalize()`. Never `@clerk/expo/legacy`. Sign-up uses `signUp.create(...)` instead of `.password()` when a leftover attempt exists (`signUp.id`), since a stale one fails with "No sign up attempt was found".
  - Sign-up sends Full name as Clerk first/last name (`splitFullName` in `src/lib/display-name.ts`) and verifies the email with a 6-digit code on `/verify-email`; sign-up renders `<View nativeID="clerk-captcha" />`. Sign-in uses the password; on `needs_client_trust`/`needs_second_factor` it emails a code and opens `/verify-email?flow=sign-in`. The email shown there comes from Clerk's attempt, never the URL. Password minimum is 8 in both Clerk and `validate.ts`; keep them equal.
  - Google/Apple use experimental `useSSO()` from `@clerk/expo/experimental` (browser flow, works in Expo Go, activates the session itself). On web the buttons show a notice instead. Native sheets need a development build.
  - Sessions persist through `tokenCache` (`expo-secure-store`). The Native API must be on in the Clerk Dashboard. Greet with `displayFirstName(user)`.
- **Data:** Supabase (Postgres) holds courses and progress. How Supabase trusts Clerk sessions (and the row-level security that follows) is decided in its plan; check Supabase's and Clerk's current integration docs first.
- **UI design:** screens come from Screensdesign; designs are attached in the chat (see Building from designs).
- **Notifications:** local only (`expo-notifications`, no push server or token) in `src/lib/notifications/local.ts`: foreground handler, permission + Android `reminders` channel, and a listener that shows arriving notifications as the Dynamic Island banner. Scheduled notifications tag `data.kind` so a feature can cancel and rebuild its own. The banner (`src/components/ui/dynamic-notifications/`, ported from havenly; Skia + expo-blur + Reanimated + Gesture Handler) is hosted by `DynamicNotificationsHost` inside `GestureHandlerRootView` in the root layout; call `showBanner` from `src/lib/notifications/banner.ts` anywhere. Web has no banner (`.web.tsx` host). Its colors live in `conf/palette.ts` as placeholders until the design system turns them into tokens.

## Data model

From the tutorial. Columns and relations are decided in the Supabase plan.

- **User**: a learner (signed in through Clerk).
- **Tutor**: a course creator.
- **Course** → **Chapter** → **Lesson**: a course is made of ordered chapters, a chapter of ordered lessons.

## Rules

- Secret keys (Clerk secret key, Supabase service role key, database URLs) never reach the app bundle. Use them only in API routes and local scripts. Never put them behind `EXPO_PUBLIC_`, which is bundled into the app. Never commit `.env`. Keep variable names, without values, in `.env.example`.
- Ask before adding a dependency or service, changing the database schema once data exists, or deleting data.
- Until a toast exists, auth forms show what went wrong (local checks or Clerk's message, via `clerkErrorMessage`/`clerkFieldErrors`) in one error line above the submit button, plus red field borders.
- Whenever you need input from the user, ask through your tool's built-in question panel so they pick from options instead of typing. Give two to four clear options with the recommended one first. Fall back to plain text only if no such panel exists.

## How we build features

For a new feature or a change across several files. Small fixes and questions skip this.

1. **Understand.** Read the code involved. Open an earlier plan only if this feature builds directly on it (pick by file name). Read the current docs pages for the APIs you'll use, and load a matching skill if one exists (e.g. the Expo, Clerk, or Supabase skills). Don't write version-specific APIs from memory.
2. **Ask.** If a real decision is unclear (scope, visible behavior, data shape), ask in the question panel, batching questions into one round and following up only if the answers raise new ones. Pick defaults for the rest and list them. If a decision in this file looks wrong, raise it instead of changing it.
3. **Plan.** Copy `prompts/TEMPLATE.md` to `prompts/NN-feature-name.md` (next number) and fill it in. The plan must be self-contained, so a fresh session can build it from this file plus the plan alone.
4. **IMPORTANT: stop and wait.** Write no app code until the user approves the plan. Ask for approval in the question panel (approve, or request changes). If they request changes, update the plan and ask again. On approval, set `Status: approved`.
5. **Build** step by step, checking each one. If a step turns out wrong, stop and explain instead of redesigning.
6. **Close out.**
   - Run the plan's Verification and give the report described under Reporting.
   - Add a short `## Result` to the plan and set `Status: done`.
   - Update this file: put each lasting decision in the section it belongs to. Replace or remove rules that are no longer true instead of appending. Keep this file under 150 lines.

## Building from designs

Designs are attached in the chat. Screens must match them exactly: layout, spacing, sizes, colors, type, radii, icons, and copy.

- Icons, fonts, and brand images come from `assets/` or the chosen icon library, never recreated from a screenshot. Sample course images may be remote placeholder images. If an asset is missing, use a marked placeholder and list it.
- Map every color, font, spacing value, and radius to a design-system token. List values with no token in the plan as proposed new tokens instead of hardcoding them. When creating the design system itself, derive the tokens from the designs.
- UI plans describe the design (elements, states, tokens, assets) well enough to build without the image. If building in a new session, ask for the design to be attached again.
- After building, open the screen on web (`npx expo start --web`, then the route at `http://127.0.0.1:8081/<route>` in Chrome, framed to phone width), screenshot it, and compare it with the design. List every difference, fix, and repeat. Then the user checks it on their phone in Expo Go (the dev machine is Windows, so there is no iOS simulator). Report which values were estimated from an image.

## Design system

Not built yet. The first plan (`prompts/01-design-system.md`) derives the tokens from the designs and records the rules here.

## Reporting

End every piece of work that changes code (features and fixes, not answers to questions) with this report. Use these headings in this order, and leave out any section that would be empty.

- **Done:** one line on the outcome, then the files changed and what changed in each.
- **Verified:** each check with ✅ or ❌ and its evidence (command output, screenshot). List what wasn't checked as ❌ with the reason. Never mark something ✅ without running it.
- **You need to:** numbered actions only the user can take, such as keys, dashboard settings, manual steps in Clerk or Supabase, or assets to provide.
- **Test it yourself:** numbered steps to reproduce the result from a fresh start, ending with `Expected:` and what the user should see.
- **Notes:** defaults picked, trade-offs, and anything left for later.

## Checks

- Lint and type check pass before any task is called done.
- Screens that load data handle loading, error, and empty states.
