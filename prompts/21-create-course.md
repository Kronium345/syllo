# 21 · Create a course (tutor)

Status: done

## Goal
A tutor taps "New course" on the dashboard, fills in a short form and saves a **draft** course they own. The app then opens that course's editor (still a placeholder) and the draft appears on the dashboard with a "Draft" badge.

## Decisions
- **Fields (user decision):** Title (required, 3–80 characters), Subtitle (optional, up to 120), Description (required, 20–2000, multiline), Category (one chip from the existing categories, `useCategories()`: Data, Design, Development, Healthcare; required), Level (Beginner / Intermediate / Advanced chips, required), Access (Free / Premium chips, default Free).
- **Cover (user decision):** none on this form. Drafts show the plain `bg-track` placeholder; cover upload comes with the course editor.
- **Server-side check:** Clerk's session token already carries `metadata` = the user's public metadata (instance setting `session.claims.metadata = {{user.public_metadata}}`), so the database checks the role itself: `(select auth.jwt()) -> 'metadata' ->> 'role' = 'tutor'`. Not a tutor → error `42501` → `NotAllowedError` ("You're not allowed to create courses.").
- **One RPC, no direct writes:** `create_course(p_title, p_subtitle, p_description, p_category, p_level, p_access)` returns the new id. Logic in `private.create_course` (SECURITY DEFINER), `public.create_course` a SECURITY INVOKER wrapper (the project's RPC pattern); execute granted to `authenticated` only. No insert policies are added on `courses` or `tutors`.
- **Missing tutor row (user decision):** the RPC creates it on first use (`id` random, `name` = the learner's `profiles.full_name`, else "New tutor"; `profile_id` = JWT `sub`). It needs the `tutor` role, so learners can't make one.
- **Inside the RPC:** trims and validates the same limits as the form (raises `22023` with a message on bad input), checks level/access/category values, sets `is_published = false`, and makes a slug from the title (lowercase, non-alphanumerics → `-`, max 60) plus `-` and 6 random hex characters (retries on the unique violation).
- **Form behaviour (AGENTS rules):** red borders on invalid fields plus one toast (`reportInvalid`), no inline error text. "Create draft" in a `StickyFooter`, showing `loading` while saving. On success: toast "Draft created", `router.replace` to `/tutor/course/[id]`. Other errors: "Couldn't create the course. Check your connection and try again."
- **Cache:** the mutation invalidates `queryKeys.courses.all` (covers the dashboard's `courses.mine`).
- **No design:** built from the tokens like the other forms (Account, sign-up); estimated values go in the Result.

## Out of scope
Cover upload, chapters/lessons/quizzes, editing, publishing, deleting, new categories, tutor profile editing (name/photo/bio).

## Steps
### 1. Migration
`npx supabase migration new create_course < /dev/null` with `private.create_course` + `public.create_course` as above (`set search_path = ''`, fully qualified names), revoke from `public`/`anon`, grant execute to `authenticated`. `npm run db:push`, `npm run db:types`, both advisors (no new warnings).

### 2. Service and hook
`createCourse(supabase, input): Promise<string>` in `src/services/tutor.ts` (`.rpc(...).throwOnError()`, mapping code `42501` to `NotAllowedError`; `NewCourseInput` type). Hook `useCreateCourse()` in `src/lib/queries/tutor/use-create-course.ts`, exported from `index.ts`.

### 3. Screen
`src/screens/tutor/new-course-screen.tsx`: back header "New course", a `ScrollView` with the three `TextField`s and three chip groups (`Chip role="radio"`), category chips from `useCategories()` (loading/error handled in place), `StickyFooter` with "Create draft". Validation helper `src/screens/tutor/validate-course.ts`, limits shared with the SQL numbers above.

## Verification
- `tsc`, `expo lint`, advisors pass.
- SQL: as Onboarding Tester (`metadata.role = tutor`) the RPC creates a draft owned by its tutor row; with no role it raises 42501; bad level/short title raise 22023; a user with the role but no tutor row gets one created. All in rolled-back transactions.
- Phone (Onboarding Tester): New course → empty submit shows red borders + one toast; a valid form creates the draft, opens "Edit course", and Back to the dashboard shows the draft with a "Draft" badge and "0 chapters". The test draft is deleted afterwards (asked first).

## AGENTS.md updates
- Data model / courses: `create_course` RPC (role from the JWT's `metadata.role`, auto-creates the tutor row, drafts only).
- Auth / Roles: the Clerk session token carries `metadata` (public metadata), so RLS/RPCs can check `metadata.role`.
- Expo / route groups: `tutor/course/new` is the create form.

## Result
- **Migration** `20261106101850_create_course.sql`: `private.create_course` (definer) + `public.create_course` (invoker), execute for `authenticated` only. Pushed; types regenerated (`create_course` returns `string`; `p_subtitle` is typed non-null, so the app sends "" for none); advisors: security clean, performance only the existing unused-index notices.
- **SQL checks** (rolled-back transactions): a tutor created `my-first-course-eb8108` (draft, owned by Onboarding Tester, readable by them); a title of 2 characters → `22023 Title must be 3 to 80 characters`; category "Cooking" → `22023 Unknown category`; a user with no role → `42501 Only tutors can create courses`; a tutor with no tutor row got one named from their profile. A tutor row needs a `profiles` row (foreign key); the tutor area is inside the onboarded guard, so real tutors always have one.
- **App:** `createCourse` in `src/services/tutor.ts` (42501 → `NotAllowedError`), `useCreateCourse` (invalidates `courses.all`), `src/screens/tutor/validate-course.ts`, `src/screens/tutor/new-course-screen.tsx` (reuses `reportInvalid` from `src/screens/auth/`).
- **Estimated values (no design):** description field `min-h-[120px]`; chip group labels `caption-strong`, turning `text-danger` when nothing is chosen; the Access footnote sits `-mt-4` under its chips.
- **Not checked on the phone:** it wasn't connected.
