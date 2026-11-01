-- A profile row now means "onboarded" (prompts/11): only finishing onboarding creates it.
-- start_quiz_attempt used to insert the row when missing; it no longer does. Learners can't
-- reach quizzes before onboarding, so the row exists (and the attempt's foreign key needs it).
create or replace function private.start_quiz_attempt(p_quiz_id uuid, p_question_count int default null, p_timed boolean default false)
returns public.quiz_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := auth.jwt() ->> 'sub';
  v_available int;
  v_total int;
  v_attempt public.quiz_attempts;
begin
  if v_user is null then
    raise exception 'Sign in to take quizzes.' using errcode = '42501';
  end if;
  if not private.can_use_quiz(p_quiz_id, v_user) then
    raise exception 'Enroll in this course to take its quizzes.' using errcode = '42501';
  end if;
  if p_question_count is not null and p_question_count < 1 then
    raise exception 'Pick at least one question.' using errcode = 'P0001';
  end if;

  select count(*) into v_available from public.quiz_questions qq where qq.quiz_id = p_quiz_id;
  if v_available = 0 then
    raise exception 'This quiz has no questions yet.' using errcode = 'P0001';
  end if;

  if private.quiz_sessions_left(v_user) = 0 then
    raise exception 'You''ve used today''s 3 free quizzes.' using errcode = 'P0002';
  end if;

  v_total := least(coalesce(p_question_count, v_available), v_available);

  insert into public.quiz_attempts (user_id, quiz_id, total_questions, timed)
  values (v_user, p_quiz_id, v_total, p_timed)
  returning * into v_attempt;

  insert into public.quiz_attempt_questions (attempt_id, question_id, position)
  select v_attempt.id, picked.id, row_number() over ()
  from (
    select qq.id from public.quiz_questions qq
    where qq.quiz_id = p_quiz_id
    order by random()
    limit v_total
  ) picked;

  return v_attempt;
end;
$$;
