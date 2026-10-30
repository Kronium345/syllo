# 05 · Quizzes, quiz attempts and the Pharmacy Exam Prep course

Status: done

## Goal
Syllo's database can hold quizzes (multiple-choice questions with one correct answer and an explanation) attached to course chapters. It also records each learner's quiz attempts and scores, graded by the database so the correct answer never reaches the app before the learner answers. A new published course, **Pharmacy Exam Prep**, is imported from the user's older pharmacy quiz project (MongoDB Atlas "PharmaQue-Project", Cluster0, database `test`): 17 topic chapters, each with one quiz, 2,453 questions in total. The sample courses stay. No app screens are part of this plan.

## Decisions
- **Source data (read with the MongoDB Atlas MCP, read-only):**
  - `test.chapters` holds 18 topics, each with `name`, `image` (an old server path such as `uploads/images/CardioIcon.png`, not reachable) and embedded `questions`.
  - Each question has `question`, 5 `answers` (`text`, `isCorrect: true` on one), `explanation` (2,124 of 2,453) and `bnf_link` (55).
  - "Law & Ethics" has no questions (the field is the string "null"), so it's skipped.
  - `test.flashcards` duplicates the same banks, so it isn't imported.
  - `cquizzes`, `fquizzes`, `users`, `comments`, `flagged*`, `reported*` and `employees` hold people's data and aren't read or copied. `PharmDB.questions` is empty.
- **Naming (user request):** nothing in Syllo uses the old project's name. The course is **Pharmacy Exam Prep** (slug `pharmacy-exam-prep`), subtitle "Practice questions for every clinical topic", category "Healthcare", level "intermediate". Its tutor is a new **Syllo Pharmacy Team** row. The cover is a `picsum.photos` placeholder seeded `syllo-pharmacy-exam-prep`, like the other samples.
- **Mapping (user choice: one course, topic chapters):**
  - The course's 17 chapters are the topics. Chapter 1 is **Sample Questions** (55 questions, the free preview), then Cardiovascular System, Respiratory System, Central Nervous System, Infections, Endocrine, Gastrointestinal, Malignant Disease and Immunosuppression, Nutrition and Blood, Musculoskeletal & Joint diseases, "Obstetrics, Gynaecology and Genitourinary tract", Skin, Ophthalmology, Ear, Nose and Throat, Anaesthesia, Immunological products and vaccines, and Calculations.
  - Each chapter has one quiz named after the topic. Chapters have no lessons yet; lessons can be added later beside the quiz.
  - Questions and answers keep their source order. Shuffling is the quiz screen's job.
- **Sample courses (user choice):** the 6 existing courses stay.
- **Quiz attempts (user request; logic based on the old app, `pharmaque_app/App/Pages/QuizPage1.js`, `Result.js`):**
  - The old app created one attempt per learner per topic, counted attempted, correct, wrong and skipped answers, allowed finishing early, timed each question at 15s (no answer = skipped), and let learners flag questions to review. Points were correct × 10.
  - **Change:** the old app sent `isCorrect` to the phone and the phone counted the score. Syllo grades in the database instead. Learners can't read `is_correct` before answering, and counts are kept by the server.
  - Points (correct × 10) aren't stored; the app can compute them from the attempts.
  - Reporting questions (the old `reportedquestions`) is out of scope, because it needs a moderation flow.
- **Schema (`supabase/migrations/<ts>_quizzes.sql`):**
  - `quizzes`: `id uuid pk`, `chapter_id uuid not null references chapters on delete cascade`, `title text not null`, `position int not null default 1`, `is_preview boolean not null default false`, `unique (chapter_id, position)`.
  - `quiz_questions`: `id uuid pk`, `quiz_id uuid not null references quizzes on delete cascade`, `position int not null`, `prompt text not null`, `explanation text`, `reference_url text` (from `bnf_link`), `unique (quiz_id, position)`.
  - `quiz_answers`: `id uuid pk`, `question_id uuid not null references quiz_questions on delete cascade`, `position int not null`, `text text not null`, `is_correct boolean not null default false`, `unique (question_id, position)`, plus a unique partial index on `(question_id) where is_correct`, so a question has at most one correct answer.
  - `quiz_attempts`: `id uuid pk`, `user_id text not null default auth.jwt()->>'sub' references profiles on delete cascade`, `quiz_id uuid not null references quizzes on delete cascade`, `started_at timestamptz default now()`, `finished_at timestamptz`, `total_questions int not null`, `correct_count int not null default 0`, `wrong_count int not null default 0`, `skipped_count int not null default 0`. A learner can have many attempts per quiz (Retake).
  - `quiz_attempt_answers`: `attempt_id uuid references quiz_attempts on delete cascade`, `question_id uuid references quiz_questions`, `answer_id uuid null references quiz_answers` (null = skipped or timed out), `is_correct boolean not null`, `correct_answer_id uuid not null`, `answered_at timestamptz default now()`, with primary key `(attempt_id, question_id)`, so each question is answered once per attempt.
  - `question_flags`: `user_id text default sub references profiles on delete cascade`, `question_id uuid references quiz_questions on delete cascade`, `created_at`, with primary key `(user_id, question_id)`.
  - An index on every foreign key not covered by a primary or unique key.
