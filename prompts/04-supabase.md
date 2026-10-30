# 04 · Supabase: project, CLI, Clerk integration, tables, RLS and seed

Status: done

## Goal
Syllo has a hosted Supabase project that trusts Clerk sessions. The repo holds the database as code (`supabase/` with migrations and a seed), managed with the Supabase CLI. The app has a typed `useSupabase()` client that sends the Clerk session token. The tutorial's tables (Profiles, Courses, Chapters, Lessons, Enrolments, plus Tutors from the data model) exist with row-level security and sample courses. Each signed-in learner gets a profile row, and Home proves the connection by showing how many courses are available.

## Decisions
- **Sources:** the tutorial's Notion page (Supabase section, read through Notion's page-data API), Supabase's "Clerk" third-party auth guide, Clerk's "Integrate Supabase with Clerk" guide, and Supabase's Expo guides.
- **Hosted project (user choice):** create **syllo** in the org "awolowodaniel@yahoo.ie's Org" (`ahbhgyuptetukbjfpupw`, free plan) in **eu-west-2 (London)** through the Supabase MCP. There is no local Docker stack for now: Docker isn't running and the machine is short on memory. `supabase/config.toml` still carries the Clerk provider, so `npx supabase start` works later with no schema changes.
- **CLI:** install it as a dev dependency with `npm i -D supabase`, as the docs recommend, so `npx supabase` is pinned. It's a CLI, not an app library, so this is the one place `npm i` is used instead of `npx expo install`. Then:
  - `npx supabase init` creates `supabase/config.toml`.
  - You log in once with `! npx supabase login` (browser).
  - `npx supabase link --project-ref <ref>`.
  - Migrations live in `supabase/migrations/` and are applied with `npx supabase db push`; `supabase/seed.sql` holds the sample data.
  - npm scripts: `db:push` (`supabase db push --include-seed`) and `db:types` (`supabase gen types typescript --linked > src/lib/database.types.ts`).
  - The CLI writes `supabase/.temp/` and `.branches/`. Add them to `.gitignore`, and add `supabase/` to `.easignore`, since app builds don't need it.
- **Clerk ↔ Supabase (the current native integration, not the deprecated JWT template):**
  - Clerk: add the session claim `role: "authenticated"` with the Clerk MCP `patch_instance_config` → `session.claims` (dry run first). This is the same change as the dashboard's "Activate Supabase integration".
  - Supabase: add Clerk as a third-party auth provider with the domain `still-mastiff-2250.clerk.accounts.dev` (the dev instance). In `config.toml`: `[auth.third_party.clerk] enabled = true, domain = "still-mastiff-2250.clerk.accounts.dev"`, applied to the hosted project with `npx supabase config push`. If the CLI can't push it, it's a 1-minute dashboard step for you (Authentication → Sign In / Providers → Third-party → Clerk).
  - Supabase Auth itself isn't used: no Supabase sign-in and no Supabase sessions.
