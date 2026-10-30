# Syllo

Expo React Native LMS (Learning Management System) app for online courses. Learners browse courses, enroll, and work through them chapter by chapter, lesson by lesson. Tutors create and publish the courses. Full stack: the mobile client plus its own backend.

Built following notJust.dev's "Full-stack LMS App" tutorial (https://notjust.notion.site/Full-stack-LMS-App-32cb0ec93c5a801c9e91d5e3d6674d41, video https://www.youtube.com/watch?v=hIoCb0aVJ-Y). The tutorial has two parts: **Part 1, the learner side**, and **Part 2, the course creator (tutor) side**.

This file is the project's memory: it holds every decision that is still true. Plans in `prompts/` are history.

## Commands

~~~bash
npx expo install <package>  # ALWAYS use instead of npm install: resolves SDK-compatible versions (only exception: the `supabase` CLI dev dependency, `npm i -D`)
npx expo start              # dev server (press w for web)
npx expo lint               # lint
npx tsc --noEmit            # type check
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
npx eas-cli@latest <cmd>    # EAS builds, submits, and updates (use instead of bare `eas`)
npx supabase migration new <name>  # new schema change in supabase/migrations/
npm run db:push             # apply migrations + seed to the linked hosted project
npm run db:types            # regenerate src/lib/database.types.ts
node scripts/build-exam-prep-seed.mjs  # rebuild supabase/seeds/exam-prep.sql from its source JSON
~~~

## Expo

