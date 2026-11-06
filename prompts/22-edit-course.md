# 22 · Edit a course (tutor)

Status: done

## Goal
On `/tutor/course/[id]` a tutor edits their course's details, builds its outline (chapters and lessons: add, rename chapters, reorder, delete), publishes or unpublishes it, and can delete it. Tapping a lesson opens the lesson editor (still a placeholder).

## Decisions
- **Scope (user decision):** details + outline + publish/unpublish + delete course. Lesson content (title edits, notes, video, resources, preview flag) and quiz editing come in later plans; quizzes show read-only ("1 quiz") under their chapter.
- **Publish rule (user decision):** at least one chapter with one lesson; checked in the database too. The button is disabled with "Add a lesson to publish." until then.
- **Live courses (user decision):** everything stays editable while published. Deleting a chapter, lesson or the course, and unpublishing, ask first in a confirm sheet that says what learners lose (deletes cascade: progress, quizzes and attempts of what's deleted; unpublishing hides the course from everyone but the tutor).
- **Who may edit (server):** `private.owns_course(course_id)` (definer, stable): the JWT has `metadata.role = 'tutor'` and the course's tutor row has `profile_id` = JWT `sub`. Every write RPC calls it and raises `42501` otherwise (→ `NotAllowedError`). Same role check as `create_course` (prompts/21).
- **Reading drafts:** the three SELECT policies on `chapters`, `lessons` and `quizzes` become one policy each, "Read published or own …" (published course, or `private.owns_course`), replacing the learner-only ones (no double permissive policies). `lesson_contents`, questions and answers are unchanged (later plans).
- **Writes are RPCs only** (definer in `private`, invoker wrappers in `public`, execute for `authenticated`), like `create_course`; no insert/update/delete policies are added:
  - `update_course(p_course_id, p_title, p_subtitle, p_description, p_category, p_level, p_access)`: same limits as `create_course` (title 3–80, subtitle ≤ 120, description 20–2000, known level/access/category); the slug never changes.
  - `set_course_published(p_course_id, p_published)`: publishing needs ≥ 1 lesson (`22023` "Add a lesson before publishing").
  - `add_chapter(p_course_id, p_title)` → id (position = last + 1); `rename_chapter(p_chapter_id, p_title)`; `delete_chapter(p_chapter_id)`; `move_chapter(p_chapter_id, p_direction)` (−1 up / +1 down, swaps with the neighbour through a temporary negative position because of `unique (course_id, position)`; no-op at the ends).
  - `add_lesson(p_chapter_id, p_title)` → id (position = last + 1, `duration_seconds` 0, not preview, plus an empty `lesson_contents` row); `delete_lesson(p_lesson_id)`; `move_lesson(p_lesson_id, p_direction)` (within its chapter).
  - Chapter and lesson titles 2–80 characters (`22023`). Deletes renumber the remaining positions 1..n.
  - Deleting the course keeps the existing `deleteCourse` service and RLS delete policy (its tutor), plus `useDeleteCourse`.
- **Data in the app:** `getTutorCourse(supabase, id, signal)` in `src/services/tutor.ts` (details + chapters → lessons (id, title, position, duration, is_preview) and quizzes (id, title), sorted by position; `null` when not found/not readable); hook `useTutorCourse(id)`, key `queryKeys.courses.tutor(id)`. One hook per write in `src/lib/queries/tutor/` (`useUpdateCourse`, `useSetCoursePublished`, `useAddChapter`, `useRenameChapter`, `useMoveChapter`, `useDeleteChapter`, `useAddLesson`, `useMoveLesson`, `useDeleteLesson`), each invalidating `courses.all` (and `enrollments.all` for deletes/unpublish).
- **Screen** (`src/screens/tutor/edit-course-screen.tsx`, no design, from the tokens):
  - Header: Back, "Edit course", and the Published/Draft badge.
  - **Details:** the New course fields, moved into a shared `CourseDetailsFields` component (`src/screens/tutor/course-details-fields.tsx`) that both screens use; "Save changes" enabled only when something changed; red borders + one toast (`reportInvalid`).
  - **Outline:** a card per chapter: "Chapter 01" badge, title, a row of small icon buttons (rename, up, down, delete), then its lessons (title, "Preview" when set, up/down/delete; tap → `/tutor/course/[id]/lesson/[lessonId]`), "Add lesson", and its quiz count. "Add chapter" at the end. Empty outline: "No chapters yet. Add one to start building your course."
  - Add/rename open `TitleSheet` (a `Sheet` with one `TextField` + Save); deletes/unpublish open `ConfirmSheet` (title, consequence text, danger button). Both live in `src/screens/tutor/`.
  - **Publishing:** status text and "Publish course" / "Unpublish"; disabled with the reason when there's no lesson.
  - **Delete course:** a danger button at the bottom → confirm → `router.replace("/tutor")` + toast "Course deleted".
  - States: loading spinner; error + "Try again"; not found/not yours: "This course isn't available." + Back. Every mutation drives its button's `loading` and ends in a toast (`NotAllowedError` → "You're not allowed to change this course.", else the connection message).
  - The New course screen switches to `CourseDetailsFields` with no visible change.

## Out of scope
Lesson editing (title, notes, video, resources, preview, duration), quiz editing, cover upload, drag-and-drop reordering, new categories, tutor profile editing.

## Steps
### 1. Migration
`npx supabase migration new edit_course < /dev/null`: `private.owns_course`, the three merged SELECT policies, and the RPCs above. `npm run db:push`, `npm run db:types`, both advisors (no new warnings).

### 2. Services and hooks
`src/services/tutor.ts` (`TutorCourseDetails`, `getTutorCourse`, one function per RPC; `42501` → `NotAllowedError`), keys, hooks, `index.ts`.

### 3. Shared fields
Move the New course fields into `course-details-fields.tsx`; the New course screen keeps working unchanged.

### 4. Edit screen
`edit-course-screen.tsx`, `title-sheet.tsx`, `confirm-sheet.tsx`, `outline-chapter-card.tsx`.

## Verification
- `tsc`, `expo lint`, advisors pass.
- SQL in rolled-back transactions: the owner (role tutor) adds/renames/moves/deletes chapters and lessons with positions staying 1..n; publishing an empty course raises 22023, with a lesson it works; another tutor or a user without the role gets 42501 on every RPC; learners still can't read a draft's chapters; the owner can.
- Phone (Onboarding Tester): open a draft from the dashboard, edit details and save, add two chapters and lessons, reorder, rename, delete one, publish, unpublish (confirm), delete the draft (confirm), back on the dashboard. Pharmacy Exam Prep opens with its 17 chapters and quiz counts. Test drafts are removed afterwards (asked first).

## AGENTS.md updates
- Route groups: `tutor/course/[id]` is the course editor.
- Data model / courses: `private.owns_course`, the merged "published or own" SELECT policies on chapters/lessons/quizzes, and the outline RPCs (writes only through RPCs; positions kept 1..n).

## Result
- **Migration** `20261106103015_edit_course.sql`: `private.owns_course`, `private.require_course_owner`, `private.check_outline_title`, the three merged SELECT policies and nine RPCs (definer in `private`, invoker wrappers in `public`, `authenticated` only). Pushed, types regenerated; advisors: security clean, performance only the existing unused-index notices.
- **SQL checks** (one rolled-back transaction): publishing an empty course → `22023 Add a lesson before publishing`; three chapters, three lessons, a move up, a move down, a rename and two deletes left `One@1, Two renamed@2` and `L-a@1, L-c@2`; publish and unpublish worked with a lesson; `update_course` changed every field; another tutor got `42501` on add and update and couldn't read the draft's chapters; the owner without the Clerk role got `42501`; a 1-character title → `22023`; learners still read published outlines. `lesson_contents` of a draft reads 0 rows for its tutor (expected; the lesson editor plan adds that).
- **App:** `getTutorCourse` + one service per RPC in `src/services/tutor.ts` (each `await … .throwOnError()` inside `try`, `42501` → `NotAllowedError`; a shared wrapper broke the lint rule, so each function catches itself); `useTutorCourse` (key `courses.tutor(id, userId)`) and nine mutation hooks invalidating `courses.all` (+ `enrollments.all` for deletes/unpublish); `course-details-fields.tsx` (New course now uses it), `title-sheet.tsx`, `confirm-sheet.tsx`, `outline-chapter-card.tsx`, `edit-course-screen.tsx`. Server rule messages (`22023`) are shown as the toast text.
- **Changed while building:** the Access note under the chips now reads only "Premium courses need Syllo Pro to enroll." on both screens (the old "You can change this before publishing" didn't fit a published course).
- **Estimated values (no design):** section headings `heading`; outline actions 32px `rounded-lg` icons at `sm`, dimmed to 0.3 when unavailable; lesson rows `py-2` with hairline borders; the delete-course button sits last in the scroll.
- **Not checked on the phone:** it wasn't connected.
