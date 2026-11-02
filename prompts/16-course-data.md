# 16 · Course data: ratings, tutor follows, lesson resources, Free/Premium access

Status: done (device walk-through pending: phone disconnected)

## Context
An audit of the course, chapter and lesson screens against the database and the Screensdesign prototype found four things the UI shows that the schema doesn't store:
- **Star ratings and review counts** are made up (`src/screens/home/placeholder-stats.ts`: 4.8/4.9 and a hard-coded "(2.4k)") on Explore cards, Home cards and Course details.
- **Follow** on the tutor card shows a "Coming soon" toast.
- **Lesson resources:** the design's file card ("Typography_Scale.fig · 1.4 MB · Figma File") is reduced to a "Resources included" label that appears whenever notes exist.
- **Access/pricing:** the design shows prices; the app shows "Free" / "Included in Premium", and enrolling is free for every course.

Already real, and unchanged: progress, streak, lessons done, certificates (all from `lesson_progress`), student counts (RPC), durations, level, category, videos.

**User decisions:**
- Build all four, and wire the existing UI to them (not schema only).
- Courses without ratings show **"New"**; no fake reviews are seeded.
- **Free/Premium tier, with Pro enforced now**; no per-course prices.
- Seed resources with **openly licensed files** (CC0/BY/BY-SA from Wikimedia Commons), like the lesson videos.

On approval: copy this plan to `prompts/16-course-data.md` with `Status: approved` (project workflow).

## Schema (one migration: `npx supabase migration new course_data < /dev/null`)
1. **`courses.access text not null default 'free' check (access in ('free','premium'))`.**
   - Premium in the seed: `advanced-animations`, `data-analysis-pandas`, `design-systems`.
   - Free: `react-native-basics`, `python-for-everyone`, `ui-design-fundamentals`, `pharmacy-exam-prep`.
   - Update `seed.sql` (insert column), and apply it to hosted rows with an idempotent `update … where slug in (…)` in the same migration.
2. **`private.can_open_lesson(p_lesson_id uuid, p_user_id text) returns boolean`** (security definer, `search_path = ''`). It's true when the course is published and either:
   - `l.is_preview`, or
   - the learner is enrolled and (`c.access = 'free'` or `private.is_premium(p_user_id)`).

   It reuses the existing `private.is_premium` (`20261031093738_quiz_sessions.sql`). Recreate these to use it:
   - the `lesson_contents` select policy (`20261030124942_rls_initplan.sql`);
   - the `lesson_progress` insert policy "Learners complete lessons they can open";
   - `private.can_use_quiz`, with the same premium rule for non-preview quizzes.

   Lapsed Pro learners keep their enrollment and progress but lose premium content until they renew.
3. **Enrollment policy** "Learners enroll themselves in published courses": add `and (c.access = 'free' or private.is_premium((select auth.jwt()) ->> 'sub'))`.
4. **`course_reviews`**:
   - Columns: `id uuid pk default gen_random_uuid()`; `course_id uuid fk → courses on delete cascade`; `user_id text not null default ((select auth.jwt()) ->> 'sub')`; `rating smallint check 1..5`; `comment text check (char_length ≤ 1000)`; `created_at`, `updated_at timestamptz default now()`; `unique (course_id, user_id)`; index on `course_id`.
   - RLS: select for authenticated on published courses; insert/update/delete own rows only, and insert/update only when enrolled.
   - **`courses.rating_average numeric(2,1)`** (null = no ratings) and **`courses.rating_count int not null default 0`**, kept in step by a trigger `private.refresh_course_rating()` (security definer) after insert/update/delete. That way the feed's `CARD_COLUMNS` read them with no extra query.
5. **`tutor_follows`**: `user_id text default sub`, `tutor_id uuid fk → tutors on delete cascade`, `created_at`, `primary key (user_id, tutor_id)`, index on `tutor_id`. RLS: select/insert/delete own rows only.
6. **`lesson_resources`**:
   - Columns: `id uuid pk`; `lesson_id uuid fk → lessons on delete cascade`; `position int`; `title text`; `file_name text`; `size_bytes bigint`; `mime_type text`; `storage_key text not null` (R2 key `resources/…`); `credit text`; `created_at`; `unique (lesson_id, position)`.
   - RLS select: `private.can_open_lesson(lesson_id, sub)`. No learner writes.
7. **Account deletion:** `deleteProfile` relies on cascades. Check that reviews and follows go too: add `on delete cascade` from `user_id` where a profile foreign key exists, otherwise delete them in the account-deletion service before the profile.

**After the migration:** `npm run db:push`, then `npm run db:types`, then the security and performance advisors (no new warnings).