- **Access (RLS `to authenticated` only, `((select auth.jwt()) ->> 'sub')`, same rules as lessons):**
  - `quizzes`: readable when the chapter's course is published (part of the outline).
  - `quiz_questions` and `quiz_answers`: readable when the course is published **and** (the quiz `is_preview` **or** the learner is enrolled in the course).
  - `quiz_answers.is_correct` isn't readable by learners: the select grant is per column (`id, question_id, position, text`). Learners learn it only by answering.
  - `quiz_attempts` and `quiz_attempt_answers`: learners select their own. There are no direct insert, update or delete grants: writes go only through the functions below.
  - `question_flags`: learners select, insert and delete their own, only for questions they can read.
- **Database functions** (`security definer`, `set search_path = ''`, `grant execute` to `authenticated` only, revoked from `public` and `anon`). Each checks the caller's `sub` and access itself:
  - `start_quiz_attempt(quiz_id uuid) returns quiz_attempts`: checks the quiz is published and the caller can read it (preview or enrolled), then creates the attempt with `total_questions` = the quiz's question count.
  - `answer_quiz_question(attempt_id uuid, question_id uuid, answer_id uuid default null) returns table (is_correct boolean, correct_answer_id uuid, explanation text)`:
    - The attempt must be the caller's and unfinished. The question must be in the attempt's quiz, and the answer (when given) must belong to the question.
    - It records the answer once (a second answer is rejected) and updates `correct_count` / `wrong_count`. A null answer is a skip or timeout, counted at finish.
    - It returns the grading, so the app can show right or wrong plus the explanation, as the old app did.
  - `finish_quiz_attempt(attempt_id uuid) returns quiz_attempts`: sets `finished_at` and `skipped_count = total_questions − correct − wrong`. Finishing early is allowed. It's idempotent.
  - After finishing, the review screens (correct, incorrect, flagged) read `quiz_attempt_answers` (which holds `correct_answer_id`) together with the questions and answers.
- **Import pipeline (repeatable, in the repo):**
  - Export from Atlas with the MCP (one aggregation per topic, projecting only names, questions, answers, explanations and links) into `supabase/seeds/source/exam-prep.json`, which is committed so the seed builds without Atlas.
  - `scripts/build-exam-prep-seed.mjs` (Node, no dependencies) turns it into `supabase/seeds/exam-prep.sql`. Ids are `md5()` of readable keys (`quiz:<chapter>`, `question:<chapter>:<n>`, `answer:<chapter>:<n>:<m>`), so it can re-run with `on conflict do nothing`.
  - Text is cleaned: trimmed, with empty explanations stored as null. A question without exactly one correct answer, or with fewer than 2 answers, is skipped and listed in the script's output.
  - `supabase/config.toml` `[db.seed] sql_paths` gains `./seeds/exam-prep.sql`; `npm run db:push` applies it.
- **Quizzes in the sample courses:** none; Pharmacy Exam Prep covers quizzes. Its "Sample Questions" quiz is the only preview quiz.
- **Types:** regenerate `src/lib/database.types.ts`; the functions appear under `Functions`.
- **No app code changes** beyond the regenerated types. The quiz screens (timer, results, review, flags, retake) come with a later plan built from the designs.

## Out of scope
- Quiz and result screens, the timer, points display, shuffling.
- Reporting questions and moderation; flashcard mode (the bank is the same and can reuse these tables later).
- Topic icons: the old images aren't reachable; covers and icons come from the design system and assets later.
- Tutor authoring of quizzes (Part 2).

