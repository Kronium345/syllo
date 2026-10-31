-- Lesson progress (prompts/08): a row per lesson a learner has marked completed. Home's
-- progress, lessons done, certificates and streak are computed from these in the app.
create table public.lesson_progress (
  user_id text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_progress_lesson_id_idx on public.lesson_progress (lesson_id);

alter table public.lesson_progress enable row level security;

create policy "Learners read their progress" on public.lesson_progress
  for select to authenticated using (user_id = (select auth.jwt() ->> 'sub'));

-- Only lessons the learner can open: previews, or lessons of a course they're enrolled in.
create policy "Learners complete lessons they can open" on public.lesson_progress
  for insert to authenticated with check (
    user_id = (select auth.jwt() ->> 'sub')
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
            where e.course_id = c.id and e.user_id = (select auth.jwt() ->> 'sub')
          )
        )
    )
  );

create policy "Learners undo their progress" on public.lesson_progress
  for delete to authenticated using (user_id = (select auth.jwt() ->> 'sub'));

revoke all on public.lesson_progress from anon;
grant select, insert, delete on public.lesson_progress to authenticated;

-- How many learners are enrolled in a published course. Learners can only read their own
-- enrollments, so the count runs as definer in `private` (not exposed by the Data API) and
-- returns nothing but the number; `public` keeps a thin SECURITY INVOKER wrapper.
create function private.course_student_count(p_course_id uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public.enrollments e
  join public.courses c on c.id = e.course_id
  where e.course_id = p_course_id and c.is_published;
$$;
revoke all on function private.course_student_count(uuid) from public, anon;
grant execute on function private.course_student_count(uuid) to authenticated;

create function public.course_student_count(p_course_id uuid)
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select private.course_student_count(p_course_id);
$$;
revoke all on function public.course_student_count(uuid) from public, anon;
grant execute on function public.course_student_count(uuid) to authenticated;