- **App client (the tutorial's `lib/supabase.ts`):**
  - `npx expo install @supabase/supabase-js`.
  - `src/lib/supabase.ts` exports `useSupabase()`: `createClient<Database>(url, publishableKey, { accessToken: async () => (await getToken()) ?? null })`, memoized on `getToken`.
  - No AsyncStorage or secure storage is needed, because Clerk owns the session.
  - Env: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (the modern `sb_publishable_…` key, from the MCP `get_publishable_keys`) in `.env.local`, with the names in `.env.example`. No service-role key anywhere in the app.
  - If supabase-js needs a URL polyfill on React Native 0.88 (it shouldn't), add `react-native-url-polyfill`. That would be a new dependency, so I'd ask first.
- **Schema (`supabase/migrations/<timestamp>_init.sql`):** the tutorial's tables, with Tutors from `AGENTS.md`'s data model. Ids are `uuid` (`gen_random_uuid()`), except profile/user ids, which are the Clerk user id (`text`, from `auth.jwt()->>'sub'`).
  - `profiles`: `id text pk default auth.jwt()->>'sub'`, `full_name text`, `avatar_url text`, `created_at`, `updated_at`.
  - `tutors`: `id uuid pk`, `name text not null`, `headline text`, `bio text`, `avatar_url text`, `profile_id text unique null references profiles on delete set null` (Part 2 links a tutor to a Clerk user), `created_at`.
  - `courses`: `id uuid pk`, `slug text unique not null`, `title text not null`, `subtitle text`, `description text`, `cover_image_url text`, `category text`, `level text check in ('beginner','intermediate','advanced')`, `tutor_id uuid not null references tutors`, `is_published boolean not null default false`, `created_at`.
  - `chapters`: `id uuid pk`, `course_id uuid not null references courses on delete cascade`, `title text not null`, `position int not null`, `unique (course_id, position)`.
  - `lessons` (the outline): `id uuid pk`, `chapter_id uuid not null references chapters on delete cascade`, `title text not null`, `position int not null`, `duration_seconds int not null default 0`, `is_preview boolean not null default false`, `unique (chapter_id, position)`.
  - `lesson_contents` (what enrolling unlocks): `lesson_id uuid pk references lessons on delete cascade`, `video_url text`, `body text`. These are kept apart from `lessons` so RLS can show the outline but hide the content.
  - `enrollments` (the tutorial's "Enrolments"): `id uuid pk`, `user_id text not null default auth.jwt()->>'sub' references profiles on delete cascade`, `course_id uuid not null references courses on delete cascade`, `created_at`, `unique (user_id, course_id)`.
  - An index on every foreign key, plus `updated_at` kept current by a trigger on `profiles`.
- **RLS (user choice: outline free, lessons after enrolling).** RLS is on for every table, and every policy is `to authenticated`; anonymous users read nothing. Comparisons use `(select auth.jwt()->>'sub')`, as in the Clerk docs.
  - `profiles`: a learner can select, insert and update only their own row (`id = sub`), and can delete it.
  - `tutors`: anyone signed in can select.
  - `courses`: anyone signed in can select published courses.
  - `chapters` / `lessons`: anyone signed in can select them when their course is published.
  - `lesson_contents`: select when the lesson's course is published **and** (the lesson `is_preview` **or** the learner has an enrollment in that course).
  - `enrollments`: a learner can select and delete their own rows, and insert their own (`user_id = sub`) only for a published course.
  - There are no write policies on course content: tutors write content in Part 2, and the seed runs as the owner.
  - Explicit `grant select` (and the needed writes) to `authenticated` on each table, so the Data API exposes them whatever the project's default privileges are.
  - After applying, the Supabase security and performance advisors must show no new warnings.
- **Seed (`supabase/seed.sql`, "ask the AI to create seed files"):**
  - 3 tutors and 6 published courses (e.g. React Native basics, UI design, Python, data science, photography, public speaking), mixed levels and categories.
  - 3–4 chapters each, 3–5 lessons per chapter, with realistic durations and the first lesson of each course marked as a preview.
  - Content: short markdown bodies, and video URLs from Google's public sample videos (`commondatastorage.googleapis.com/gtv-videos-bucket/sample/…`).
  - Covers and tutor avatars use remote placeholder images (`picsum.photos` with a fixed seed per course), as `AGENTS.md` allows.
  - Fixed uuids, so the seed can run again safely (`on conflict do nothing`).
- **Profiles sync (user choice: the app upserts):**
  - `src/lib/use-sync-profile.ts`, mounted once in `(app)/_layout.tsx`. When the signed-in user's id, full name or photo (`profileImageUrl`) changes, it upserts `{ id, full_name, avatar_url }`.
  - Failures are logged and retried on the next change, with no toast: the app still works without it.
  - Deleting the account (prompts/03) first deletes the learner's `profiles` row (enrollments cascade), then calls `user.delete()`. If the row delete fails, the Clerk user is not deleted, and a toast reports it.
- **Types:** `src/lib/database.types.ts` is generated (MCP `generate_typescript_types` or `npm run db:types`) and committed. Regenerate it after every migration.
- **Proof in the app:** Home shows "{n} courses available" from `supabase.from("courses").select("id", { count: "exact", head: true })`, with loading ("Loading courses…") and error ("Couldn't load courses." plus Retry) states. It's replaced by the real Home design later.
- **New dependencies:** `@supabase/supabase-js` (app) and `supabase` (dev, CLI). New service: the Supabase project, which you asked for.

## Out of scope
- Course screens (browse, details, enroll, player): the following feature plans, built from the designs.
- Lesson progress tracking (a `lesson_progress` table comes with the player).
- Tutor writes and course authoring (Part 2), Storage buckets for uploads, Realtime, Edge Functions, Clerk webhooks.
- The local Docker stack (config ready, not started), Supabase branching, and the production Clerk instance (its domain must also be added to Supabase then).

## Steps
### 1. Supabase project and CLI
Create the project with the MCP (`create_project`, after `get_cost` confirms $0) and wait until it's `ACTIVE_HEALTHY`. `npm i -D supabase`, then `npx supabase init`. **You:** `! npx supabase login`. Then `npx supabase link --project-ref <ref>`. Update `.gitignore` and `.easignore`. Done: `npx supabase projects list` shows syllo as linked.

### 2. Clerk integration
Clerk MCP dry run, then apply `session.claims: { role: "authenticated" }`. Add `[auth.third_party.clerk]` to `config.toml` and `npx supabase config push` (or the dashboard fallback). Done: the Clerk config shows the claim, and Supabase lists Clerk under third-party auth.

### 3. Schema and RLS
Write `supabase/migrations/<ts>_init.sql` as in Decisions, then `npx supabase db push`. Run the advisors (security and performance) and fix any warning in a follow-up migration. Done: `list_tables` shows the 7 tables with RLS on, and the advisors are clean.

### 4. Seed
Write `supabase/seed.sql` and apply it (`npx supabase db push --include-seed`, or the MCP `execute_sql` if the CLI refuses a remote seed). Done: the counts match (3 tutors, 6 courses, chapters, lessons, contents).

### 5. App client and types
`npx expo install @supabase/supabase-js`; env vars in `.env.local` and `.env.example`; `src/lib/supabase.ts`; generate `src/lib/database.types.ts`; npm scripts `db:push` and `db:types`. Done: `tsc` passes.

### 6. Profiles sync, delete-account cleanup, Home proof
`use-sync-profile.ts` in `(app)/_layout.tsx`; the delete-account sheet deletes the profile first; Home shows the course count with loading and error states. Done: signing in creates a `profiles` row (checked with the MCP `execute_sql`), and Home shows "6 courses available".

### 7. Close out
Lint, type check, advisors, the RLS checks below, `AGENTS.md`, `## Result`.

## Verification
- `npx tsc --noEmit` and `npx expo lint` pass. Supabase advisors show no security or performance warnings.
- RLS, checked with SQL as the `authenticated` role and a fake `sub` (`set local role authenticated; set local request.jwt.claims = '{"sub":"user_test","role":"authenticated"}'`):
  - Courses, chapters and lessons are readable; an unpublished course is not.
  - `lesson_contents` returns only preview lessons until an enrollment exists for `user_test`, then the whole course.
  - Inserting an enrollment for another `user_id` fails.
  - `profiles` returns only `user_test`'s row.
  - As `anon`, every table returns nothing.
- In the app (web, then your phone in Expo Go): sign in → Home shows "6 courses available". `profiles` has your row with your name and photo URL. Changing your name on Account updates the row.
- End to end: sign up a test learner → profile row created → delete the account → the profile row is gone and sign-in returns to the sign-in screen.

## AGENTS.md updates
- **Who owns what → Data:** replace "decided in its plan" with the setup:
  - The hosted project (ref, London, free).
  - The CLI (`supabase/` migrations and seed, `npm run db:push` / `db:types`, `npx supabase link`).
  - Clerk as a third-party provider (`role: authenticated` session claim; the domain must be added for the production instance later).
  - `useSupabase()` in `src/lib/supabase.ts` (Clerk token via `accessToken`), with typed `Database`.
  - The RLS rules (outline readable, `lesson_contents` only for previews or enrolled learners, own rows only, `(select auth.jwt()->>'sub')`).
  - Profiles upserted by `useSyncProfile`, and account deletion removing the profile first.
- **Data model:** the real tables and the outline/content split.
- **Commands:** `npm run db:push`, `npm run db:types`, `npx supabase migration new <name>`.
- **Rules:** every schema change is a migration file in `supabase/migrations/` (never edit the hosted schema by hand); regenerate types after each; run the advisors after DDL.

## Result
Built as planned. Hosted project **syllo** `qlpbjfzyvfyrrpcisnpu` (London, free) created with the MCP; the Supabase CLI (2.122, dev dependency) is initialised, logged in and linked. Clerk session tokens carry `role: authenticated`; Clerk is a third-party provider in Supabase. Two migrations (`init`, `rls_initplan`) and `seed.sql` are applied with `db push`; `useSupabase()`, generated types, `useSyncProfile`, the delete-account cleanup and Home's course count are in the app.

Changes from the plan:
- `supabase config push` wasn't used: its diff showed it would overwrite 13 hosted auth/pooler settings with local-dev defaults and doesn't manage third-party auth, so you added the Clerk provider in the dashboard. `config.toml` still declares it for a future local stack.
- A second migration rewrote the 8 user-id policies as `((select auth.jwt()) ->> 'sub')`: the performance advisor flags `(select auth.jwt() ->> 'sub')`.
- If Clerk's delete doesn't happen, the deleted profile is restored (enrollments are not).
- The advisor's two INFO "unused index" notices stay: the indexes back foreign keys and the tables are new.

Verified: `tsc` and `expo lint` pass; security advisor clean, performance advisor only INFO; RLS checked in SQL as `authenticated` with a fake `sub` (outline 6/19/58, contents 6 previews → 15 after enrolling, foreign/draft/other-profile writes blocked, anon blocked) and end to end over the Data API with a real Clerk session token for a temporary Clerk user (6 courses, own profile upsert 201, enroll 201, contents 6 → 15, no token 401), then the test user and rows were deleted. Not run: the app itself on web or a phone (memory on this PC).
