# Syllo

**Study & Exam Prep.** Syllo is a full-stack learning app built with Expo and React Native. Learners browse courses, enroll, watch video lessons chapter by chapter, download lesson files, take timed quizzes, rate courses and follow tutors. It also handles study reminders and a Premium subscription.

It started from notJust.dev's [Full-stack LMS App](https://notjust.notion.site/Full-stack-LMS-App-32cb0ec93c5a801c9e91d5e3d6674d41) tutorial. Part 1 (the learner side) is built; Part 2 (tutors creating courses) is next. The tutorial's stack has been swapped for Clerk, Supabase, TanStack Query, twrnc, RevenueCat and Cloudflare R2. The UI follows a Screensdesign prototype, inverted to a dark theme.

> **For contributors and AI agents:** [`AGENTS.md`](AGENTS.md) is the project's memory. It holds every decision that is still true and the rules for changing code. Each feature has a plan in [`prompts/`](prompts/). Read both before changing anything.

---

## What learners can do

| Area | What it does |
|---|---|
| **Sign up / sign in** | Email + password with a 6-digit email code, plus Google and Apple sign-in (Clerk). Sessions persist on the device. |
| **Onboarding** | Goal → interests (at least 3) → insight → testimonials → paywall. Home then recommends courses in the learner's interests first. |
| **Home** | The course in progress with a progress bar, "Resume Lesson", recommendations, and a streak, certificates and lessons-done tiles (all from real progress). Study-reminder permission is asked on the first visit. |
| **Explore** | Search plus category chips, and a **Filters** sheet: sort (A–Z, Newest, Shortest, Longest), categories, level and duration, with a live "Show N courses" count. Cards show the rating ("New" until rated), level, length and "Free" / "Included in Premium". |
| **Course details** | Cover, rating and review count, length, lesson count, description, the tutor with a working **Follow**, and the curriculum (chapters → lessons and quizzes, with preview and lock states). Enrolled learners can **rate the course** (1–5 stars + comment). A native toolbar has **Share** (summary + `syllo://course/<id>` link). Premium courses need Pro: the footer offers "Unlock with Premium". |
| **Lesson player** | The video (signed link from private storage), lesson notes in Markdown with a credit line, **Resources** (downloadable PDFs/diagrams), and a native bottom toolbar: previous, mark completed, next or finish. |
| **Quizzes** | 10 / 20 / all random questions, an optional 15 s timer per question, flags, results with points, and a review screen. Graded only by the database. Free learners get 3 quiz starts per 24 hours; Pro is unlimited. Includes **Pharmacy Exam Prep**: 17 topics, 2,451 questions. |
| **Premium** | A RevenueCat subscription (monthly or annual) unlocks premium courses and unlimited quizzes. The paywall uses the design's screen with live prices. |
| **Study reminders** | Local notifications: a 24 h nudge per unfinished quiz or course, plus a daily 18:00 check-in. Tapping one opens the right screen. There's an on/off switch in Settings. |
| **Profile** | Photo, names, password, signed-in devices, sign out, and account deletion (removes the learner's data, then the Clerk user). |

---

## Tech stack

| Concern | Choice |
|---|---|
| App | **Expo SDK 58** (React Native 0.88, React 19.3, React Compiler, typed routes), **Expo Router** (file-based routes, `Stack.Protected` guards, native `Stack.Toolbar`) |
| Styling | **twrnc** only (Tailwind classes at runtime); tokens in `tailwind.config.js`; dark theme only; `lucide-react-native` icons, plus SF Symbols / `@expo/material-symbols` in native toolbars |
| Auth | **Clerk** (`@clerk/expo`): custom screens, email codes, Google/Apple SSO |
| Data | **Supabase** Postgres with Row Level Security on every table; Clerk is a third-party auth provider, so RLS reads the Clerk user id from the JWT |
| Data fetching | **TanStack Query v5**: services → hooks → screens (enforced by ESLint) |
| Media | **Cloudflare R2** (private bucket) for lesson videos and resource files, served as 1-hour signed links by Supabase Edge Functions |
| Payments | **RevenueCat** (`react-native-purchases`, pinned to 10.16.0), with a webhook + Edge Function mirroring Pro status into the database |
| Video | `expo-video` with the design's own controls |
| Notifications | `expo-notifications` (local only) + a Dynamic Island-style in-app banner (Skia, Reanimated, Gesture Handler) |
| Device automation | **Argent** MCP for driving the Android dev build during QA |

---

## Architecture

```
┌──────────────── Expo app (src/) ─────────────────┐
│ src/app/*        routes (thin)                   │
│ src/screens/*    screens + screen-only components│
│ src/components/ui shared design-system components│
│ src/lib/queries  TanStack Query hooks (cache)    │
│ src/services     the ONLY code that talks to     │
│                  Supabase / RevenueCat           │
└───────┬──────────────────────┬───────────────────┘
        │ Clerk session JWT    │ RevenueCat SDK
        ▼                      ▼
┌─ Supabase ─────────────────────────┐   ┌─ RevenueCat ─┐
│ Postgres + RLS (Clerk `sub`)       │◀──│ webhook       │
│ Edge Functions:                    │   └───────────────┘
│  • premium-sync   → Pro status     │
│  • lesson-video   → signed R2 link │──▶ ┌─ Cloudflare R2 ─────────┐
│  • lesson-resource→ signed download│    │ syllo-lesson-videos     │
└────────────────────────────────────┘    │ clips/*.mp4, resources/*│
                                          └─────────────────────────┘
```

**Rules that keep it safe:**
- **Access is decided in the database.** RLS policies and `SECURITY DEFINER` helpers in a `private` schema decide who sees what:
  - `private.can_open_lesson`: a preview, or enrolled (+ Pro for premium courses).
  - `private.can_use_quiz`, `private.is_premium`.
  - Quizzes are graded by RPCs; learners can never read `quiz_answers.is_correct`.
- **Edge Functions act as the learner.** They query with the learner's own token, so RLS applies to them too.
- **No secret reaches the app bundle.** Only publishable keys use `EXPO_PUBLIC_`. The R2 keys, the RevenueCat secret and the Clerk secret live in Supabase secrets or a local `.env.local` used by scripts.

---

## Data model (Supabase)

| Table | Purpose |
|---|---|
| `profiles` | One per learner (`id` = Clerk user id). Its existence means "onboarded"; it holds the goal and interests. |
| `tutors` | Course creators (linked to a Clerk user for Part 2). |
| `courses` → `chapters` → `lessons` | The public outline, ordered by `position`. `courses.access` is `free` or `premium`; `rating_average` and `rating_count` are kept by a trigger. |
| `lesson_contents` | The video (`video_key` in R2, or an outside `video_url`) and the Markdown notes. Hidden unless the learner can open the lesson. |
| `lesson_resources` | Downloadable files per lesson (name, size, type, R2 key, credit). |
| `enrollments` | Learner ↔ course. Premium courses need Pro. |
| `lesson_progress` | Completed lessons; drives progress, the streak and certificates. |
| `course_reviews` | One 1–5 rating + comment per enrolled learner per course. |
| `tutor_follows` | Learner ↔ tutor. |
| `quizzes`, `quiz_questions`, `quiz_answers` | Quizzes per chapter. |
| `quiz_attempts`, `quiz_attempt_questions`, `quiz_attempt_answers`, `question_flags` | Attempts, graded by RPCs (`start_quiz_attempt`, `answer_quiz_question`, `finish_quiz_attempt`). |
| `premium_entitlements` | Pro status, written only by `premium-sync`. |

The full schema lives in [`supabase/migrations/`](supabase/migrations/). Seeds:
- `supabase/seed.sql`: 3 tutors, 6 sample courses, 19 chapters, 58 lessons.
- `supabase/seeds/exam-prep.sql`: Pharmacy Exam Prep, generated.
- `supabase/seeds/lesson-videos.sql`: R2 clips, credits and resource files, generated.

---

## Lesson content and credits

Every lesson video and resource file is **openly licensed** (CC0, CC BY, CC BY-SA or public domain) and comes from **Wikimedia Commons**.
- **Videos:** 15 chapters (46 lessons) have one talk or tutorial each, trimmed to at most 10 minutes. Among them are Charles Severance's *Python for Everybody*, Lea Verou's "The Chroma Zone" and Chrome for Developers' CSS Podcast.
- **Resource files:** 11 files, such as *A Byte of Python*, the *Non-Programmer's Tutorial for Python 3*, CSS grid and easing diagrams, and box-plot charts.

Each lesson's notes and resource cards credit the author and licence. The source list is [`supabase/seeds/source/lesson-videos.json`](supabase/seeds/source/lesson-videos.json). Four chapters (Gestures, Components, Running the system, Making decisions) still use placeholder clips from public test-video hosts.

---

## Project layout

```
src/
  app/                 Expo Router routes: (auth)/, (app)/ with (tabs)/, course/, lesson/, quiz/, attempt/, premium
  screens/<screen>/    screen components and screen-only pieces
  components/ui/       AppText, Button, IconButton, Sheet, Chip, Badge, Card, TextField, toast, …
  lib/                 helpers (course outline, ratings, formatting, sharing, notifications, onboarding, purchases)
  lib/queries/<area>/  one TanStack Query hook per file + keys.ts
  services/            Supabase/RevenueCat access (plain async functions)
  theme/               twrnc instance + tokens helpers
supabase/
  migrations/          schema, RLS, functions
  functions/           premium-sync, lesson-video, lesson-resource (+ _shared/)
  seed.sql, seeds/     sample data (some generated)
scripts/               brand assets, exam-prep seed, lesson media upload, R2 token helper
prompts/               one plan per feature (history), TEMPLATE.md
assets/                bundled images, brand SVGs
```

---

## Getting started

### Prerequisites
- Node.js 22+ and npm.
- An Android device or emulator with the **development build** installed (`npx expo run:android`, or an EAS `development` build). Expo Go lacks some native modules used here. The dev machine is Windows, so iOS is built with EAS.
- Accounts for Clerk, Supabase, RevenueCat and Cloudflare R2 (only to run your own backend).

### Setup
```bash
npm install
cp .env.example .env.local   # fill in the values (names only are committed)
npx expo start --dev-client  # then open the app on the device
```

`.env.local` needs:
- **App, publishable keys only:** `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY`.
- **Scripts only, never `EXPO_PUBLIC_`:** `CLERK_SECRET_KEY`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`.

Supabase secrets for the Edge Functions are `REVENUECAT_SECRET_API_KEY` and the four `R2_*` values.

### Commands
```bash
npx expo start --dev-client     # dev server for the development build
npx expo lint                   # lint (also enforces the data-fetching layers and design tokens)
npx tsc --noEmit                # type check
npx supabase migration new <n>  # new schema change
npm run db:push                 # apply migrations + seeds to the linked project
npm run db:types                # regenerate src/lib/database.types.ts
npx supabase functions deploy premium-sync lesson-video lesson-resource
npm run upload:lesson-videos    # lesson clips + resource files → R2, regenerates seeds/lesson-videos.sql
node scripts/set-r2-token.mjs   # (own terminal) R2 token → S3 keys in .env.local + Supabase secrets
npm run generate:app-icon && npm run generate:android-icon && npm run generate:splash
npx eas-cli@latest build --profile development   # EAS builds (Android dev builds compile arm64 only)
```

---

## How features are built

1. **Understand** the code and the current docs.
2. **Ask** about real decisions.
3. **Plan** in `prompts/NN-*.md`.
4. **Wait for approval.**
5. **Build** step by step.
6. **Verify** with lint, the type check, Supabase advisors, and device checks with Argent.
7. **Close out** in `AGENTS.md`.

The full rules are in [`AGENTS.md`](AGENTS.md) under "How we build features", "Rules" and "Checks".

## History

| Plan | Feature | Status |
|---|---|---|
| 01 | Design system: twrnc tokens, shared components | done |
| 02 | Clerk auth: email/password, Google, Apple, sessions | done |
| 03 | Profile: photo, names, password, devices, delete account | done |
| 04 | Supabase: project, Clerk integration, tables, RLS, seed | done |
| 05 | Quizzes, attempts and the Pharmacy Exam Prep course | done |
| 06 | TanStack Query for all data | done |
| 07 | Dashboard, Explore, onboarding and paywall (RevenueCat) | done |
| 08 | Course details and lesson player | done |
| 09 | Quiz player | done |
| 10 | App icon, splash screen, dark theme | done |
| 11 | Onboarding after sign-in (profile-row gate) | done |
| 12 | Study reminders (local notifications) | done |
| 13 | Explore filters | done |
| 14 | Share a course from the native toolbar | done |
| 15 | Real lesson videos on Cloudflare R2 | done |
| 16 | Ratings, tutor follows, lesson resources, Free/Premium access | done (device walk-through pending) |

Other recent changes:
- The lesson player's footer became a compact native bottom toolbar.
- Sheets got more space above the navigation bar.
- Seed videos moved off a dead Google bucket.

## What's next
- **Part 2 (tutors):** create and publish courses, upload videos and resources from the app.
- **My Courses tab:** still an empty state.
- **Production setup:** a Clerk production instance, App Store / Play apps in RevenueCat, and an https web build (for share links and the marketing and support pages).
- **iOS device testing:** needs a Mac or TestFlight.
