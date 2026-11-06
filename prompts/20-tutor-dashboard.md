# 20 · Tutor dashboard: my courses

Status: done

## Goal
A tutor opens Profile → Manage courses and sees every course they teach (published and drafts), with a "New course" button. Tapping a course opens its (placeholder) editor; "New course" opens the (placeholder) create screen.

## Decisions
- **Ownership:** a tutor's courses are those whose `tutor_id` is the `tutors` row with `profile_id` = the Clerk user. The Clerk role `tutor` (prompts after 19, `useIsTutor`) only gates the UI.
- **Account mapping (user decision at approval, replacing the relink):** for testing, Onboarding Tester (`user_3LVXgRngH4w50mlS219dQgprJKj`, role `tutor`, the phone account) gets its own test tutor row (`md5('tutor:onboarding-tester')`, name "Onboarding Tester") and owns **Pharmacy Exam Prep** only. Syllo Team stays linked to Jane Doe with the other six courses. A data change, not seeded: re-running `exam-prep.sql` moves Pharmacy Exam Prep back to Syllo Team. Learners see "Onboarding Tester" on Pharmacy Exam Prep's tutor card while this lasts.
- **Drafts (user decision):** a migration adds the SELECT policy "Tutors read their own courses" on `courses` (any `is_published`, via `tutors.profile_id = auth.jwt()->>'sub'`), so drafts show once "New course" creates them. Learners still only read published courses.
- **No design for this screen:** built from the design tokens in the app's language (like Profile and Credits); estimated values listed in the Result.
- **Screen layout (default):** header "Your courses" with a Back button; a primary "New course" button (Plus icon) under the header; then a list of cards, newest first. Each card: cover (`courseCover`), title, a status badge (Published / Draft), access ("Free" / "Premium"), level, and "n chapters · m lessons". Student counts are left out (the count function only covers published courses; one call per course isn't worth it yet).
- **States:** loading spinner; error with "Try again"; empty: "You haven't created a course yet." with the New course button; `NotAllowedError` is not expected for reads (RLS returns rows or none).
- **Data:** service `getMyCourses(supabase, userId, signal)` in `src/services/tutor.ts` (courses joined `tutors!inner(profile_id)` filtered by the user id, plus chapter/lesson counts embedded, ordered `created_at desc`, `.throwOnError()`); hook `useMyCourses()` in `src/lib/queries/tutor/` (key `queryKeys.tutor.courses(userId)`, user id from Clerk `useUser`, disabled until loaded). Invalidating `["courses"]` should not be needed now; mutations come with later plans.
- **Roles typing:** the user's `src/types/globals.d.ts` (`Roles = 'user' | 'tutor'`, `CustomJwtSessionClaims`) and `src/types/clerk.d.ts` (`UserPublicMetadata.role`) both exist; this plan leaves them as they are.

## Out of scope
Creating, editing, publishing or deleting courses (the New course and edit screens stay placeholders); learner counts; search or filters on the dashboard; tutor insert/update policies.

## Steps
### 1. Data: relink and policy
- Supabase MCP `execute_sql`: insert the test tutor row for Onboarding Tester and set `courses.tutor_id` of `pharmacy-exam-prep` to it.
- `npx supabase migration new tutor_read_own_courses < /dev/null`: `create policy "Tutors read their own courses" on public.courses for select to authenticated using (exists (select 1 from public.tutors t where t.id = courses.tutor_id and t.profile_id = (select auth.jwt()) ->> 'sub'));` Then `npm run db:push`, `npm run db:types`, both advisors (no new warnings; if the advisor flags multiple permissive SELECT policies, merge the two into one policy instead).

### 2. Service and hook
`src/services/tutor.ts` (`TutorCourse` type: id, title, slug, coverImageUrl, isPublished, access, level, chapterCount, lessonCount, createdAt; `getMyCourses`), `src/lib/queries/tutor/use-my-courses.ts` + `index.ts`, key in `queries/keys.ts`. Lint enforces the layering.

### 3. Screen
`src/screens/tutor/tutor-dashboard-screen.tsx` replaces the placeholder: header, New course button (`router.push("/tutor/course/new")`), `FlatList` of `TutorCourseCard` (`src/screens/tutor/tutor-course-card.tsx`, a pressable `Card` → `router.push({ pathname: "/tutor/course/[id]", params: { id } })`), and the three states. `TutorPlaceholder` stays for the other screens.

## Verification
- `tsc` and `expo lint` pass; advisors show no new warnings.
- SQL as Onboarding Tester (JWT `sub`): reads its course(s) including a temporary unpublished one; as Jane Doe it reads only published ones and none via the tutor filter. Remove the temporary draft afterwards.
- Phone (Onboarding Tester): Profile → Manage courses lists Pharmacy Exam Prep with "Published" badges, covers and counts; New course and a card open their placeholder screens; Back returns to Profile.
- Empty state checked by pointing the query at a user with no tutor row (or temporarily), then restored.

## AGENTS.md updates
- Expo / route groups: `tutor/index` is the dashboard (my courses + New course); the other tutor screens are still placeholders.
- Data model / tutors: test tutor "Onboarding Tester" owns Pharmacy Exam Prep (Syllo Team, Jane Doe, the other six); policy "Tutors read their own courses" lets a tutor read their drafts.
- Data: services `src/services/tutor.ts`, hooks `src/lib/queries/tutor/`.

## Result
- **Data:** test tutor row "Onboarding Tester" (`md5('tutor:onboarding-tester')`, `profile_id` = Onboarding Tester) owns Pharmacy Exam Prep; Syllo Team (Jane Doe) keeps the other six.
- **Policies:** `20261106100134_tutor_read_own_courses.sql` added "Tutors read their own courses"; the advisor flagged two permissive SELECT policies, so `20261106100203_merge_course_read_policies.sql` replaced both with "Read published or own courses" (as planned). Advisors: security clean, performance only the existing unused-index notices. Types regenerated (no change).
- **SQL check** (rolled-back transaction with a temporary draft): Onboarding Tester read Pharmacy Exam Prep + the draft; Jane Doe read her 6 courses and not the draft.
- **App:** `src/services/tutor.ts` (`getMyCourses`, filtered by `tutors.profile_id`, with chapter/lesson/quiz counts), `src/lib/queries/tutor/` (`useMyCourses`), key `courses.mine(userId)` (under `courses`, not a separate `tutor` key as first planned, so course invalidation refreshes it), `tutor-dashboard-screen.tsx`, `tutor-course-card.tsx`. Quiz counts were added to the summary because Pharmacy Exam Prep has 17 chapters, 0 lessons and 17 quizzes.
- **Estimated values (no design):** card 88px square cover, `p-3`, `gap-4`, `rounded-2xl`; Draft badge on `bg-track`.
- **Not checked on the phone:** it wasn't connected.
- **Later:** draft chapters/lessons need tutor read policies when the course editor is built; insert/update policies for New course.
