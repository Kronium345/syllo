# 11 · Onboarding after sign-in, gated on the profile row

Status: done

## Goal
Onboarding runs after sign-in and ends by writing the learner's answers to their `profiles` row. The signed-in layout sends anyone without a profile row to onboarding, and anyone with one straight to the app.

## Decisions
- **Flow (user):** Welcome → Sign up / Log in → (no profile row) Goal → Interests → Insight → Testimonials → Paywall → Home.
  - Welcome's "Get Started" now opens `/sign-up`; "Log In" still opens `/sign-in`.
  - Returning users with a row go straight to Home.
- **Onboarded = a profile row exists (user):** the row is inserted only when onboarding finishes, and every other path that used to create it is changed:
  - `useSyncProfile` keeps the name and photo in step but only **updates** an existing row. `syncProfile` becomes an update by `id`, and no rows is fine.
  - `start_quiz_attempt`: the migration `profiles_created_by_onboarding` removes its `insert into profiles … on conflict do nothing`. Learners can't reach quizzes before onboarding, so the row exists.
  - **The `premium-sync` Edge Function** no longer upserts a profile. When the profile is missing, it returns the RevenueCat status without storing it. Onboarding calls `premium-sync` right after inserting the row, so a Pro purchase made on the onboarding paywall is stored. Redeploy.
