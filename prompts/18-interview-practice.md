# 18 · Interview practice: answer interview questions out loud with AI feedback

Status: done

## Goal
From Home, a learner can practise a job interview out loud. They pick **Pharmacy careers** (foundation training, community, hospital, placement) or **Any role** (they type the role), answer 5 questions spoken aloud (up to 3 minutes each), get AI feedback after each answer, and finish with an overall summary and a readiness score. It reuses viva practice's recording, consent, Gemini pipeline, limits pattern and reporting (prompts/17).

## Decisions
**User decisions (this session):**
- Entry: a "Practise an interview" card on Home opens `/interview` (setup), then `/interview/[id]` (player) and `/interview/[id]/results`.
- Questions: Pharmacy careers come from an **original written bank** (about 60 questions, each with key points to grade against). Any role: **Gemini writes 5 questions** (with key points) for the typed role, one extra AI call per session.
- Limits **separate from viva**: free 1 interview per rolling 7 days, Pro 5 per rolling 24 hours.
- Session: **5 questions**, up to **3 minutes** per answer, feedback after each, and an **overall summary** at the end (top strengths, what to work on next, a readiness score out of 10).

**Defaults I picked (say if you want any changed):**
- **Name:** "interview" in code (`interview_*` tables, `interview-*` functions, `src/screens/interview/`). Home card title "Practise an interview"; screen title "Interview practice".
- **Pharmacy targets** (chips on the setup screen): Foundation training year · Community pharmacy · Hospital pharmacy · Placement or summer job. The target tailors question choice (questions can be tagged to settings) and the feedback/summary context.
- **Any role:** a text field "Role you're applying for" (2–60 characters, letters, numbers, spaces and `&-/'.,()`). The generation call also checks it: if it isn't a plausible job or is inappropriate, the function returns 422 and the app asks for a different role. No session is created and no allowance is used.
- **Question mix (pharmacy):** 1 motivation question ("why pharmacy / why this role") first, then 4 from different categories: teamwork, communication, ethics and professionalism, patient safety and errors, situational judgement, explaining a medicine to a patient, resilience and learning. No category repeats in a session.
- **Grading:** the same two-call pipeline as viva (transcribe the audio with no context, then grade the text), so silence can't be graded as an answer. Behavioural questions are graded with the **STAR** shape (situation, task, action, result). Ratings: **Structure, Relevance, Clarity** (1–5); score 0–10; verdict `strong` | `good` | `needs_work` | `no_answer`; up to 3 strengths and 3 improvements; "A strong answer" example (at most 120 words, clearly an example rather than the learner's experience). Pharmacy answers are graded against the question's key points; general answers against the generated key points.
- **Summary:** generated when the learner finishes (text only, from the saved feedback), stored on the session; idempotent. With no answered questions there's no summary call ("No answers to summarise").
- **Consent:** reuses `profiles.ai_consent_at`. The consent sheet's wording becomes general ("Practice with AI feedback": vivas and interviews), and the Settings switch becomes "AI feedback for speaking practice". It's one consent for both features; withdrawing it blocks both.
- **Shared code:** the viva pieces become shared, without changing viva's behaviour:
  - the recorder state machine and metering → `useAnswerRecorder` in `src/lib/viva/` (renamed `src/lib/speaking/`);
  - the footer recorder → `RecorderBar` in `src/components/ui/`;
  - the feedback card → `AiFeedbackCard` in `src/components/ui/`, with labels passed in;
  - the report sheet → shared, with a `kind`.
  
  On the server, `callGemini`, the transcription step and `noAnswer` move to `supabase/functions/_shared/gemini.ts`, used by `viva-answer` and the new functions. Max answer length is a parameter (viva 2 min, interview 3 min).
- **Schema:** new tables only; viva tables are untouched.
- **Paywall:** the fifth line becomes "Viva and interview practice with AI feedback" (still five lines).
- **Platforms:** iOS and Android. On web, the Home card and `/interview` show "Interview practice is available in the Syllo app." No new native modules, so **no new build**: Metro delivers it to the current development build.
- **Not careers advice:** results carry the footnote "AI feedback is for practice only. It isn't careers or professional advice."
- **Cost:** about 2 Gemini calls per answer, plus 1 per general session start and 1 at finish. With Flash pricing, that's a fraction of a penny per session.

