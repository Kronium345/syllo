-- Tutors read their own courses in any state, so drafts show on the tutor dashboard (prompts/20).
-- Learners still read only published courses ("Learners read published courses").
create policy "Tutors read their own courses"
  on public.courses
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.tutors t
      where t.id = courses.tutor_id
        and t.profile_id = ((select auth.jwt()) ->> 'sub')
    )
  );
