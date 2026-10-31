-- The performance advisor (auth_rls_initplan) wants auth.jwt() wrapped in its own select so
-- it runs once per query: ((select auth.jwt()) ->> 'sub'), as in rls_initplan.
alter policy "Learners read their progress" on public.lesson_progress
  using (user_id = ((select auth.jwt()) ->> 'sub'));

alter policy "Learners undo their progress" on public.lesson_progress
  using (user_id = ((select auth.jwt()) ->> 'sub'));

alter policy "Learners complete lessons they can open" on public.lesson_progress
  with check (
    user_id = ((select auth.jwt()) ->> 'sub')
    and exists (
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
