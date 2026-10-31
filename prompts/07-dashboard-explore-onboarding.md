# 07 · Dashboard, Explore, onboarding and paywall

Status: done (visual check pending)

## Goal
A signed-out visitor goes **Welcome → Goal → Interests → Insight → Testimonials → Paywall → Sign up → Home**, matching the prototype screen for screen, with real subscription plans from RevenueCat. Signed-in learners land on the designed **Home** dashboard and **Explore** feed, built from real Supabase courses.

## Decisions
- **Flow (user):** onboarding is for signed-out visitors. Welcome's "Get Started" starts it; "Log In" opens `/sign-in` and skips it. The paywall's "Subscribe Now" (after a purchase) and its close button both continue to `/sign-up`. After email verification the guard opens `(app)` and `/home`. Signed-in learners never see onboarding. `/` redirects signed-out visitors to `/welcome` (it was `/sign-in`).
- **Step counter:** as in the design, Goal 1/6, Interests 2/6, Insight 3/6, Testimonials 4/6. The paywall has no header, and sign-up is the implied 6.
- **Answers:** Goal is single choice and Interests needs at least 3 ("Pick at least 3 topics"). Continue stays disabled until the step is valid; the design shows a selected state but no default, so nothing starts selected. Answers are kept in memory in a small module store (`src/lib/onboarding/store.ts`, `useSyncExternalStore`, no dependency). After sign-up they're saved once to the learner's Supabase `profiles` row, then cleared.
- **Profile fields (user):** a migration adds `profiles.onboarding_goal` (text, check in `career_advancement | switch_career | personal_growth | certifications`), `profiles.interests` (text[], default `{}`, each in `design | development | marketing | business | data | photography`) and `profiles.onboarding_completed_at` (timestamptz). The existing own-row RLS policies cover them. Saved with `saveOnboarding(supabase, userId, answers)` in `services/profiles.ts` (an upsert on `id`, so it works even before `useSyncProfile` has created the row) behind `useSaveOnboarding`; read back with `getMyProfile` / `useMyProfile`.
- **Recommended for you:** published courses whose category matches an interest come first. Interest ids map to course categories: design → Design, development → Development, data → Data, business → Business, marketing → Marketing, photography → Photography.
- **Missing data (user: placeholders):** progress (65%, 12/18), streak 5, Certificates 12, Lessons Done 48 and ratings 4.8/4.9 are fixed sample values in one file, `src/screens/home/placeholder-stats.ts`, marked `// PLACEHOLDER until lesson progress exists`. Course titles, tutors, covers, categories, lesson counts and durations are real.
- **Prices on Explore:** access is by subscription, so the price slot shows **"Included in Premium"** in the same `text-18 font-bold text-ink` style. Change this if you'd rather show something else.
- **RevenueCat (user):**
  - A new RevenueCat project **"Syllo"**, created through the MCP. It uses the Test Store app for now; App Store and Play apps come after store setup.
  - Products `syllo_premium_monthly` (**£5.99/month**: all standard courses, unlimited quizzes, offline downloads, certificates and awards) and `syllo_premium_annual` (**£49.99/year**: everything in Pro Monthly at a lower effective monthly price). Signing up stays free (user, mid-build change).
  - Entitlement `premium`.
  - Offering `default` with the packages `$rc_annual` and `$rc_monthly`.
- **Paywall (user: custom screen from the design):**
  - Plans and prices come from `Purchases.getOfferings()`.
  - "£49.99/year (Only £4.17/mo)" and "£5.99/mo" are built from the package prices.
  - The "40% OFF" label is calculated as annual against monthly × 12, so with these prices it reads **30% OFF**. Change the prices to change it.
  - Annual is selected by default ("Best Value"), and tapping a card selects it.
  - "Restore purchases." in the footer is a tappable link.