- Expo SDK 58 (React Native 0.88, React 19.3, React Compiler and typed routes on). Expo ships breaking changes every SDK release, so don't trust memory. Before touching an Expo, EAS, or React Native API, check the `expo` major version in `package.json` and read `https://docs.expo.dev/versions/v<major>.0.0/`. For anything else, start from https://docs.expo.dev/llms.txt and follow its links.
- Routes live in `src/app/`: every file is a screen and `_layout.tsx` files define navigators. Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`. Keep components, hooks, and utils outside `src/app/`. Route files stay thin and render a screen from `src/screens/<screen>/`, where screen-only components live. Shared ones go in `src/components/ui/`.
- Never put personal data (emails, names) in route params: on web they land in browser history. Pass them in memory.
- Route groups: `(auth)` (sign-in, sign-up, verify-email) and `(app)`. `(app)` is a Stack holding `(tabs)` (home, search, profile: `Tabs` from `expo-router/js-tabs` with our `AppTabBar` in `src/components/app-tab-bar.tsx`, which sits below the screen, so tab screens need no bottom padding; it gets `navigateToTab`/`insets` props, not `navigation`) plus `account`, pushed over the tabs. The root layout gates them with `Stack.Protected` on Clerk's `useAuth().isSignedIn` (`!isSignedIn` / `!!isSignedIn`; undefined while loading keeps `(app)` closed), and `/` waits for `isLoaded`, then redirects to `/home` or `/sign-in`. Signing in or out needs no `router` call: `finalize()`/`signOut()` flips the guard. On native the splash waits for Clerk (at most 5s). Root layout order: `GestureHandlerRootView` → `ClerkProvider` → `QueryClientProvider` (+ `QueryCacheReset`) → `DynamicNotificationsHost` → Stack, then `ToastHost` last. `src/app/sso-callback.tsx` catches the Google/Apple return link.
- Temporary screens until the designs exist: Home greets the learner, shows "{n} courses available" (`useCourseCount`) and a test banner button; Search is a test list of course titles (`useCourses`, pull-to-refresh), each with a trash icon that deletes the course after a confirm sheet (`useDeleteCourse`; only its tutor may). Both get replaced by their designs.
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
  - Profile (prompts/03): photos live on Clerk (no instance setting needed): picked with `expo-image-picker` (library, square crop, quality 0.7, base64), uploaded with `user.setProfileImage({ file: dataUrl | null })` + `user.reload()`, read with `profileImageUrl(user)` (only when `hasImage`; Clerk's default image shows as our initial `Avatar`). `/account` edits names (`user.update`), changes the password (`user.updatePassword` in `useReverification`; when Clerk wants re-verification the learner is asked to sign in again), lists devices (`user.getSessions`, `session.revoke`) and deletes the account with `user.delete()` (Clerk `delete_self` on), after removing the learner's Supabase data (see Data). Sign out lives in Profile's Settings sheet.
- **Data:** Supabase (Postgres) holds courses and learner data (prompts/04). Hosted project **syllo** `qlpbjfzyvfyrrpcisnpu` (eu-west-2 London, free plan, org `ahbhgyuptetukbjfpupw`); no local Docker stack yet (`supabase/config.toml` is ready for `npx supabase start`). Managed with the Supabase CLI (dev dependency, linked) and the Supabase MCP; `supabase/` holds `migrations/`, `seed.sql` and `seeds/` (generated `exam-prep.sql` plus its `source/` JSON), all listed in `config.toml` `[db.seed]`.
  - Clerk is a Supabase third-party auth provider (domain `still-mastiff-2250.clerk.accounts.dev`, added in the dashboard: hosted third-party auth can't be set from the CLI; don't `supabase config push`, it would overwrite hosted auth settings with local-dev defaults). Clerk session tokens carry `role: "authenticated"` (`session.claims`, set with the Clerk MCP). The production Clerk instance will need its own provider entry. Supabase Auth is unused.
  - All remote data goes through **TanStack Query** (`@tanstack/react-query` v5, prompts/06): one `queryClient` in `src/lib/query-client.ts` (60s stale, 2 retries except permission/PostgREST/constraint errors, no mutation retries; `focusManager` on AppState and `onlineManager` on `expo-network` on native). Two layers:
    - **Services** (`src/services/<area>.ts`, e.g. `courses.ts`, `profiles.ts`): plain async functions, no React, the only code that queries Supabase. Each takes the client first (`getCourses(supabase, signal?)`, `deleteCourse(supabase, id)`), because the client carries the learner's Clerk token. Every query ends with `.throwOnError()` (it rejects with the `PostgrestError` and types `data` as non-null), and writes RLS refused throw `NotAllowedError` (`services/errors.ts`).
    - **Hooks**, one per file in `src/lib/queries/<area>/use-<name>.ts`, re-exported by `<area>/index.ts`, so screens import from `@/lib/queries/<area>`. They hold only the cache logic: key, `queryFn`/`mutationFn` calling a service, invalidation and optimistic updates. Keys live in `queries/keys.ts` (nested, so invalidating `["courses"]` refreshes every course query).
  - `QueryCacheReset` in the root layout clears the cache when the Clerk user changes, since RLS makes results per learner.
  - Only the hooks call `useSupabase()` from `src/lib/supabase.ts` (supabase-js, typed with the generated `src/lib/database.types.ts`, Clerk token via `accessToken`; `AppSupabaseClient` is its type for services). Env: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the `sb_publishable_` key). No service-role key in the app.
  - RLS on every table, `to authenticated` only (anon reads nothing). Compare the user with `((select auth.jwt()) ->> 'sub')` (the advisor rejects other forms). User ids are Clerk ids (`text`, default `auth.jwt()->>'sub'`).
  - `useSyncProfile` (mounted in `(app)/_layout.tsx`) upserts the learner's `profiles` row from Clerk after sign-in and on name/photo changes. Deleting the account deletes the profile first (enrollments cascade), then the Clerk user, restoring the profile if Clerk's step doesn't happen.
- **UI design:** screens come from Screensdesign; designs are attached in the chat (see Building from designs).
- **Notifications:** local only (`expo-notifications`, no push server or token) in `src/lib/notifications/local.ts`: foreground handler, permission + Android `reminders` channel, and a listener that shows arriving notifications as the Dynamic Island banner. Scheduled notifications tag `data.kind` so a feature can cancel and rebuild its own. The banner (`src/components/ui/dynamic-notifications/`, ported from havenly; Skia + expo-blur + Reanimated + Gesture Handler) is hosted by `DynamicNotificationsHost` inside `GestureHandlerRootView` in the root layout; call `showBanner` from `src/lib/notifications/banner.ts` anywhere. Web has no banner (`.web.tsx` host). Its colors live in `conf/palette.ts` as placeholders until the design system turns them into tokens.

## Data model

From the tutorial; the schema is in `supabase/migrations/`.

- **profiles**: one per learner, `id` = Clerk user id. A learner reads and writes only their own.
- **tutors**: course creators. `profile_id` links a tutor to a Clerk user (one tutor per user); it decides who may delete a course, and Part 2 builds tutor authoring on it. Readable by all learners.
- **courses** → **chapters** → **lessons**: ordered by `position`. Published courses and their outline (lesson titles, durations, `is_preview`) are readable by all learners.
- **lesson_contents**: a lesson's `video_url` and markdown `body`, readable only for preview lessons or courses the learner is enrolled in. Kept apart from `lessons` so RLS can show the outline but hide the content.
- **enrollments**: learner ↔ course (unique). A learner enrolls themselves only in published courses, and can leave.
- **quizzes** (per chapter, `is_preview`) → **quiz_questions** (`prompt`, `explanation`, `reference_url`) → **quiz_answers** (one `is_correct`). Quizzes are part of the readable outline; questions and answers follow the lesson rule (preview or enrolled). Learners can never read `quiz_answers.is_correct`: it's granted per column, so select `id, question_id, position, text` explicitly (`select=*` is refused).
- **quiz_attempts** / **quiz_attempt_answers** (prompts/05): graded only by the database through RPCs `start_quiz_attempt(p_quiz_id)`, `answer_quiz_question(p_attempt_id, p_question_id, p_answer_id | null)` (returns `is_correct`, `correct_answer_id`, `explanation`; one answer per question; null = skipped/timed out) and `finish_quiz_attempt(p_attempt_id)` (early finish allowed; unanswered = skipped). Learners only read their own attempts; there are no direct writes. The logic lives in `private.*` SECURITY DEFINER functions behind `public` SECURITY INVOKER wrappers, with the shared access check `private.can_use_quiz`. Points (correct × 10, as in the older pharmacy app) are computed in the app, not stored. **question_flags**: a learner's own review bookmarks.
- Course writes so far: a course's own tutor (`tutors.profile_id` = the Clerk user) can delete it (cascades to its chapters, lessons, quizzes, enrollments and attempts). RLS doesn't error on a refused write, it affects 0 rows, so write services use `.select("id")` and treat no rows as "not allowed". The dev account "Jane Doe" (`user_3LPjnOxWpKlgGGXl1aBHSLj1llj`) is linked to tutor Maya Okafor for testing (a data change, not in the seed), so it can delete React Native Basics and Advanced Mobile Animations.
- Seeds: `seed.sql` (3 tutors, 6 sample courses, 19 chapters, 58 lessons) and `seeds/exam-prep.sql` (**Pharmacy Exam Prep**: 17 topic chapters, one quiz each, 2,451 questions; "Sample Questions" is the preview). Ids come from `md5()` of readable keys, so both can re-run. `exam-prep.sql` is generated by `node scripts/build-exam-prep-seed.mjs` from `supabase/seeds/source/exam-prep.json` (exported read-only from the user's older pharmacy quiz project on MongoDB Atlas). Never use that project's name in Syllo.

## Rules

- Secret keys (Clerk secret key, Supabase service role key, database URLs) never reach the app bundle. Use them only in API routes and local scripts. Never put them behind `EXPO_PUBLIC_`, which is bundled into the app. Never commit `.env`. Keep variable names, without values, in `.env.example`.
- Ask before adding a dependency or service, changing the database schema once data exists, or deleting data.
- **Data fetching follows `.claude/rules/data-fetching.md`** (mirrored in `.cursor/rules/`): screens use TanStack Query hooks from `src/lib/queries/`, hooks wrap services, and only services in `src/services/` query Supabase, ending every query with `.throwOnError()`. Screens render loading, error (+ "Try again") and empty states, and show `NotAllowedError` as "not allowed". `eslint.config.js` enforces the layering: UI files can't import the Supabase client, services or TanStack's data hooks; services can't import React/TanStack and must `.throwOnError()`; hooks can't build queries. Keep the rule file, the lint config and this section in step.
- Every schema change is a migration file in `supabase/migrations/` applied with `npm run db:push`; never change the hosted schema by hand. After each one, regenerate the types and run the Supabase security and performance advisors (no new warnings). In Git Bash, prefix CLIs that take `/paths` (e.g. `clerk api /users`) with `MSYS_NO_PATHCONV=1`.
- Feedback uses `toast.success|error|info(title, message?)` from `@/components/ui/toast` (`react-native-toast-message` with our own card, ported from havenly: top of screen, 3.5s, lucide icons, one `ToastHost` mounted last in the root layout). Never import the library in screens. Form validation shows red field borders plus one toast (`reportInvalid`), never inline error text; Clerk errors do the same with Clerk's message (`clerkFieldErrors`, `reportClerkError`). `showBanner` falls back to an info toast where there's no banner (web). Toast colors are placeholders until the design system.
- Icons come from `lucide-react-native` (with `react-native-svg`). Third-party marks (Google, Apple) are SVGs in `assets/brand/` drawn by `BrandLogo`.
- Shared UI in `src/components/ui/` (ported from havenly): `Sheet`, `Avatar`, `Button`, `IconButton`, `ProfileRow`/`ProfileRowGroup`, `TextField` (password eye toggle), `BrandLogo`, `toast`. Until the design system, their colors come from `placeholder-colors.ts` (one place to swap for tokens).
- The support email is `SUPPORT_EMAIL` in `src/lib/support.ts` (`emailSupport()` opens mail, else an info toast with the address).
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
