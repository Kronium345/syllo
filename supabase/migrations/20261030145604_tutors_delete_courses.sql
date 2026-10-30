-- A course's own tutor (tutors.profile_id = the signed-in Clerk user) can delete it.
-- The first course write for Part 2; everyone else is still refused. Deleting a course
-- cascades to its chapters, lessons, quizzes, enrollments and quiz attempts.

create policy "Tutors delete their own courses" on public.courses
  for delete to authenticated using (
    exists (
      select 1 from public.tutors t
      where t.id = tutor_id and t.profile_id = ((select auth.jwt()) ->> 'sub')
    )
  );

grant delete on public.courses to authenticated;