## Edge Functions
- **Move the shared code** into `supabase/functions/_shared/` (`clerk.ts`: the JWKS check; `r2.ts`: `signR2(key, { downloadName? })`) and import it from `lesson-video` (behaviour unchanged).
- **New `lesson-resource` function** (`verify_jwt = false` in `config.toml`):
  - `POST { resourceId }` → reads `lesson_resources` **as the learner** (RLS decides; 404 when hidden).
  - Returns a 1-hour signed R2 link with `response-content-disposition=attachment; filename="<file_name>"`.
  - Deploy with `npx supabase functions deploy lesson-resource lesson-video`.

## App (services → hooks → screens, per `.claude/rules/data-fetching.md`)
- **`src/services/courses.ts`:**
  - `CourseCard` and `CourseDetails` gain `access`, `ratingAverage` and `ratingCount`; add them to `CARD_COLUMNS` and the details select.
  - `CourseDetails` also gains `myRating` (the learner's own review, via an embedded `course_reviews` select filtered by RLS-visible own row) and `tutor.isFollowed` (via `tutor_follows`).
  - **`enroll`:** RLS error `42501` → throw a new `PremiumRequiredError` (`src/services/errors.ts`).
- **New `src/services/reviews.ts`:** `rateCourse(supabase, courseId, rating, comment)` (upsert on `course_id,user_id`) and `deleteMyReview`.
- **New `src/services/follows.ts`:** `followTutor` and `unfollowTutor`.
- **`src/services/lessons.ts`:**
  - Embed `lesson_resources(id, position, title, file_name, size_bytes, mime_type, credit)` in `getLesson`.
  - `getLessonResourceUrl(supabase, resourceId)` via `functions.invoke("lesson-resource")`, mirroring `getLessonVideoUrl`.
- **Hooks**, one per file, with keys in `queries/keys.ts`:
  - `useRateCourse`, `useFollowTutor`: optimistic, invalidating `courses.all`.
  - `useLessonResourceUrl` as a mutation, so the link is fetched on tap.
  - `useEnroll` passes `PremiumRequiredError` through.
- **Shared helpers:**
  - `src/lib/format-count.ts`: `formatCount(2400)` → "2.4k".
  - `src/lib/course-rating.ts`: `ratingLabel(course)` → "4.7" or "New".
  - Delete `placeholder-stats.ts`.
- **UI:**
  - **Rating badges** (`feed-item.tsx`, `recommended-card.tsx`, course details info card): `ratingLabel`, plus `(formatCount(count))` on details only when count > 0. "New" uses the same badge style.
  - **Course details:**
    - **Rating:** enrolled learners see a "Rate this course" row under the info card, or "Your rating ★4" to edit. It opens `src/screens/course/rate-course-sheet.tsx` (a `Sheet` with 5 star `Pressable`s plus an optional comment `TextField`, then Save / Remove), built from design tokens like the other sheets.
    - **Follow button:** Follow / Following (variant `outline-primary` / `outline`), optimistic; the "Coming soon" toast is gone.
    - **Footer:**
      - Free: "Full Access · **Free**".
      - Premium: "Full Access · **Included in Premium**". For non-Pro learners (`usePremium`), the button reads "Unlock with Premium" and opens `/premium`; a `PremiumRequiredError` from enroll does the same, with an info toast.
  - **Explore cards:** the price slot reads "Free" or "Included in Premium" from `access`.
  - **Lesson screen:**
    - "Resources included" shows only when resources exist.
    - A **Resources** section after the notes holds design file cards: a file icon, name, "1.4 MB • PDF" (`formatFileSize`), and the credit line in a caption.
    - Tapping a card signs the link and opens it with `expo-web-browser` (already installed, so no new dependency). Loading and error toasts are handled.
    - **Locked copy:** enrolled + premium + not Pro shows "This is a Premium course. Upgrade to keep learning." with a button to `/premium`; otherwise the existing "Enroll to watch…".
  - **`/design-system`:** preview the "New" rating badge, the resource card and the rate sheet trigger.

## Seed content
- **Resources:** extend `supabase/seeds/source/lesson-videos.json` with an optional `resources: ["File:….pdf" | "File:….svg"]` per chapter.
  - Curated on Commons during the build, with licences checked by the script's existing `--check` (CC0/BY/BY-SA/PD).
  - Every lesson in the chapter gets them.
- **`scripts/upload-lesson-videos.mjs`:**
  - Downloads each resource as is (no conversion) and uploads it to `resources/<course>-<chapter>-<n>.<ext>` with its MIME type.
  - Writes `lesson_resources` rows into `seeds/lesson-videos.sql` (`delete … where storage_key like 'resources/%'`, then insert per lesson, so re-runs are safe), with `credit` = the same "by … licence … via Wikimedia Commons" text.
  - Chapters with no fitting file get none.
- No review seed: badges show "New".

## Docs
- **`AGENTS.md`:**
  - Replace "Enrolling is free for now" and the ratings placeholder note with the access tier and its enforcement.
  - Add the data-model bullets: `course_reviews` + rating columns/trigger, `tutor_follows`, `lesson_resources`, and `private.can_open_lesson`.
  - Add the `lesson-resource` function and `_shared/`, and the resources part of the upload script.
- **Store config:** `store.config.json` review notes and description mention Premium courses; remind the user, since the file is git-ignored.

## Verification
- `NODE_OPTIONS=--max-old-space-size=2048 npx tsc --noEmit` and `npx expo lint` pass (stop the user's Metro only if memory requires it, with their OK). Supabase advisors show no new warnings.
- **SQL as the test account** (Clerk session token, local script printing only statuses):
  - Enrolling in a premium course while not Pro → refused.
  - A free course → OK.
  - A non-preview lesson of premium Advanced Mobile Animations (already enrolled, not Pro) → content hidden.
  - With a temporary 15-minute `premium_entitlements` row → visible.
  - Reviews only when enrolled, one per course; rating columns update on insert, update and delete.
  - Follows only own rows.
  - `lesson-resource`: no token → 401; locked → 404; open → 200, with a signed link returning the file with `Content-Disposition: attachment`.
- **Samsung (Argent):**
  - Explore shows "New" and "Free" / "Included in Premium".
  - React Native Basics (free): enroll → rate 4★ with a comment; the badge shows 4.0 (1), and editing to 5★ updates it. Follow → Following, which survives a restart.
  - A premium course, not Pro: "Unlock with Premium" opens `/premium`.
  - Advanced Mobile Animations lessons 2+ show the Premium lock; lesson 1 (preview) still plays.
  - A lesson with resources shows file cards; tapping opens the download.
  - Clean up the test review and follow afterwards.
- **Not testable here:** iOS (no Mac); a real Pro purchase (Test Store only).

## Result
- **Built:**
  - Migration `20261102134602_course_data.sql`: `courses.access` with enforcement through `private.can_open_lesson` (lesson contents, progress, resources), `private.can_use_quiz` and the enrollment policy; `course_reviews` + `courses.rating_average/rating_count` (trigger `private.refresh_course_rating`) + `private.touch_updated_at`; `tutor_follows`; `lesson_resources`.
  - The Premium update is in the migration and in `seed.sql`.
  - Edge Functions: `_shared/common.ts`, `lesson-video` (refactored), `lesson-resource` (new); both deployed.
  - Services `courses` / `reviews` / `follows` / `lessons`; hooks `reviews/`, `follows/`, `useLessonResourceUrl`; `useSyncPremium` refreshes courses and lessons.
  - Helpers `format-number.ts` and `course-rating.ts`; `placeholder-stats.ts` deleted.
  - Screens: rating badges, Free/Premium pricing, `RateCourseSheet`, Follow, premium enroll flow, `resource-card.tsx`, Premium lock copy.
  - `/design-system` previews: the "New" badge and a resource card.
  - Resources: `lesson-videos.json` has per-chapter `resources`, and the upload script uploads them and writes `lesson_resources`. That's 11 files (CC0/CC BY/CC BY-SA/PD) and 33 rows across 24 lessons.
  - `README.md` rewritten.
- **Changes from the plan:**
  - **The resource rows were applied with the Supabase MCP `execute_sql`**: `db push` only updates the hash of a seed file it already applied and doesn't re-run it. Recorded in AGENTS.md.
  - **No "Your rating" in the badge itself:** a separate row under the info card instead.
  - **Credits are plain text** under each file card (`File: "…" by …, licence, via Wikimedia Commons.`).
- **Verified as the test account through the real API** (`scratchpad/verify16.mjs`, a Clerk session token, outcomes only), 20 checks:
  - Premium enroll without Pro → 403 `42501`; free enroll → 201; premium lesson content hidden when enrolled without Pro.
  - With a temporary 15-minute Pro row: the content is visible and premium enroll → 201.
  - Rating: insert → 4.0 (1), update → 5.0 (1), delete → null (0); a course not enrolled in → 403; a second review → 409.
  - Follow own → 201; on someone else's behalf → 403.
  - `lesson-resource`: no token → 401; a preview lesson's file → 200 `application/pdf` with `attachment; filename=…`; a locked lesson's files hidden.
  - Test data removed afterwards (only the account's original enrollment remains).
  - tsc and lint pass; the Supabase security advisor is clean, and performance shows only INFO unused indexes, 2 of them new FK indexes.
- **Not verified:** the Samsung walk-through (the phone was disconnected); iOS.
- **Estimated values (no design):** the rate sheet (stars `2xl`, `gap-2`, comment `min-h-[96px]`), the "Rate this course" row (`-mt-4 mb-8`, `bg-subtle`, `rounded-2xl`), and the resource card (48 icon tile `bg-primary-tint`, `rounded-xl`; caption `footnote` italic).
