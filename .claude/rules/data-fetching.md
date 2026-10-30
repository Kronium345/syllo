---
paths:
  - "src/**/*.ts"
  - "src/**/*.tsx"
  - "supabase/**"
---

# Data fetching: TanStack Query → hooks → services → Supabase

Every piece of remote data in Syllo moves through three layers. `npx expo lint` enforces most of this (`eslint.config.js`); the rest is on you.

## 1. Services: `src/services/<area>.ts`, the only code that talks to Supabase

- Plain async functions: no React, no hooks, no TanStack (lint-enforced).
- The Supabase client is the first argument, because it carries the learner's Clerk token: `getCourses(supabase, signal?)`, `deleteCourse(supabase, courseId)`. Type it `AppSupabaseClient` from `@/lib/supabase`.
- **End every query with `.throwOnError()`** (lint-enforced for awaited `.from()` / `.rpc()` chains). It rejects with the `PostgrestError` (keeping its `code`) and types `data` as non-null. Never destructure `error` and check it by hand, and never return `{ data, error }` to callers. The only exceptions are calls that have no `.throwOnError()`, such as Storage or Auth; there, throw the returned error yourself.
- Accept an optional `signal?: AbortSignal` on reads and pass it with `.abortSignal(signal)` before `.throwOnError()`, so TanStack can cancel.
- Select explicit columns. `quiz_answers` must never select `is_correct`, and `select("*")` on it is refused by the database.
- RLS doesn't error on a refused write, it affects 0 rows. Writes that can be refused `.select("id")` the rows back and throw `NotAllowedError` (from `@/services/errors`) when none come back.
- Return plain data (types exported from the service file), never query builders.

## 2. Hooks: `src/lib/queries/<area>/use-<name>.ts`, one hook per file

- Each wraps exactly one service in `useQuery` / `useMutation`. They never call `supabase.from()` / `.rpc()` themselves (lint-enforced).
- Get the client with `useSupabase()` and pass it to the service: `queryFn: ({ signal }) => getCourses(supabase, signal)`.
- Query keys come only from `src/lib/queries/keys.ts` (nested factories, e.g. `queryKeys.courses.list()`). Add new keys there; never inline arrays.
- Mutations invalidate every affected key in `onSettled` (a prefix such as `queryKeys.courses.all` covers its children) and may update cached data in `onSuccess` with `setQueryData` for instant UI.
- Re-export each hook (and the service's types screens need) from `<area>/index.ts`; screens import from `@/lib/queries/<area>`.
- Don't override the client defaults (`src/lib/query-client.ts`: 60s stale, no retry on permission/PostgREST/constraint errors, no mutation retry) without a reason in a comment.

## 3. Screens and components: use the hooks, never fetch

- Never import `@/lib/supabase`, `@supabase/supabase-js`, a service, or TanStack's `useQuery` / `useMutation` / `useQueryClient` in `src/app`, `src/screens` or `src/components` (lint-enforced). `@/services/errors` is allowed, to recognise `NotAllowedError`.
- No `useEffect` + `useState` fetching. Render every state: `isPending` (loading), `isError` (message + "Try again" calling `refetch()`), empty, and data. Lists add pull-to-refresh with `refreshing={isRefetching}` and `onRefresh={() => refetch()}`.
- Mutations: `mutate(vars, { onSuccess, onError })` with toasts from `@/components/ui/toast`. Drive buttons with `isPending`. Show `NotAllowedError` as "not allowed", and anything else as a connection error.

## Adding a new piece of data

1. Service function in `src/services/<area>.ts` (`.throwOnError()`, explicit columns, `signal` for reads).
2. Key in `src/lib/queries/keys.ts`.
3. Hook in `src/lib/queries/<area>/use-<name>.ts`, exported from `<area>/index.ts`.
4. Use the hook in the screen with all its states.
5. Schema changes go in a migration first (`npx supabase migration new <name>`, `npm run db:push`, `npm run db:types`, advisors).
6. `npx tsc --noEmit` and `npx expo lint` pass.
