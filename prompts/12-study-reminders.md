# 12 · Study reminders

Status: done

## Goal
Syllo reminds learners to come back to unfinished work, the way the older pharmacy app did: a reminder 24 hours later for each unfinished quiz and in-progress course, a daily 6 PM check-in while anything is unfinished, and a tap that opens the right screen. Learners can switch reminders off in Settings.

## How the older app did it (reference, not copied verbatim)
- **Permission:** `requestPermissionsAsync()` when its home screen opened, with an alert offering Settings if refused.
- **Android channel:** `study-reminders`, "Study Task Reminders", HIGH importance, vibration.
- **Per-task reminder:** each unfinished topic got a `TIME_INTERVAL` 24h notification, "📚 Study Reminder" / "Don't forget to complete your <topic> Quiz! Keep up the great work! 💪", with `data.screen` naming the screen to open. Finishing a task cancelled it; continuing one rescheduled it for 4h.
- **Daily check-in:** a `DAILY` 18:00 notification, "🎯 Daily Study Check-in" / "Time to check your progress! Complete your remaining study tasks today.", scheduled while work was unfinished.
- **Bookkeeping:** ids in AsyncStorage, and a response listener that navigated on tap.

## Decisions
- **Permission (user: on first Home visit, like the old app):**
  - The first time Home mounts after sign-in, while the OS status is still `undetermined`, Syllo asks once through the OS dialog.
  - There's no repeat prompt or nagging alert: the OS only lets apps ask once anyway.
  - If refused, the Settings toggle explains how to turn it on, with "Open settings" (`Linking.openSettings()`).
- **What is scheduled (user: same as the old app),** all tagged `data.kind = "study-reminder"` (the AGENTS.md rule):
  - **Each unfinished quiz attempt** (`quiz_attempts.finished_at is null`): `TIME_INTERVAL` 24h, id `study-quiz-<attemptId>`.
    - "📚 Study Reminder" / "Don't forget to finish your <quiz title> quiz! Keep up the great work 💪".
    - `data.url = /attempt/<id>`, which resumes it.
  - **Each in-progress course** (enrolled, at least one lesson left): `TIME_INTERVAL` 24h, id `study-course-<courseId>`.
    - "📚 Study Reminder" / "Pick up <course title> where you left off 💪".
    - `data.url = /course/<id>`, where "Continue Learning" opens the next lesson.
  - **While either list is non-empty:** `DAILY` 18:00, id `study-daily`, "🎯 Daily Study Check-in" / "Time to check your progress! Finish your remaining study tasks today.", `data.url = /home`.
  - **Limit:** at most 10 per-task reminders, newest first, which keeps well under iOS's 64 scheduled-notification limit.
- **Rebuild instead of bookkeeping:** Syllo replaces the old app's AsyncStorage ids and its cancel-then-reschedule-4h dance with one rule. `syncStudyReminders()` cancels every scheduled notification tagged `study-reminder`, then schedules the current set. It runs:
  - when the learner's unfinished work changes (a quiz finished, a lesson completed, an enrollment);
  - when the app returns to the foreground;
  - after sign-in.

  So "24 hours" means 24 hours after the learner was last in the app, and finished work drops out automatically. The old app's "4 hours after continuing" is covered: opening the app restarts the clock.
- **Tapping a reminder:**
  - An `addNotificationResponseReceivedListener`, plus `getLastNotificationResponseAsync()` for a cold start, calls `router.push(data.url)`. It's mounted in `(app)/_layout.tsx`, so it only acts when signed in and onboarded.
  - In the foreground the reminder already shows as the Dynamic Island banner (existing listener). It now gets `onPress` → the same URL.
- **Android channel:** a new `study-reminders` channel ("Study reminders", HIGH importance, vibration `[0, 250, 250, 250]`, light in the accent colour), as in the old app. The unused `reminders` channel id is replaced; Android can't change an existing channel's importance, which is why it's a new id.
- **Settings (user: on/off toggle):**
  - Profile's Settings sheet gets a "Study reminders" row with a `Switch` and the caption "Daily at 6 PM and when you leave something unfinished".
  - The setting is saved on the device with `expo-secure-store` (already installed), key `study-reminders`, default on.
  - **Off** cancels everything tagged `study-reminder`. **On** asks for permission if needed; if permission is blocked, a toast says so with "Open settings".
- **Sign-out:** cancels all study reminders, so nobody else's work shows up on a shared phone.
- **Data:**
  - A new service `getUnfinishedAttempts(supabase)`: `quiz_attempts` where `finished_at is null`, with `quizzes(title)`, newest first.
  - Hook `useUnfinishedAttempts`.
  - In-progress courses come from the existing `useLearningStats` / `useEnrolledCourses` (`progressOf(course) < 1`).
  - No schema change.
