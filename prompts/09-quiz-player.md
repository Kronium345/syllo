# 09 · Quiz player

Status: done (visual and device checks pending)

## Goal
From a course's curriculum, a learner opens a chapter quiz and picks 10, 20 or all questions, with an optional 15-second timer. They answer shuffled questions with instant right/wrong feedback and the explanation, flag questions to review, and finish with a results screen (score, points, correct/wrong/skipped), a review of their answers, and Retake. Free learners get 3 quiz sessions per rolling 24 hours, checked by the database; Pro learners have no limit.

## Decisions
- **Design (user: the prototype's style):** there's no quiz screen in the prototype, so the screens are built from the existing tokens and components, and every value is estimated and listed in the Result. They reuse the onboarding header (progress, `n/N`), the option-card look for answers, `StickyFooter`, `Card`, `Badge` and `Chip`.
- **Length (user: 10 / 20 / All):**
  - The start screen offers those three; options at or above the topic's question count are hidden, and "All {n}" is always shown.
  - The server picks the questions at random. A migration adds `quiz_attempt_questions (attempt_id, question_id, position)`, and `total_questions` becomes the chosen number, so scores count only those questions.
  - Answer order is shuffled in the app, seeded by attempt + question id, so the review shows the same order.
- **Timer (user: optional 15s):**
  - A switch on the start screen, off by default, saved per attempt (`quiz_attempts.timed`, from the migration) so a resumed attempt keeps it.
  - When on, a 15-second countdown pill sits in the header and turns `danger` at 5s or less. Running out sends a null answer (skipped) and shows "Time's up" with the correct answer.
- **Access (user: free = 3 sessions a day, Pro unlimited, checked on the server):**
  - `start_quiz_attempt` refuses a 4th start within any rolling 24 hours unless the learner has Pro: error code `P0002`, "You've used today's 3 free quizzes." Rolling 24 hours avoids time-zone questions.
  - Every started session counts, including Sample Questions. Resuming an unfinished attempt doesn't start a new one, so it's free.
  - `public.quiz_sessions_left()` returns the number left, or null for Pro. The start screen shows "2 of 3 free quizzes left today" or "Unlimited with Pro".
  - At 0, "Start Quiz" opens the paywall.
- **Where Pro status lives:**
  - A new table `premium_entitlements (user_id pk → profiles, expires_at timestamptz null, updated_at)`. Learners can read their own row and have no write grants.
  - `private.is_premium(user)` is true when a row exists and `expires_at` is null or in the future.
  - The row is written only by a new **Supabase Edge Function `premium-sync`**, using the service role that functions get automatically. It asks RevenueCat's REST API (`GET /v1/subscribers/{clerk user id}`, secret key in the Supabase secret `REVENUECAT_SECRET_API_KEY`) for the `premium` entitlement and stores its expiry.
  - It's called two ways:
    - **The app**, after sign-in, a purchase or a restore, with the Clerk session token as `Authorization: Bearer`. The function verifies it with Clerk's JWKS (`https://still-mastiff-2250.clerk.accounts.dev/.well-known/jwks.json`, using `jose`) and syncs that user.
    - **A RevenueCat webhook**, set up with the MCP, for all events. The function syncs every Clerk id in the event (`app_user_id`, `original_app_user_id`, `aliases`, `transferred_to` that start with `user_`).
  - The webhook only triggers a re-read from RevenueCat, so a forged call can't grant anything; it needs no auth header. `verify_jwt = false` for this function, because it checks Clerk tokens itself.
  - This also covers a purchase made before sign-up: the app's sync after `Purchases.logIn` picks it up.
  - **Limit until the key is set:** until the RevenueCat secret key is set, everyone counts as free. In Expo Go, RevenueCat's preview mode doesn't record purchases, so Pro can only be tested in a development build.
- **Paywall when signed in:** a new `(app)/premium` route reuses `PaywallScreen` with `mode="upgrade"`. Close and a finished purchase go `back()` (after `premium-sync`) instead of to sign-up. It's opened from the quiz limit. The paywall's feature list is unchanged.
- **Resume:** if the learner has an unfinished attempt at this quiz, the start screen shows "Continue quiz (answered/total)" above "Start a new quiz". The player starts at the first unanswered question.
- **Flags:** a bookmark toggle in the question header. It inserts or deletes `question_flags`, so it's kept across attempts.
- **Ending early:** the header's close (`X`) opens a sheet: "End quiz?" / "Unanswered questions count as skipped." with "Keep going" / "End quiz". Ending calls `finish_quiz_attempt` and opens the results.
- **Explanations:** after each answer, the explanation shows in a `Card` with a Lightbulb icon. When the question has a `reference_url`, a "Read more" link opens it in the browser (`expo-web-browser`, which is already installed).
- **Results:**
  - The score as `correct / total` and a %, plus "+{correct × 10} points".
  - Three tiles: Correct (`success`), Wrong (`danger`), Skipped (`muted`).
  - Buttons: "Review answers", "Retake quiz" (back to the start screen), "Back to course".
- **Review:** chips All / Correct / Incorrect / Skipped / Flagged. Each card shows the prompt, your answer (red if wrong), the correct answer (green), and the explanation.
- **Curriculum:** quiz rows open `/quiz/[id]`. A quiz is locked like a lesson when you're not enrolled and it isn't a preview. The row shows "{n} questions" once the quiz is open to you, and "Quiz" otherwise.
- **Routes:** in `(app)`, pushed over the tabs:
  - `quiz/[id]`: the start screen.
  - `attempt/[id]/index`: the player.
  - `attempt/[id]/results` and `attempt/[id]/review`.

  Going from the player to results uses `replace`, so Back from results returns to the start screen.

## Out of scope
- Reporting questions, leaderboards, quiz history charts, offline quizzes, and gating lessons or courses behind Pro (only the quiz limit uses Pro).
- Production RevenueCat apps.

## Steps
### 1. Migration `quiz_sessions`
- `quiz_attempt_questions`: primary key `(attempt_id, question_id)`, `unique (attempt_id, position)`, an index on `question_id`, and RLS letting a learner select rows of their own attempts.
- `quiz_attempts.timed boolean not null default false`.
- `premium_entitlements`, with RLS letting a learner select their own row.
- `private.is_premium`, `private.quiz_sessions_left`, and the public wrapper `quiz_sessions_left()`.
- Replace `start_quiz_attempt(uuid)` with `start_quiz_attempt(p_quiz_id uuid, p_question_count int default null, p_timed boolean default false)`. It keeps the access check, adds the limit check, picks `order by random() limit n` into `quiz_attempt_questions`, and sets `total_questions`.
- `private.answer_quiz_question` also requires the question to be one of the attempt's when the attempt has a question set.
- Grants as before: `authenticated` only, revoked from `anon`.
- Then `db:push`, `db:types`, and the advisors.
- **Check** with rolled-back SQL as the test user: start a 10-question attempt and confirm 10 rows; confirm the 4th start in a day is refused; confirm answering a question outside the set is refused.

### 2. Edge Function `premium-sync`
- `supabase/functions/premium-sync/index.ts` (Deno) does the two call paths above. `config.toml` sets `[functions.premium-sync] verify_jwt = false`.
- Deploy it with `npx supabase functions deploy premium-sync`.
- Add the RevenueCat webhook (MCP) for `https://qlpbjfzyvfyrrpcisnpu.supabase.co/functions/v1/premium-sync`.
- **Check:** with a curl that has no token, expect 401; with a fake webhook body for a user who isn't Pro, expect 200 and no Pro row.

### 3. Services and hooks
- **`services/quizzes.ts`:**
  - `getQuizStart` (quiz, question count, your unfinished attempt and its progress, your latest finished score).
  - `getSessionsLeft`, `startAttempt`, `getAttemptPlay` (the attempt with its questions and answers, columns `id, question_id, position, text`, plus your existing answers).
  - `answerQuestion`, `finishAttempt`, `getAttemptReview`, `getFlags` and `setFlag`.
- **`services/purchases.ts` gains `syncPremium(supabase)`:** it calls the function with `supabase.functions.invoke`, so the Clerk token goes along.
- **Hooks** in `queries/quizzes/` and `queries/purchases/use-sync-premium.ts`.
- **Wiring:** `PurchasesIdentity` syncs after `logIn`, and so do the purchase and restore hooks. A sync invalidates `quizzes.sessionsLeft`.

### 4. Quiz start screen (`src/screens/quiz/quiz-start-screen.tsx`)
- Top to bottom: the back `IconButton`, the topic title (`title-xl`) and "{n} questions" (`subtitle`).
- The length cards: `OptionCard` style with ListChecks, Layers and Infinity icons. "Quick practice · 10 questions", "Standard · 20 questions", "Full topic · All {n} questions".
- The timer row: a card with a Timer icon, "15-second timer", "Unanswered in time counts as skipped", and a `Switch` (track tinted primary).
- The limit line (`caption`), and the last score line when there is one.
- Footer: "Continue quiz" (outline, when there's an unfinished attempt) above "Start Quiz" (primary).
- States: loading, error, and locked ("Enroll in the course to take this quiz.").

### 5. Player (`src/screens/quiz/quiz-player-screen.tsx`)
- **Header:** close, progress, `n/N`, the flag toggle, and the timer pill when timed.
- **Question:** the prompt (`text-20 font-bold leading-snug`), then answers as cards with a 32 letter tile A–E (`rounded-lg bg-primary-tint`).
- **After answering:**
  - The correct card turns `border-2 border-success bg-success-tint` with CircleCheck.
  - A wrong choice turns `border-2 border-danger bg-danger-tint` with CircleX.
  - The other cards fade to 0.6.
- **Footer:** "Skip" (outline) before answering; "Next question" or "See results" after. Answering and skipping are disabled while the request is pending.
- **Errors:** an error toast, and the question stays answerable.

### 6. Results and review
`quiz-results-screen.tsx` and `quiz-review-screen.tsx`, as decided.

### 7. Paywall `upgrade` mode and the curriculum rows
- `(app)/premium.tsx` and the `mode` prop on `PaywallScreen`.
- Quiz rows open the start screen, with locks and question counts.

### 8. Close out
- `/design-system` gains the answer-card states and the timer pill. Update AGENTS.md.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass. The advisors show no new warnings.
- The SQL checks in step 1 and the curl checks in step 2.
- **Expo Go flow:**
  1. Pharmacy Exam Prep → Sample Questions → 10 questions, timer on.
  2. Answer a few, let one time out, and flag one.
  3. End early: the results add up, and points equal correct × 10.
  4. Review filters: Flagged shows the flagged question.
  5. Retake. Then start a 4th quiz within 24 hours: the paywall opens.
- **Resume:** close the app mid-quiz, reopen, and choose Continue quiz: it picks up at the first unanswered question.
- **Pro (development build with the secret key set):** buy in the Test Store; `premium_entitlements` gets a row and the limit line reads "Unlimited with Pro".

## AGENTS.md updates
- **Data model:** `quiz_attempt_questions`, `quiz_attempts.timed`, `premium_entitlements`, the new `start_quiz_attempt` signature, `quiz_sessions_left`, and the free limit of 3 per rolling 24 hours.
- **Payments:** `premium-sync` (Edge Function, RevenueCat REST API plus webhook, Clerk JWKS) is the only writer of Pro status in Supabase. The `REVENUECAT_SECRET_API_KEY` Supabase secret never goes in the app.
- **Routes:** `quiz/[id]`, `attempt/[id]` (index, results, review), `premium`.

## Result
- **Migration `20261031093738_quiz_sessions`:** applied and the types regenerated. Advisors: no security findings; performance shows only "unused index" INFO notices.
- **SQL checks**, in rolled-back transactions as the test user:
  - 3 free starts left at first.
  - A 10-question timed attempt stored 10 questions with `timed = true`.
  - Asking for 500 questions capped at the topic's 55.
  - Free starts went 3 → 2 → 0, and the next start was refused with `P0002` "You've used today's 3 free quizzes.".
  - Answering a question outside the attempt's set was refused ("That question is not in this quiz.").
- **Edge Function `premium-sync`:** deployed; `verify_jwt = false` in `config.toml`. curl checks:
  - No token → 401.
  - A bad token → 401.
  - A webhook with only an anonymous id → 200 `{"synced":0}`.
  - A webhook with a Clerk id → 500, as expected until `REVENUECAT_SECRET_API_KEY` is set.
- **RevenueCat webhook:** "Supabase premium-sync" `whintgr02b67f05e3`, for all events.
- **App:**
  - Start, player, results and review screens, plus the `/premium` paywall mode.
  - Quiz rows in the curriculum show locks and question counts and open the start screen.
  - `OptionCard` moved to `src/components/ui/` (now used by onboarding and the quiz start).
- **Estimated values** (no prototype screen exists):
  - The start screen's length cards and timer card (OptionCard style).
  - Player: the header layout with close, progress, timer pill and bookmark; answer cards (p-4 rounded-2xl, letter tile w-8 rounded-lg); graded states (border-2 success/danger on their tints, CircleCheck/CircleX, others at 0.6 opacity); the explanation card (bg-subtle, Lightbulb).
  - Results: the 80 trophy circle; score in `display`; the points pill in streak colours; three stat tiles.
  - Review: chips; cards showing only your answer and the correct one.
- **Not verified:**
  - On web or in Expo Go: the Chrome extension isn't connected, and bundling runs out of memory on this PC.
  - Real Pro: needs the secret key and a development build.
