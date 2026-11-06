# 26 · Course learners page (tutor)

Status: done

## Goal
From a course's overview, a tutor opens **Learners** and sees who is enrolled (name, photo, when they joined, progress), with summary numbers, search, sorting and the option to remove a learner.

## Decisions
- **Route:** `/tutor/course/[id]/learners` (`src/screens/tutor/course-learners-screen.tsx`), opened by tapping the overview's **Learners** tile (it becomes a button with a chevron) and a "View learners" link under the tiles.
- **Per learner (user decision):** display name and photo from their Syllo `profiles` row (`full_name`, `avatar_url`; initial `Avatar` when there's no photo, "Learner" when there's no name), the enrol date ("Joined 3 Nov 2026"), and progress: lessons done out of the course's lessons with a small `ProgressBar` ("3/9 lessons", or "Completed"). A quiz-only course (no lessons) shows "Quiz-only course" and no bar. **No emails or contact details.**
- **Extras (user decision):**
  - **Summary:** three tiles: Learners (total), New this week (joined in the last 7 days), Completed (all lessons done; "—" for quiz-only courses).
  - **Search** by name (`SearchField`, case-insensitive, in the app).
  - **Sort** chips: Newest (default), Name A–Z, Most progress.
  - **Remove a learner:** trash icon → `ConfirmSheet` ("Remove <name>? They lose access to this course. Their progress is kept if they enrol again."). Deletes the enrolment only; `lesson_progress` stays.
- **Database (migration `course_learners`)**, RPC-only like the rest of the tutor side (`private.require_course_owner`: tutor role in the JWT + owner, else `42501`):
  - `course_learners(p_course_id)` returns rows `(user_id, full_name, avatar_url, enrolled_at, lessons_done, lessons_total)`: the course's `enrollments` joined to `profiles`, with `lessons_done` = the learner's `lesson_progress` rows for this course's lessons. Definer in `private`, invoker wrapper in `public`, `authenticated` only. Learners' own access is unchanged; no new table policies.
  - `remove_learner(p_course_id, p_user_id)` deletes that enrolment (`22023` if they aren't enrolled).
- **Drafts:** learners can only enrol in published courses, so a draft shows "Publish the course so learners can enrol." instead of the list.
- **App data:** `getCourseLearners` and `removeLearner` in `src/services/tutor.ts`; hooks `useCourseLearners(courseId)` (key `queryKeys.courses.learners(courseId)`) and `useRemoveLearner` (invalidates `courses.all` and `enrollments.all`). Search, sort and the summary are computed in the screen.
- **States:** loading, error + "Try again", empty ("No learners yet." / no search matches: "No learners match "<text>".").
- No design: built from the tokens like the other tutor screens.

## Out of scope
Messaging learners, exporting the list, per-learner detail pages, quiz scores, paging (lists are small for now; revisit past a few hundred).

## Steps
1. Migration `course_learners` (the two RPCs); `db:push`, `db:types`, advisors.
2. Service, key, hooks.
3. Screen + route `course/[id]/learners.tsx` (registered in `tutor/_layout.tsx`); make the overview's Learners tile open it.

## Verification
- `tsc`, `expo lint`, advisors.
- SQL (rolled back): as the owner, a course with an enrolled learner returns them with the right `lessons_done`; another tutor and a learner without the role get `42501`; `remove_learner` deletes the enrolment and keeps `lesson_progress`.
- Phone: overview → Learners; summary, search, sort; remove a learner (a test enrolment, created and checked with you first).

## AGENTS.md updates
- Route groups: `tutor/course/[id]/learners`.
- Data model / enrollments: tutors read their course's learners only through `course_learners` (names, photos, dates, progress; no emails) and remove them with `remove_learner`.

## Result
- **Migration** `20261106150225_course_learners.sql`: `course_learners(p_course_id)` and `remove_learner(p_course_id, p_user_id)` (definer in `private`, owner-checked with `private.require_course_owner`, invoker wrappers). Types regenerated; advisors: security clean, performance only the existing unused-index notices.
- **SQL checks** (rolled back): as the owner of Python for Everyone (Jane Doe with the role in the token), the list returned "Onboarding Tester 2/10 since 05 Nov" (two progress rows were seeded in the transaction); `remove_learner` left 0 learners and kept both progress rows; removing again → `22023`; another tutor and the owner without the role → `42501`; Pharmacy Exam Prep (Onboarding Tester) returned 0 learners.
- **App:** `getCourseLearners`/`removeLearner` (tutor.ts; the generated types call `full_name`/`avatar_url` non-null, but they come from a left join, so the service treats them as nullable), key `courses.learners(id)`, hooks `useCourseLearners`/`useRemoveLearner`; `course-learners-screen.tsx` + route `course/[id]/learners.tsx` (registered); the overview's Learners tile is now a button with a chevron that opens it.
- **Screen:** "Learners" + course title; tiles Learners / New this week / Completed ("—" for quiz-only); name search; sort chips Newest / Name A–Z / Most progress; rows with `Avatar`, name ("Learner" when unnamed), "Joined 3 Nov 2026", progress bar + "3/9 lessons" / "Completed" (or "Quiz-only course"), trash → `ConfirmSheet`; pull to refresh; drafts with no learners: "Publish the course so learners can enrol."; empty and no-match messages.
- **Changed while building:** "New this week" counts back from when the list was fetched (`dataUpdatedAt`), because the React Compiler lint forbids `Date.now()` during render. The planned extra "View learners" link was left out: the tappable tile is enough.
- **Checks:** `tsc` and `expo lint` pass. **Not checked on the phone** (it wasn't connected).
- **Estimated values (no design):** summary tiles `p-3` in one row of three; learner rows `p-3 rounded-2xl` with a 40px avatar.