- **Web:** everything is a no-op (`Platform.OS === "web"`), as in `local.ts` today.
- **Dev check:** `/design-system`'s Notifications section gets "Test study reminder (10s)", which schedules a one-off tagged reminder for `/home`, so the device test doesn't need a 24-hour wait.

## Out of scope
- A time picker for the daily reminder, push notifications from a server, streak-loss reminders, and reminders for flashcards (Syllo has none).

## Steps
### 1. Notifications library
- **`src/lib/notifications/local.ts`:** the `study-reminders` channel, created in `requestPermission()`.
- **`src/lib/notifications/study-reminders.ts`:**
  - `syncStudyReminders({ quizzes, courses })` and `cancelStudyReminders()`.
  - The schedule respects the preference and the permission.
  - It uses `Notifications.getAllScheduledNotificationsAsync()` to cancel by `data.kind`.
- **`src/lib/notifications/preferences.ts`:** the secure-store preference with `useSyncExternalStore`.
- **Navigation:** the listener's banner gets `onPress` from `data.url`.

### 2. Data
- `getUnfinishedAttempts` in `services/quizzes.ts`, the key `quizzes.unfinished()`, and the hook `use-unfinished-attempts.ts`.
- Starting or finishing a quiz invalidates it (these already invalidate `quizzes.all`).

### 3. Wiring (`src/lib/notifications/use-study-reminders.ts`)
- **`useStudyReminders()`**, mounted in `(app)/_layout.tsx` when onboarded:
  - It builds the lists from the queries and calls `syncStudyReminders` when they change, and on an AppState change to `active`.
  - It installs the tap listener and handles a cold-start tap.
  - Its cleanup cancels the reminders on sign-out.
- **`useAskNotificationsOnce()`** in the Home screen: asks when the status is `undetermined`, then syncs.

### 4. Settings toggle
- The Profile Settings sheet row described in Decisions.

### 5. Design-system test button and docs
- The `/design-system` test button.
- AGENTS.md Notifications bullet: what is scheduled, the `study-reminder` kind, the channel, where the toggle lives.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- **Android dev build (Argent):**
  1. Fresh sign-in → Home: the OS permission dialog appears once. Allow.
  2. Start a quiz and leave it unfinished. On the phone, `adb shell dumpsys notification` lists the scheduled `study-quiz-<id>` and `study-daily`.
  3. Finish the quiz: `study-quiz-<id>` disappears, and `study-daily` stays while a course is in progress.
  4. "Test study reminder (10s)", then leave the app: the system notification arrives, and tapping it opens Home. With the app open it shows as the banner instead.
  5. Settings → Study reminders off: nothing scheduled. On: everything rebuilds.
  6. Sign out: nothing scheduled.

## AGENTS.md updates
- **Notifications:** what is scheduled and when it's rebuilt, the `study-reminder` kind and ids, the `study-reminders` channel, the first-Home-visit permission ask, the Settings toggle (secure-store), the tap → `data.url`, and the dev test button.

## Result
- **New files:** `src/lib/notifications/study-reminders.ts` (sync, cancel, resync, 10s test), `preferences.ts` (switch on expo-secure-store) and `use-study-reminders.ts` (`useStudyReminders`, `StudyReminders`, `useAskNotificationsOnce`).
- **`local.ts`:** the `study-reminders` channel (HIGH, vibration; the old `reminders` channel is deleted), `notificationUrl`, and the foreground banner opening `data.url`.
- **Data:** `getUnfinishedAttempts` + `useUnfinishedAttempts` (key `quizzes.unfinished`); `useStartAttempt` now refreshes it.
- **Wiring:** `StudyReminders` is mounted in `(app)/_layout.tsx` for onboarded learners, and Home asks for permission once.
- **Settings sheet:** the "Study reminders" switch; sign-out cancels the reminders.
- **`/design-system`:** "Test study reminder (10s)".
- **Checks:** `npx tsc --noEmit` and `npx expo lint` pass.
- **Device test (Samsung SM-S942B, Android dev build):**
  - The first Home visit showed Android's notification prompt once. It wasn't asked again after signing out and back in.
  - No unfinished work → 0 alarms. Enrolled course → the 18:00 daily alarm plus one 24h later.
  - The 10s test posted on channel `study-reminders`. Tapping it opened Syllo at Home.
  - The Settings switch off → 0 alarms; on → both rebuilt.
  - Sign-out → 0 alarms; signing in rebuilt them.
- **Android timing:** alarms are inexact (Android's delivery window is up to 1 hour), so a reminder can arrive up to an hour late.
- **Not verified:** iOS (no Mac). A quiz reminder firing for real, since that needs 24 hours.