- **Finishing onboarding** (the paywall's close, or after a purchase): one service, `completeOnboarding(supabase, { id, fullName, avatarUrl, goal, interests })`, **inserts** the row with `onboarding_completed_at = now()`.
  - On success it clears the in-memory answers and invalidates `profiles.me`. The guard flips and Home opens.
  - Then `useSyncPremium` runs, with no need to wait for it.
  - On failure it shows `toast.error` and stays on the paywall. "Already exists" (23505) counts as done.
- **Existing accounts (user):** anyone with a row (Jane Doe and others) is treated as onboarded. Nothing changes for them.
- **The gate**, in `src/app/(app)/_layout.tsx`:
  - It reads `useMyProfile()`, which is null when there's no row.
  - While loading it shows a centred spinner on `bg-canvas`. On error it shows "Couldn't load your profile." with "Try again".
  - Then a `Stack` with `<Stack.Protected guard={!onboarded}>` around the `onboarding` group, and `<Stack.Protected guard={onboarded}>` around `(tabs)`, `account`, `course/[id]`, `lesson/[id]`, `quiz/[id]`, `attempt/[id]`, `premium` and `search`.
  - SDK 58's `redirectTo` sends a blocked route to `/onboarding/goal` or `/home`.
  - `/` still redirects signed-in users to `/home`, and the guard reroutes them.
- **Routes:**
  - The onboarding screens move from `(auth)` to `(app)/onboarding/`: `goal`, `interests`, `insight`, `testimonials`, `paywall`.
  - `(auth)` keeps `welcome`, `sign-in`, `sign-up` and `verify-email`.
  - The onboarding paywall is `PaywallScreen mode="onboarding"`: close or a purchase now finishes onboarding instead of opening sign-up. `mode="upgrade"` (`/premium`) is unchanged.
  - The paywall's purchase copy changes from "Now create your free account…" to "Welcome to Syllo Pro!".
- **Goal back button:** on Goal, which is the first signed-in screen, back has nowhere to go. The back button is hidden there; the other steps keep it.
- **Step counter:** sign-up is no longer a step after the paywall, so the header reads `n/5` (Goal 1, Interests 2, Insight 3, Testimonials 4, Paywall 5). The prototype's "/6" assumed a later step. Listed in the Result.
- **Removed:** `useSaveOnboardingAnswers` (answers are saved by the finish step instead) and its mount. `saveOnboarding` (the upsert) is replaced by `completeOnboarding` (an insert).
- **Docs:** AGENTS.md's signed-out flow, route groups, profiles, the Edge Function line and the `useSyncProfile` description.

## Out of scope
- Editing onboarding answers later (Profile).
- Resuming a half-finished onboarding after the app is killed: answers are in memory, so it restarts at Goal.

## Steps
### 1. Migration `profiles_created_by_onboarding`
- Replace `private.start_quiz_attempt` with the same body minus the profile insert.
- Then `db:push`, `db:types`, and the advisors.

### 2. Edge Function
- `premium-sync`: drop the profile upsert. If the `profiles` row is missing, skip the write and return `{ premium, expiresAt, stored: false }`.
- Deploy, then repeat the earlier curl checks.

### 3. Services and hooks
- `profiles.ts`: `upsertProfile` becomes `updateProfile` (an update by id), plus `completeOnboarding` (an insert).
- Hooks: `useUpdateProfile` (replacing `useUpsertProfile`; the account-deletion restore keeps an upsert, so keep `upsertProfile` for that alone) and `useCompleteOnboarding`.
- `useSyncProfile` uses the update.

### 4. Routes and gate
- Move the five onboarding routes into `(app)/onboarding/`. Add `(app)/onboarding/_layout.tsx` (a Stack with slide animation).
- Rewrite `(app)/_layout.tsx` with the gate.
- `(auth)/_layout.tsx` lists only its four screens.
- Welcome's Get Started opens `/sign-up`.

### 5. Screens
- `OnboardingHeader`: `total = 5`, and a `showBack` prop (false on Goal).
- `PaywallScreen` onboarding mode: `leave` and `unlocked` call the finish step.
- Remove `useSaveOnboardingAnswers`.

### 6. Close out
- AGENTS.md and the Result.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass. No new advisor warnings.
- **SQL** (rolled back), as a user with no profile row and enrollment in a preview course: `start_quiz_attempt` fails on the profile foreign key instead of creating a row. This proves the insert is gone. As Jane Doe: it still works.
- **Expo Go:**
  1. Sign up a new account: the Goal step opens (no Home flash).
  2. Finish the steps and close the paywall: Home opens.
  3. In Supabase, the new row has the goal, interests and `onboarding_completed_at`.
  4. Sign out and sign back in: straight to Home.
  5. Jane Doe signs in: straight to Home.
  6. Deep link `/home` before finishing onboarding: redirected to Goal.

## Result
- **Migration `20261101131653_profiles_created_by_onboarding`:** applied and the types regenerated. Security advisor: no findings.
- **SQL checks** (rolled back):
  - A signed-in user with no profile row gets `23503 quiz_attempts_user_id_fkey` from `start_quiz_attempt`, so the old row insert is gone.
  - Jane Doe still starts a 3-question attempt.
  - No stray profile row was created.
- **`premium-sync`:** redeployed; it no longer upserts profiles. A webhook for an id with no profile returned 200, and `profiles` still has no row for it. A missing token still returns 401.
- **App:**
  - `completeOnboarding` (insert, 23505 = done), `updateProfile` (update-only), and the hooks `useCompleteOnboarding` and `useUpdateProfile`.
  - Removed `saveOnboarding`, `useSaveOnboarding` and `useSaveOnboardingAnswers`.
  - The `(app)/_layout.tsx` gate with `Stack.Protected` + `redirectTo`.
  - The onboarding routes moved to `(app)/onboarding/` (with `_layout.tsx`); the paywall route uses `mode="onboarding"`.
  - Welcome → `/sign-up`.
  - Header `n/5`, and no back button on Goal (a spacer keeps the bar in place).
- **Typed routes:** regenerated; `/onboarding/paywall` is present and `/paywall` is gone.
- **Checks:** `npx tsc --noEmit` and `npx expo lint` pass (rerun later with a 3 GB heap; the first try ran out of memory).
- **Device test:** Argent on an Android dev build (SM-S942B). Sign-up → Goal 1/5 (no back) → Interests → Insight → Testimonials → paywall (Test Store plans) → close → Home. The row was created only at the paywall close. Relaunch went straight to Home, and `syllo://onboarding/goal` stayed on Home.