## Steps
### 1. Schema, RLS and functions
`npx supabase migration new quizzes`, written as in Decisions, then `npm run db:push`. Run the security and performance advisors and fix any warnings in the same plan. Done: 6 new tables with RLS on, 3 functions, and clean advisors.

### 2. Export from Atlas
One MCP aggregation per topic into `supabase/seeds/source/exam-prep.json` (names in the chapter order above; per question: prompt, explanation, reference link, answers with text and correctness). Done: 17 topics and 2,453 questions in the file, matching the Atlas counts.

### 3. Seed builder and import
`scripts/build-exam-prep-seed.mjs` → `supabase/seeds/exam-prep.sql` (the tutor, course, chapters, quizzes, questions, answers); add it to `config.toml`; `npm run db:push`. Done: Supabase counts match the import report (1 course, 17 chapters, 17 quizzes, the number of questions kept, answers).

### 4. Types and checks
`npm run db:types`; `tsc` and lint; the access checks below.

### 5. Close out
`AGENTS.md`, `## Result`.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass. The Supabase security and performance advisors show no new warnings beyond INFO "unused index".
- SQL as `authenticated` with a fake `sub` (rolled back):
  - The course and its 17 chapters and quizzes are visible.
  - Questions are readable only for Sample Questions until enrolled, then for all topics.
  - Selecting `quiz_answers.is_correct` is refused (permission denied).
  - `start_quiz_attempt` on a locked quiz fails, and on the preview it works.
  - `answer_quiz_question` returns the right grading; answering twice fails; another learner's attempt fails.
  - `finish_quiz_attempt` sets the skipped count, and inserting into `quiz_attempts` directly is refused.
  - Anonymous access is refused.
- End to end over the Data API with a real Clerk session token for a temporary Clerk user (as in prompts/04): start the preview quiz, answer 2 questions (one right, one wrong), finish → counts 1/1/53. Then delete the test user and rows.

## AGENTS.md updates
- **Data model:** quizzes per chapter; questions and answers; attempts graded by database functions (`start_quiz_attempt`, `answer_quiz_question`, `finish_quiz_attempt`); `is_correct` not readable by learners; flags. Pharmacy Exam Prep is imported from the old project's export (`supabase/seeds/source/`, `scripts/build-exam-prep-seed.mjs`). The old project's name is never used in Syllo.
- **Rules:** quiz scoring and correctness only on the server (never trust the app's count). Attempts are written only through the functions.

## Result
Built as planned. The migrations `quizzes` (6 tables, RLS, functions) and `quiz_functions_private` are applied. 17 topics and 2,453 questions were exported from Atlas (read-only) into `supabase/seeds/source/exam-prep.json`, and `scripts/build-exam-prep-seed.mjs` generates `supabase/seeds/exam-prep.sql`, applied with `db push`: 1 course, 17 chapters/quizzes, **2,451 questions**, 12,254 answers, exactly one correct each, and 2,122 explanations. The types are regenerated.

Changes from the plan:
- The security advisor flagged SECURITY DEFINER functions in `public`. They moved to `private` (not exposed by the API), with `public` SECURITY INVOKER wrappers of the same names and arguments, so the app's calls are unchanged.
- 2 questions were skipped for having 2 answers marked correct in the source: Respiratory System #60 (dornase alfa) and "Obstetrics, Gynaecology and Genitourinary tract" #113 (spironolactone). Fix them in the source JSON and re-run the script to include them.
- The tutor's bio states only what's known ("Multiple-choice practice across every clinical topic…"); I don't claim authorship.

Verified: `tsc` and `expo lint` pass; the security advisor is clean and the performance advisor shows INFO "unused index" only.
- SQL as a learner (rolled back), 17 checks:
  - 17 quizzes visible; 55 questions readable before enrolling and 2,451 after.
  - Blocked: reading `is_correct`, starting a locked quiz, inserting an attempt directly.
  - Grading right/wrong with the explanation and correct id; answering twice, answering a foreign question and answering after finishing are refused.
  - Finish gives 1/1/53; another learner can neither see nor finish the attempt; anon is blocked.
- Over the Data API with a real Clerk token for a temporary user: `select=*` on answers is refused, and explicit columns hide `is_correct`. Start preview gives 55; answer graded server-side; repeat refused; skip recorded; finish gives 1/0/54; locked topic gives "Enroll in this course to take its quizzes."; 2 review rows. Then the test profile (cascade) and Clerk user were deleted.
