-- One SELECT policy on courses instead of two permissive ones (advisor 0006, prompts/20):
-- learners read published courses, and a tutor also reads their own drafts.
drop policy "Learners read published courses" on public.courses;
drop policy "Tutors read their own courses" on public.courses;

create policy "Read published or own courses"
  on public.courses
  for select
  to authenticated
  using (
    is_published
    or exists (
      select 1
      from public.tutors t
      where t.id = courses.tutor_id
        and t.profile_id = ((select auth.jwt()) ->> 'sub')
    )
  );