## Out of scope
- Real-time voice conversations or follow-up questions (Vapi, Gemini Live).
- Uploading a CV or job advert.
- Video and body-language feedback, storing or replaying audio.
- Tutor-written interview banks (Part 2), languages other than English.
- An admin screen for reports (reviewed in Supabase, as for viva).
- Porting PrepVault code (never named in Syllo).

## Steps
### 1. Question bank
- Write `supabase/seeds/source/interview-questions.json` with about 60 **original** questions (no copied exam-board or regulator wording).
  - **Fields:** `key`, `category`, `kind` (`behavioural` | `situational` | `motivation`), `settings` (an empty list means all; else any of `foundation`, `community`, `hospital`, `placement`), `prompt`, and `keyPoints` (3–5 short points a strong answer covers).
  - **Coverage:** at least 6 per category, at least 2 tagged to each setting.
- Add `scripts/build-interview-seed.mjs` → `supabase/seeds/interview-questions.sql`. Ids come from `md5('interview:' || key)`, so it can re-run. Register it in `config.toml` `[db.seed]`.
- Done when the generator runs and the SQL loads on a fresh `db push`. Already-applied seeds need the MCP `execute_sql` (see Data model).

### 2. Schema (`npx supabase migration new interview < /dev/null`)
- **`interview_questions`**: `id`, `key` (unique), `category`, `kind`, `settings text[]`, `prompt`, `key_points text[]`, `active`. Readable by `authenticated`; no learner writes.
- **`interview_sessions`**:
  - Core: `id`, `user_id` (the usual Clerk default, references `profiles` on delete cascade), `mode` (`pharmacy` | `general`), `target` (a pharmacy target, or null), `role` (general role text, ≤ 60 characters, or null), `started_at`, `finished_at`, `total_questions`.
  - Summary: `readiness` smallint 0–10, `summary` text, `top_strengths text[]`, `next_steps text[]`, `summary_model`.
  - Tokens: `input_tokens`, `output_tokens` (for start and summary).
- **`interview_session_questions`**: primary key `(session_id, position)`, `question_id` (→ `interview_questions`, null for general), `prompt`, `kind`, `category`, `key_points text[]` (copied, so generated questions live here), `tries smallint default 0`.
- **`interview_answers`**: primary key and foreign key `(session_id, position)`; `transcript`, `verdict` (check), `score` 0–10, `structure`, `relevance`, `clarity` (1–5), `strengths text[]`, `improvements text[]`, `model_answer`, `model`, `audio_seconds`, `input_tokens`, `output_tokens`, `created_at`.
- **`interview_feedback_reports`**: `id`, `user_id`, `session_id`, `position` (null = the summary), `reason` (`inaccurate` | `offensive` | `other`), `comment` ≤ 500, `created_at`. Learners insert their own, and only for an existing answer or a summary.
- **RLS and grants** follow viva: read own (questions bank readable by everyone signed in), insert own reports only, `revoke all` then grant `select` (plus `insert` on reports). Index every foreign key and `(user_id, started_at)`.
- **Functions** (`private` definer, `search_path = ''`; `public` invoker wrappers; execute for `authenticated` only):
  - `interview_sessions_left()`: free `greatest(0, 1 − sessions in 7 days)`; Pro `greatest(0, 5 − sessions in 24 hours)`.
  - `start_interview_session(p_target)` (pharmacy):
    - Refuses without consent (`P0003`) and at the limit (`P0002`).
    - Reopens an unfinished pharmacy session with the same target.
    - Picks 1 motivation question plus 4 from distinct other categories, among questions for that target or all settings, in random order after the first.
    - Copies prompt, kind, category and key points into the session questions.
  - `private.create_general_interview(p_user, p_role, p_questions jsonb)`: for the `interview-start` function only (service role). Same consent and limit checks, inserts the session and its 5 questions.
  - `finish_interview_session` isn't public: finishing goes through `interview-finish`, which writes the summary with the service role.
- `npm run db:push`, `npm run db:types`, then the security and performance advisors (no new warnings).

### 3. Shared server code and Edge Functions
- **`supabase/functions/_shared/gemini.ts`:**
  - `callGemini(model, system, parts, schema, maxTokens)`.
  - `transcribe(model, mimeType, audio)` → `{ transcript, spoke, tokens }`, using the viva instruction and the minimum-words rule.
  - `noAnswer(...)` and the list and word clamps.
