-- The performance advisor (auth_rls_initplan) wants the auth function call itself
-- wrapped in a subquery, `(select auth.jwt()) ->> 'sub'`, so Postgres evaluates it once
-- per query instead of once per row. Same rules as the init migration, rewritten.

drop policy "Learners read their own profile" on public.profiles;
drop policy "Learners create their own profile" on public.profiles;
drop policy "Learners update their own profile" on public.profiles;
drop policy "Learners delete their own profile" on public.profiles;
drop policy "Learners read previews and enrolled lessons" on public.lesson_contents;
drop policy "Learners read their enrollments" on public.enrollments;
drop policy "Learners enroll themselves in published courses" on public.enrollments;
drop policy "Learners leave their own courses" on public.enrollments;

create policy "Learners read their own profile" on public.profiles
  for select to authenticated using (id = ((select auth.jwt()) ->> 'sub'));
create policy "Learners create their own profile" on public.profiles
  for insert to authenticated with check (id = ((select auth.jwt()) ->> 'sub'));
create policy "Learners update their own profile" on public.profiles
  for update to authenticated
  using (id = ((select auth.jwt()) ->> 'sub'))
  with check (id = ((select auth.jwt()) ->> 'sub'));
create policy "Learners delete their own profile" on public.profiles
  for delete to authenticated using (id = ((select auth.jwt()) ->> 'sub'));

create policy "Learners read previews and enrolled lessons" on public.lesson_contents
  for select to authenticated using (
    exists (
      select 1
      from public.lessons l
      join public.chapters ch on ch.id = l.chapter_id
      join public.courses c on c.id = ch.course_id
      where l.id = lesson_id
        and c.is_published
        and (
          l.is_preview
          or exists (
            select 1 from public.enrollments e
            where e.course_id = c.id and e.user_id = ((select auth.jwt()) ->> 'sub')
          )
        )
    )
  );

create policy "Learners read their enrollments" on public.enrollments
  for select to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));
create policy "Learners enroll themselves in published courses" on public.enrollments
  for insert to authenticated with check (
    user_id = ((select auth.jwt()) ->> 'sub')
    and exists (select 1 from public.courses c where c.id = course_id and c.is_published)
  );
create policy "Learners leave their own courses" on public.enrollments
  for delete to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));
