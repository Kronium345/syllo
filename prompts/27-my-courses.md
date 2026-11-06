# 27 · My Courses tab with real data

Status: done

## Goal
My Courses lists every course the learner is enrolled in, with its progress. Filter chips switch between All, In progress and Completed. From a course, the learner can resume the next lesson, open the course, or leave it.

## Decisions
- **Layout (user):** the "My Courses" title-xl header (unchanged), then filter chips **All · In progress · Completed**, each with a count ("In progress 3"; `Chip role="radio"`).
  - Below the chips, full-width rows in a `FlatList`.
  - Not in the design, so it's built from its tokens. Estimated values go in the Result.
- **Row:**
  - **Top part:** a `Card` with a 96×54 cover (`useCourseCover`, `rounded-xl`, `bg-track`), the title (`card-title`, 2 lines), and "by Syllo Team" (footnote). A "Premium" `Badge` shows for premium courses, and a ⋯ `IconButton` sits on the right.
  - **Progress line:** a `ProgressBar sm` with "3/9 lessons", or "Completed" (`success-deep`), or "17 quizzes" for quiz-only courses (no bar).
  - **Action button:** full-width `outline`.
  - Tapping the row (outside the button and ⋯) opens `/course/[id]`.
- **Action button:**
  - "Start Lesson" when no lesson is done, "Continue Learning" when some are done, and "Review Course" when the course is completed.
  - Quiz-only courses: "Open Course".
  - Start and Continue open the next lesson (`nextLesson` from `useCourseDetails(id)`, loaded per row; busy while it loads). Review, Open and a details error open the course page.
- **Lapsed Pro (user):** a premium course while `usePremium().data === false` shows "This is a Premium course. Upgrade to keep learning." (footnote, `danger-deep`). The button reads "Upgrade to Premium" and opens `/premium`.
  - `usePremium` is undefined on web and while loading, so nothing is shown then. RLS stays the real guard.
- **Groups:**
  - Completed = has lessons and every lesson is done.
  - In progress = everything else, including not-started courses and quiz-only courses, which have no "completed" state.
- **Sort (user):** most recently studied first (`lastStudiedAt`). Courses never studied follow in enrolment order, newest first, which is the service's order (stable sort).
- **Leave a course (user):**
  - ⋯ opens a `Sheet` (title = course title) with "Open course" and "Leave course" (danger) rows.
  - Leave opens the confirm sheet: "Leave course?" / "You'll lose access to {title}. Your progress is kept if you enrol again." / "Leave course".
  - Success shows the toast "Left course" with the course name. A failure shows a connection-error toast, and `NotAllowedError` as "not allowed".
  - The database already allows it (policy "Learners leave their own courses"), so **no migration**.
- **New service:** `leaveCourse(supabase, courseId)` in `src/services/courses.ts`. It runs `delete().eq("course_id", id).select("id").throwOnError()`; no rows back throws `NotAllowedError`.
- **New hook:** `useLeaveCourse` in `src/lib/queries/enrollments/use-leave-course.ts`. It invalidates `enrollments.all`, `courses.details(id)`, `courses.students(id)` and `lessons.all`, like `useEnroll`.
- **`ConfirmSheet` moves** from `src/screens/tutor/` to `src/components/ui/confirm-sheet.tsx`, since it's now used on 2+ screens. The 7 tutor imports are updated, and it's added to `/design-system`.
- **States:**
  - Loading: a spinner.
  - Error: "Couldn't load your courses." + "Try again".
  - Empty (no enrolments): the existing empty state, with "Explore courses".
  - A filter with no matches: "No completed courses yet." / "Nothing in progress." in the body.
  - Pull to refresh refetches enrolments + progress (`useLearningStats().refetch`).

## Out of scope
- Certificates, downloads, and archiving or hiding courses.
- Search inside My Courses.
- Changing Home's "Your courses" row.

## Steps
### 1. Move ConfirmSheet
Move `src/screens/tutor/confirm-sheet.tsx` to `src/components/ui/confirm-sheet.tsx`, update its imports in the tutor screens, and add a preview to `/design-system`.

### 2. Leave course data
Add `leaveCourse` to `src/services/courses.ts`, then `use-leave-course.ts`, and export it from `enrollments/index.ts`.

### 3. My Courses screen
Rewrite `src/screens/my-courses/my-courses-screen.tsx`, with the row in `src/screens/my-courses/my-course-row.tsx`, using `useEnrolledCourses` through `useLearningStats`, plus `usePremium`, `useCourseDetails` per row, and `useLeaveCourse`. Follow the Decisions above. The route file stays as it is.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass.
- **Web, at phone width (Onboarding Tester, enrolled in 4 courses):**
  - The list loads, chips show the counts, and the filters work.
  - The sort follows the last study.
  - Start opens the first lesson.
- **Leave:**
  - Leaving a course removes it from the list, and from Home's "Your courses" row.
  - Re-enrolling from Explore brings the progress back.
- **Phone (if connected):** the same flows, plus pull to refresh.
- **Lapsed Pro:** a premium enrolment without Pro shows the upgrade line (Advanced Animations on the tester).

## AGENTS.md updates
- In the Expo flow paragraph, replace "My Courses is still an empty state." with a one-line description of My Courses.
- In the shared UI list (Design system), add `ConfirmSheet`.

## Result
Built as planned and checked on the Samsung (Onboarding Tester, 4 enrolments).

- **Change from the plan:** the chips sit in a horizontal `ScrollView`, not a wrapping row. At the phone's font size, "Completed 0" wrapped onto a second line.
- **Change from the plan:** the tutor line wraps (`flex-wrap`), so a Premium badge no longer cuts "by Syllo Team" short.
- **Checked on the phone:**
  - list, counts and filters, including the empty Completed filter;
  - Start Lesson opens lesson 1;
  - after completing lesson 1, the row shows 1/10 and "Continue Learning", which opens lesson 2 (the test completion was undone afterwards);
  - the lapsed-Pro line and button on Advanced Mobile Animations;
  - ⋯ → Leave course → confirm → the "Left course" toast and the row is gone;
  - re-enrolling from the course page brings it back;
  - pull to refresh puts the newest enrolment first, since nothing has been studied.
- **Estimated values (no design):** row `p-4 gap-4` on `surface` with `rounded-2xl`, a 96×54 `rounded-xl` cover, the ⋯ button at `w-9 h-9`, the outline action button `py-3 rounded-xl`, list `pt-5 gap-3`, and menu rows `py-3.5` with `md` icons.
- **Not checked:** web, and "Review Course" (no test course is fully completed).