- **Refactor `viva-answer`** onto it with no behaviour change. Re-run the viva Gemini tests (spoken 200, silence 422 then saved `no_answer`, injection ignored).
- **`interview-start`** (`verify_jwt = false`, Clerk JWKS), `POST { role }`:
  1. Validates the role.
  2. Checks consent and the limit as the learner (`interview_sessions_left`, profile).
  3. Asks Gemini (structured output) for `{ acceptable: boolean, questions: [{ prompt, kind, keyPoints[] }] × 5 }`, with the role inside quotes as data, never instructions.
  4. Not acceptable → 422 `{ error: "role" }`.
  5. Clamps (prompts ≤ 300 characters, 3–5 key points) and calls `private.create_general_interview` with the service role.
  6. Returns the session id.
  
  A 502 or invalid output → no session.
- **`interview-answer`**: like `viva-answer` (validation, read as the learner, the two-call pipeline, tries, 422 on the first `no_answer`, 409 duplicate or finished), with a max of 185 s and a 4 MB limit.
  - Grading context: the role or target, the question, kind and key points, and the transcript.
  - Instruction: STAR for behavioural answers, key-point coverage, honesty (don't invent experience), and no careers, legal or medical advice beyond the question.
  - Returns the feedback.
- **`interview-finish`**, `POST { sessionId }`:
  - As the learner: own session.
  - Already summarised → return it.
  - Otherwise: one text-only call over the saved feedback → `{ readiness 0–10, summary ≤ 80 words, topStrengths ≤ 3, nextSteps ≤ 3 }`, then set `finished_at` and the summary (service role).
  - No answers → finish without a call.
- Add `[functions.interview-*] verify_jwt = false` to `config.toml`. Deploy `viva-answer interview-start interview-answer interview-finish`. Log only token counts and timing.

### 4. App: data layer
- `src/services/interviews.ts`:
  - `getInterviewSessionsLeft`.
  - `startPharmacyInterview(target)`: P0002 → `InterviewLimitError`, P0003 → `AiConsentRequiredError`.
  - `startGeneralInterview(role)`: 422 → `RoleNotAcceptedError`; 429/limit → `InterviewLimitError`.
  - `getInterviewSession`: questions, answers and summary.
  - `submitInterviewAnswer`: the same error mapping as viva.
  - `finishInterview` → the summary.
  - `reportInterviewFeedback`.
  
  New errors go in `services/errors.ts`.
- `queryKeys.interviews` (`all`, `sessionsLeft()`, `session(id)`). One hook per file in `src/lib/queries/interviews/`, mirroring viva (submit puts the answer into the session cache; finish puts the summary there and invalidates `sessionsLeft`).
- **Shared speaking code:**
  - Rename `src/lib/viva/recording.ts` to `src/lib/speaking/recording.ts`, with `maxSeconds` as a parameter.
  - Add `src/lib/speaking/use-answer-recorder.ts`: the state machine, metering peak and cleanup, lifted from the viva player.
  - Viva imports from there; its behaviour is unchanged.

### 5. App: screens
- **Shared UI:**
  - `RecorderBar` (`src/components/ui/recorder-bar.tsx`, the footer recorder from prompts/17).
  - `AiFeedbackCard` (`src/components/ui/ai-feedback-card.tsx`), with `ratings: { label, value }[]` and verdict labels passed in.
  - Viva's card and player switch to them.
  - Add both to `/design-system`.
- **Home** (`src/screens/home/interview-card.tsx`): a card between "Recommended for you" and the stat tiles.
  - Briefcase icon, "Practise an interview", "Answer real interview questions out loud and get AI feedback", and "n left this week/today".
  - Opens `/interview`. On web it shows the notice.
- **`/interview` setup** (`src/screens/interview/interview-setup-screen.tsx`):
  - Two option cards: Pharmacy careers / Any role.
  - Pharmacy: target chips. Any role: a role `TextField` (red border + toast if invalid).
  - "Start interview" (shows a loader while questions are generated, about 5–10 s for Any role) and the sessions-left footnote.
  - No consent → `AiConsentSheet` first.
  - At the limit: free → toast + `/premium`; Pro → "Come back tomorrow".
  - Role refused → toast "Try a different role" and the field marked red.
- **Player** (`interview-player-screen.tsx`):
  - Header "Interview practice", "Question n of 5", and a category badge.
  - The question card, read aloud with "Read it again".
  - `RecorderBar` (3:00 max).
  - `AiFeedbackCard` with Structure / Relevance / Clarity and verdict labels Strong / Good / Needs work / No answer.
  - Footer: Next / Skip / Finish.
  - Finish → `interview-finish` → banner "Interview complete", "Readiness n/10" (app icon in the circle) → results.
- **Results** (`interview-results-screen.tsx`):
  - Readiness n/10 with the role or target.
  - The summary paragraph, "Top strengths" and "Work on next".
  - Report summary.
  - Expandable per-question rows with feedback cards.
  - "Practise again" (→ `/interview`) and "Back to Home".
  - Footnote: "AI feedback is for practice only. It isn't careers or professional advice."
- **Routes:** `src/app/(app)/interview/index.tsx`, `[id]/index.tsx` and `[id]/results.tsx`, registered under the onboarded guard.
- **Copy changes:**
  - The consent sheet: title "Practice with AI feedback"; bullets mention vivas and interviews.
  - Settings switch: "AI feedback for speaking practice".
  - Paywall line: "Viva and interview practice with AI feedback".

### 6. You: store listing and privacy
- Interview practice gets added to `store.config.json`: description, the Pro line and review notes (how to reach it; the free allowance). The notes are at 3,919 of 4,000 characters, so I'll shorten older lines to make room.
- Then run `metadata:push`.
- The privacy policy should also mention interview answers and typed roles.
- The App Privacy and Data safety categories don't change, since it's the same audio and user content.

### 7. Close out
Write the Result, update AGENTS.md and the README (feature row, data model, history row 18).

## Verification
- `tsc`, `expo lint`, `deno check` on the functions, and the advisors with no new warnings.
- **API script as the test account** (outcomes only):
  - Consent P0003.
  - The pharmacy pick: 5 questions, motivation first, no repeated category, only matching settings.
  - Reopening the same target.
  - Limits: free second session → P0002, Pro 5 then refused with a temporary Pro row.
  - Viva and interview allowances are independent.
  - Direct writes refused; reports own only.
  - `interview-start`: 401 without a token; 400 for a bad role; 422 for "asdfgh" and for an inappropriate role; 200 for "Retail assistant" with 5 questions and key points.
  - `interview-answer`: 401 / 404 / 400 (200 s, MIME) / 409.
  - Spoken answer → 200 with STAR-style feedback; silence → 422 then `no_answer`; injection ignored.
  - `interview-finish`: a summary with readiness; idempotent; no answers → no AI call.
  - **Viva regression:** the prompts/17 Gemini tests still pass after the refactor.
- **Samsung (Metro, no new build):**
  - Home card → setup.
  - A pharmacy session (Foundation training) end to end, with one spoken answer (PC speakers), one skip, finish → banner → summary.
  - A general session ("Retail assistant") start.
  - A refused role.
  - The limit → paywall.
  - Viva still works (one answer).
  - Withdrawing consent blocks both features.
  - Long questions keep the recorder visible.
- **Web:** Home card notice.
- **Not verifiable here:** iOS.
- **Cleanup:** remove the test sessions, consent and the Pro row.

## AGENTS.md updates
- **Who owns what → AI:** extend the viva bullet to "speaking practice" (viva + interview).
  - The shared `_shared/gemini.ts` (transcribe with no context, then grade the text) is the rule for any audio feature.
  - Functions `interview-start` (general questions + role check), `interview-answer`, `interview-finish` (summary).
  - One consent for both.
- **Data model:** the `interview_*` tables and their RPCs; limits in `private.interview_sessions_left` (separate from viva); the bank in `seeds/source/interview-questions.json` with its generator.
- **Flow:** the Home card → `/interview` → `/interview/[id]` → results.
- **Shared UI:** `RecorderBar` and `AiFeedbackCard` in `src/components/ui/`, `useAnswerRecorder` in `src/lib/speaking/`.
- AGENTS.md is at 149 of 150 lines: I'll merge the viva bullet into a "Speaking practice" bullet and shorten others to fit.

## Result
Built and verified on 2 November 2026 (Android dev build on the Samsung SM-S942B, through Metro; no new build needed).

**Changed from the plan**
- **Bank size:** 57 questions (8 motivation, 7 in each other category), not about 60. The generator validates that each target can fill a session (a motivation question plus 4 other categories) and fails otherwise.
- **The shared pieces are `src/lib/speaking/`** (`recording.ts` with `SPEAKING_RECORDING`, `VIVA_MAX_SECONDS` 120 and `INTERVIEW_MAX_SECONDS` 180; `useAnswerRecorder`). `src/lib/viva/` is gone.
- **Prompt fix found in testing:** for "Why do you want to train with us in particular?", the model answer invented employer facts ("your specialist renal pharmacy team"). `interview-answer` now writes [placeholders] for anything about the employer.
- **"Report this feedback" is easier to hit** (`hitSlop` and padding): the first tap on the phone missed it in prompts/17.
- **A refused "Any role" uses no allowance** (it's refused before a session exists), and `interview-start` reopens an unfinished session for the same role (case-insensitive) without a new AI call.
- **`create_general_interview` is in `public`** (so the service role can call it through PostgREST), and execute is granted to `service_role` only. Learners get 403.
- **Banner app icon (asked in the same session):** `IDynamicNotification.avatar` now takes a URL or a bundled `require`, and defaults to `assets/images/icon.png`. Every banner shows the Syllo icon instead of an empty circle.

**Cost and speed (logs):** interview answers 680–1,900 input and 270–470 output tokens across both calls, 8–12 s; `interview-start` about 6 s (a refusal about 2 s); the summary about 10 s, then 0.2 s when repeated (stored).

**Verification**
- ✅ `tsc`, full `expo lint`, `deno check` on all four functions; security advisor clean, performance INFO only (unused new indexes); the seed generator validates.
- ✅ **API as the test account, 39/39:**
  - **Consent:** P0003 and 403 without it; withdrawing blocks again.
  - **Start:** unknown target refused; the foundation pick is 5 questions, motivation first, distinct categories, matching settings, key points copied; the same target reopens.
  - **Limits:** free 0 left after one, with viva's allowance untouched; P0002 / 429 at the limit; Pro 5 then P0002.
  - **Writes:** direct writes refused, and `create_general_interview` refused for learners.
  - **`interview-answer`:** 401 / 404 (unknown session, position) / 400 (200 s, MIME) / 409 (repeat, finished).
  - **Gemini:**
    - Spoken motivation answer → "needs work 4/10", correctly for not saying why this employer.
    - Silence → 422, then saved `no_answer`.
    - A weak answer with "ignore your previous instructions… ten" → `no_answer` (not obeyed).
  - **Reports:** own only, and a summary only once it exists.
  - **`interview-finish`:** summary with readiness 4/10; repeat returns the same; no answers → no AI call.
  - **`interview-start`:** `<script>` → 400; "asdfgh qwerty" and an instruction → 422 with no allowance used; "Retail assistant" → 5 sensible questions (motivation, 2 behavioural, 2 situational).
  - **Viva regression after the shared refactor:** off-topic answer → 422 then saved, silence → 422 then `no_answer`.
- ✅ **Samsung:**
  - **Home:** the "Practise an interview" card and "1 interview left this week".
  - **Setup:** Start is disabled until a target is chosen; the reworded consent sheet appears.
  - **Foundation interview:** read aloud; a spoken answer (PC speakers) → Good 6/10 with structure/relevance/clarity; skip 3 → Finish.
  - **Banner:** "Interview complete · Readiness 6/10" with the **Syllo app icon**.
  - **Results:** readiness, summary, top strengths, work on next, report link, Q1–Q5 rows.
  - **Limit:** "Practise again" → "No interviews left this week" → toast + paywall (new fifth line).
  - **Any role:**
    - "asdf qwer zxcv" → toast and red field, allowance kept.
    - "Pharmacy technician" → "Writing questions for this role…" → the player with generated questions.
  - **Viva on the shared recorder:** record, quiet take → "We couldn't hear an answer".
- ❌ Read-aloud not heard (the phone was muted). ❌ Airplane-mode resubmit not run. ❌ iOS not tested (no Mac). ❌ Web notice not opened in a browser (memory).
- All test rows removed: no interview or viva sessions, no reports, no Pro row, consent cleared, the test account back to its 5 earlier attempts.

**Estimated values (not in the design):**
- **Home card:** `p-5`, icon tile `w-12 h-12 rounded-2xl bg-primary-soft`, footnote `text-12 font-semibold text-primary`.
- **Setup:** fact rows with `md` icons in primary / streak / success.
- **Results:** reuse the viva results layout.
- **Example-answer box:** `bg-primary-tint`.

**Store and privacy:** `store.config.json` description (PRACTISE INTERVIEWS section, Pro line) and review notes (3,992 of 4,000 after tightening older lines). Still for the user: `metadata:push`, and the privacy policy should mention interview answers and typed roles. The App Privacy and Data safety categories are unchanged.