- **SDK:** `react-native-purchases`, configured once in the root layout with the public key. It works in Expo Go in RevenueCat's **Preview API Mode** (mock APIs, no real purchases). Real Test Store purchases need a development build.
- **Web:** web can't make native purchases, so the paywall skips `getOfferings` there. It shows an info line, "Subscriptions are available in the iOS and Android app.", in place of the plan cards, and "Subscribe Now" continues to sign-up.
- **Identity:** a `PurchasesIdentity` component in the root layout calls `Purchases.logIn(clerkUserId)` on sign-in, which carries an anonymous pre-sign-up purchase over to the account. It calls `Purchases.logOut()` on sign-out, skipped when the user is anonymous.
- **Layering:**
  - `src/services/purchases.ts` holds plain functions: `getCurrentOffering`, `purchasePackage`, `restorePurchases`, `getCustomerInfo`.
  - Hooks live in `src/lib/queries/purchases/`: `useOffering`, `usePurchasePackage`, `useRestorePurchases`, `usePremium`.
  - These services take no Supabase client.
  - A cancelled purchase is not an error: no toast, and the learner stays on the screen.
- **Env:**
  - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` and `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` are public SDK keys, safe in the bundle. Both hold the Test Store key for now.
  - The values go in `.env.local`, which is git-ignored, and the names go in `.env.example`.
  - `clerk env pull` may rewrite `.env.local`, so the plan's Result will note to re-add them if that happens.
- **Images:** the 8 prototype images are downloaded from `media.screensdesign.com` into `assets/images/onboarding/` and shown with `expo-image`, which is already installed:
  - `welcome-hero.png` and `avatar-1…3.png` (Welcome)
  - `insight.png` (Insight)
  - `testimonial-1…2.png` (Testimonials)
  - `paywall-hero.png` (Paywall)

  The dashboard avatar is the learner's Clerk photo, or the initial `Avatar`.
- **Not built yet:** the course details and lesson player screens (plan 08). Course taps, "Resume Lesson" and "View Details" show `toast.info("Coming soon", "Course pages arrive in the next update.")`. The bell and filter buttons show the same toast.
- **Explore search:** a server-side `ilike` on the title, debounced 300 ms, together with the category chip.
  - Chips: "All Courses", then the distinct categories from Supabase.
  - Header text: `Found {n} results for "{query}"`. With no query and a category chip selected, the category name replaces the query. With neither, it reads `Found {n} results`.
  - Pull to refresh.
- **Greeting:** "Good morning," / "Good afternoon," / "Good evening," by the device clock (before 12 / before 18 / later), followed by the learner's full name from Clerk.
- **Hero card:** shows the learner's most recent enrollment. With no enrollment it shows the first recommended course with a "Start Learning" badge and button, and the button opens the same toast.
- **Temporary Home/Explore pieces removed:** the course count and test banner button on Home, and the trash/delete list on Explore. `useDeleteCourse` stays for Part 2. The test banner button moves to `/design-system`.

## Out of scope
- Course details, the lesson player, enrolling, and real lesson progress, streak and certificates (plan 08 and later).
- Gating content on `premium`: the `usePremium` hook exists but nothing uses it yet.
- App Store Connect / Play Console products, a production RevenueCat setup, and RevenueCat Customer Center.
- The Explore filter sheet.

## Steps
### 1. Routes and onboarding store
- Add `src/app/(auth)/welcome.tsx`, `onboarding/goal.tsx`, `onboarding/interests.tsx`, `onboarding/insight.tsx`, `onboarding/testimonials.tsx` and `paywall.tsx`. Each is a thin route rendering a screen from `src/screens/onboarding/`.
- `(auth)/_layout.tsx` lists them in order, with the stack's slide animation.
- `src/app/index.tsx` redirects signed-out visitors to `/welcome`.
- Add `src/lib/onboarding/store.ts`, holding the goal, interests, setters and `reset`.
- Done when typed routes regenerate and `tsc` passes.

### 2. Shared onboarding pieces (`src/screens/onboarding/`)
- **`onboarding-header.tsx`:** the `IconButton` outline back button (`ChevronLeft`); a `ProgressBar sm` (`h-1.5`) in `flex-1 mx-8`; and `text-13 font-semibold text-muted w-10 text-right` showing `n/6`. It uses `px-screen pt-12 pb-6` plus the top safe area. The Insight variant uses `track` → `border` (gray-200) and a white back button.
- **`option-card.tsx`:** the Goal row: `p-5 border rounded-2xl`, a 48 `rounded-xl bg-primary-tint` icon tile with a 24 primary icon, `option` title + `callout` muted text, and a `CircleCheck` 24 primary icon when selected. The prototype's selected `.option-card.active` style isn't in the HTML, so the selected state is estimated as `border-2 border-primary bg-primary-tint`, matching the interest cards.
- **`interest-card.tsx`:** selected is `border-2 border-primary bg-primary-tint` with a primary icon; unselected is `border border-border` with a muted icon. Both have `p-4 rounded-2xl gap-3`, a 24 icon, the label in `text-16 font-semibold text-ink`, and `pressScale 0.95`.
- New primitives go into `/design-system`.

### 3. Welcome, Goal, Interests, Insight, Testimonials
Each is translated class by class from its HTML (the prototype folder in AGENTS.md):
- **Welcome** (`canvas` background):
  - 480-tall hero image with a `linear-gradient(to top, canvas, transparent)` overlay, using `backgroundImage`.
  - Content `px-8 -mt-20`. A pill (`bg-surface border rounded-full px-3 py-1.5 shadow-card`) holds 3 overlapping avatars (24, `border-2 border-surface`, `-ml-2`), "Join 500k+ learners" in `text-13 font-medium`, and a divider plus a star and "4.9".
  - `display` heading "Master new skills at your own pace." (34, tight, `tracking-tight`, `mb-4`) and a `lead` paragraph.
  - `StickyFooter tone="canvas"` with a primary "Get Started" button and "Already have an account? **Log In**" (13, muted, link primary semibold).
- **Goal** (white background):
  - Title "What's your primary goal?" (`title-xl`, `mb-3`) and subtitle "We'll customize your course recommendations based on your choice."
  - 4 option cards, `gap-4`: Briefcase "Career Advancement" / "Get promoted or learn new job skills"; GraduationCap "Switch Career Path" / "Start from zero in a new industry"; Palette "Personal Growth" / "Explore hobbies and creative interests"; Award "Certifications" / "Earn industry-recognized credentials".
  - White `StickyFooter` with "Continue".
- **Interests:**
  - "Choose your interests" and "Pick at least 3 topics to help us personalize your learning path."
  - A 2-column grid, `gap-3`: PenTool "UI/UX Design", Code "Development", Megaphone "Marketing", TrendingUp "Business", Database "Data Science", Camera "Photography".
  - "Continue".
- **Insight** (`canvas` background, centered, `px-8`):
  - 256 illustration (`mt-12 mb-10`, contain).
  - Badge "Did you know?" (`bg-primary-soft text-primary rounded-full px-4 py-1.5 text-13 font-bold tracking-wide uppercase mb-6`).
  - `insight` heading "Structured learning increases retention by 40%." and a `lead` paragraph "Students who follow a guided curriculum are twice as likely to finish their courses and apply their new skills effectively."
  - Canvas footer with "Continue journey".
- **Testimonials:**
  - "Loved by thousands" and "Hear from real students who transformed their careers with us."
  - 2 cards (`p-6 border rounded-2xl bg-surface`; the first has `shadow-card`), each with 5 `star` stars, a quote (`text-16 text-ink italic leading-relaxed mb-4`), a 40 avatar, the name (`text-14 font-bold`) and the role (`footnote` muted).
  - Copy exactly as in the HTML (Sarah Jenkins / Junior Product Designer; Marcus Zhao / Data Analyst).
  - "Next".
- Back buttons call `router.back()`. Continue pushes the next route.
- Done when each screen matches its HTML at 393×852 on web.

### 4. RevenueCat dashboard and SDK
- **Dashboard (MCP):** create the project "Syllo" and read its Test Store app; create the 2 products with prices, the `premium` entitlement with both attached, and the `default` offering with `$rc_annual` and `$rc_monthly`. Read the Test Store public key.
- **Install and keys:** `npx expo install react-native-purchases`. Put the env names in `.env.example` and the values in `.env.local`.
- **Configure:** `src/lib/purchases/configure.ts` calls `Purchases.configure({ apiKey })` once, on native only (debug logs in `__DEV__`). Call it from the root layout, with `PurchasesIdentity` beside `QueryCacheReset`.
- **Services and hooks:** `src/services/purchases.ts` and `src/lib/queries/purchases/*`, with the key `queryKeys.purchases.offering()` and `customerInfo()`. A purchase or restore invalidates `customerInfo`.
- Before writing: read the installed package's types (`node_modules/react-native-purchases/dist/`), and the RevenueCat skills `revenuecat-purchase-flow` and `revenuecat-identify-user`.
- Done when `tsc` and lint pass.

### 5. Paywall screen
Translated from `premium_paywall.html`:
- **Hero:** 240-tall image with a `to top, surface → transparent` gradient, and an `IconButton close` (32, `glass-soft`, top 48 + safe area, right 24) that continues to `/sign-up`.
- **Content:** `px-screen -mt-6`.
  - Sale badge: `bg-danger-tint border-danger-line rounded-lg px-3 py-1.5 mx-auto mb-6`, a Clock icon in `danger`, and "SPRING SALE: 40% OFF ends in 12:45" in `text-13 font-bold text-danger-deep`.
  - Title "Unlock your potential" (`title-xl`, centered, `mb-8`).
  - 3 feature rows: a 24 `bg-primary-soft` round check, then `text-16 font-medium text-ink`: the user's Pro features: "All standard courses", "Unlimited quizzes", "Offline downloads", "Certificates and awards" (replacing the prototype's three rows).
  - Plan cards, `gap-3`. The selected card is `p-4 border-2 border-primary bg-primary-tint rounded-2xl`, with the "Best Value" pill (`-top-3 right-4 bg-primary text-on-primary badge rounded-full px-3 py-1`). The other card is `border border-border`. Titles "Annual Access" / "Monthly Plan" in `text-17 font-bold`; subtitles in `caption` muted ("…/year (Only …/mo)" / "Cancel anytime"); right side `text-18 font-bold`, the savings label in primary or the monthly price in ink.
- **Footer:** white `StickyFooter` with "Subscribe Now" (loading while purchasing) and "Secure payment. No hidden fees. Restore purchases." (`footnote` muted, centered, `px-4`; "Restore purchases." is a link).
- **States:**
  - Loading the offering: the cards show a spinner.
  - Error: one line, "Couldn't load plans.", with "Try again".
  - Web: the info line described in Decisions.
- **Outcomes:**
  - A successful purchase shows `toast.success("You're Premium!")` and goes to `/sign-up`.
  - Restore shows a success or info toast.
  - Cancelling does nothing.
  - Other errors show `toast.error`.
- Done when, in Expo Go, the screen renders the preview-mode packages and Subscribe moves on.

### 6. Profile fields and saving answers after sign-up
- `npx supabase migration new profiles_onboarding` with the three columns, then `npm run db:push`, `npm run db:types`, and the security and performance advisors (no new warnings).
- `saveOnboarding` / `getMyProfile` in `services/profiles.ts`; `useSaveOnboarding` / `useMyProfile` in `queries/profiles/` (key `queryKeys.profiles.me()`).
- `useSaveOnboardingAnswers()`, mounted in `(app)/_layout.tsx`: when the store has answers and a user is signed in, it saves them once, then `reset()`. A failure keeps the answers and shows no toast (retried on the next launch of the layout).
- Home reads `useMyProfile().data?.interests` for Recommended.

### 7. Home dashboard (`src/screens/home/`)
Translated from `learning_dashboard.html` (`canvas` background):
- **Top bar:** sticky, `Glass` with the `glass-soft` fill, `px-screen pt-14 pb-4` (using the safe area instead of 56 where larger), `border-b`.
  - `Avatar sm bordered`, the greeting (`footnote font-medium muted`) and the name (`text-16 font-bold`).
  - Streak pill (`bg-streak-tint border-streak-line rounded-full px-3 py-1.5`, Flame `streak` 18, "5" in `text-14 font-bold text-streak-deep`) and the bell `IconButton outline`.
- **Hero card:** `mx-screen mt-6`, `Card radius="card" shadow`, `p-5`.
  - Badge "In Progress" (`primary-tint`/primary, `badge`, `rounded-md px-2.5 py-1`, `mb-4`).
  - Title in `title`, `mb-2`.
  - "by {tutor} • 12/{lessons} Lessons" in `callout` muted, `mb-5` (the 12 is a placeholder).
  - "Course Progress" / "65%" (13, semibold ink / bold primary) over `ProgressBar md` (h-2), `mb-6`.
  - A "Resume Lesson" button with `CirclePlay`. It is `py-3.5 rounded-xl font-bold`, which is the `primary-bold` variant.
- **Recommended for you:** "Recommended for you" (`heading`) with a "See All" link (`text-14 font-semibold text-primary`) to `/explore`. Then a horizontal `FlatList` (`gap-4 px-screen pb-4`, no indicator) of 240-wide cards: `bg-surface border rounded-2xl`, a 140 cover, a rating glass badge (`Badge rating`, top-3 right-3), and `p-4` with the title (`card-title`, 2 lines, `mb-2`) and a Clock 14 + "{h}h total" in `footnote` muted.
- **Stats:** 2 columns, `gap-4`, `mt-8`: Award `info` 24 / "12" / "Certificates"; CircleCheck `success` 24 / "48" / "Lessons Done". Each is `p-4 border rounded-2xl shadow-card bg-surface`, number `title` (20 bold), label `footnote` muted.
- **States:** loading skeleton cards; an error card with "Try again"; no courses shows "No courses yet" under the header.
- **Data:** `useCourseFeed`, `useLatestEnrollment` and the interests.

### 8. Explore feed (`src/screens/explore/`)
Translated from `course_search_feed.html` (white background):
- **Header:** sticky `Glass` (`glass`, white/90), `px-screen pt-14 pb-4 border-b`, holding `SearchField` ("Search for any course...") and the `IconButton filter`.
- **Chips:** horizontal `Chip`s (`px-screen py-4 gap-2`).
- **Results line:** `callout font-medium` muted, `px-screen mb-4`.
- **Feed:** `FlatList`, `px-screen`, 24 gap. From the second item on, each has `pt-6 border-t border-track`.
  - Cover: 180 tall, `rounded-2xl border mb-3`.
  - Title row: title `text-18 font-bold leading-snug flex-1 mr-4`, and a rating chip (`bg-primary-tint rounded-md px-2 py-0.5`, Star `star-deep` 12, `text-12 font-bold text-primary`).
  - Meta line: User + tutor, Clock + "{h}h {m}m", in `caption` muted with `gap-3`.
  - `mt-3` row: "Included in Premium" on the left and a "View Details" link (`text-13 font-bold text-primary`) on the right.
  - Item press is `pressScale 0.98`.
- **States:** loading, error with "Try again", and the empty state "No courses match your search.".
- **Services:** in `src/services/courses.ts`, `getCourseFeed(supabase, { search, category }, signal)` selects `id, title, cover_image_url, category, tutors(name), chapters(lessons(duration_seconds))` and returns `lessonCount` and `durationSeconds`. Also add `getCategories` and `getLatestEnrollment`.
- **Hooks:** `useCourseFeed`, `useCategories`, `useLatestEnrollment`, with keys under `courses` and `enrollments`.
- Remove `getCourses`/`useCourses`/`countCourses`/`useCourseCount` if nothing uses them.

### 9. Close out
- Download the 8 images.
- Update `/design-system`: option card, interest card, onboarding header, and the moved banner test button.
- Update `AGENTS.md`: routes, flow, RevenueCat, temporary-screen notes.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- Web at 393×852 (Chrome, `http://127.0.0.1:8081`): `/welcome`, every onboarding step, `/paywall`, `/home` and `/explore` side by side with their HTML. List every difference and fix it.
- **Flow:** signed out, open the app → Welcome → Get Started → pick a goal (Continue enabled only then) → 3 interests (enabled at 3) → Insight → Testimonials → Paywall → close or Subscribe → sign up → verify → Home. The learner's `profiles` row has the goal, interests and `onboarding_completed_at` (check with the Supabase MCP), and Recommended lists matching categories first.
- Welcome → Log In → sign-in → Home (no onboarding). Sign out → back at Welcome.
- **Paywall:**
  - Expo Go: preview packages render; Subscribe completes in preview mode; Restore shows a toast.
  - Web: the info line.
  - Development build (if available): a Test Store purchase activates `premium` (check the customer with the RevenueCat MCP).
- **Explore:** typing filters after the debounce, chips filter, the results line updates, pull to refresh works, and an impossible search shows the empty state. Turn the network off and the error state with "Try again" appears.
- **Home:** the greeting changes with the time, the hero shows an enrollment or the fallback, and See All opens Explore.
- **Expo Go on the phone** (user): the full flow above.

## AGENTS.md updates
- **Expo/Routes:**
  - The `(auth)` group now holds welcome, onboarding/goal, interests, insight, testimonials, paywall, sign-in, sign-up and verify-email.
  - `/` sends signed-out visitors to `/welcome`.
  - The flow order is the one above.
  - Replace the "Temporary screens" note: Home and Explore are built from the design; My Courses is still an empty state.
- **Who owns what:** a new **Payments** entry: RevenueCat project "Syllo" (Test Store for now), entitlement `premium`, offering `default`, `react-native-purchases` (Preview API Mode in Expo Go), `PurchasesIdentity` login/logout, the services/hooks layer, and the public `EXPO_PUBLIC_REVENUECAT_*` keys.
- **Data model:** profiles gain `onboarding_goal`, `interests`, `onboarding_completed_at`, saved after sign-up. Note the `placeholder-stats.ts` placeholder values.
- **Design system:** next plans: Course details + Lesson player. Onboarding and paywall are done.

## Result
- **Flow:** built as planned: Welcome → Goal → Interests → Insight → Testimonials → Paywall → Sign up (free) → Home. `/` sends signed-out visitors to `/welcome`.
- **Profiles:** migration `20261031081915_profiles_onboarding` adds `onboarding_goal`, `interests` and `onboarding_completed_at` (user's request at approval). Answers are saved after sign-up by `useSaveOnboardingAnswers`. Advisors: no security findings; performance shows only the earlier "unused index" INFO notices.
- **RevenueCat:** project Syllo `proj863ed6c7` with its Test Store app `app254576c43c`:
  - Products `syllo_premium_monthly` (£5.99) and `syllo_premium_annual` (£49.99). The user changed the prices mid-build from the plan's $19.99/$99.99, and the paywall's feature rows became the user's Pro list.
  - Entitlement `premium`; offering `default` (current) with `$rc_annual` / `$rc_monthly`.
  - The Test Store public key is in `.env.local`, so re-add it if `clerk env pull` rewrites that file.
  - Annual shows **30% OFF** (calculated). The sale badge uses the same number.
- **Shared pieces:** new `Fade` and `useTopPadding` in `components/ui`; `coming-soon.ts` and `format-duration.ts` in `lib`.
- **Removed:** `useCourses`, `useCourseCount`, `getCourses`, `countCourses` and Explore's delete list. `useDeleteCourse` stays.
- **Estimated values (not in the HTML):**
  - The goal card's selected state (2px primary border on primary-tint, padding 19).
  - The plan cards switch styles with the selection (the HTML only shows annual selected).
  - Testimonial stars at 18 (iconify default ~16).
  - Top padding: the design's 48/56, or the safe area + 8 when taller.
  - The hero card's no-enrollment variant ("Start Learning", 0%).
  - "Good afternoon/evening".
  - The error, empty and loading states.
- **Images:** 8 images downloaded into `assets/images/onboarding/`. The avatars and portraits were downscaled to 192 px and the insight art to 768 px; the two heroes stay 1024 px.
- **Not verified:**
  - The web comparison at 393×852: the Chrome extension isn't connected.
  - Both a web dev server and `expo export --platform android` ran out of memory on this PC.
  - The Expo Go run and a Test Store purchase in a development build.
