-- Quiz sessions (prompts/09): a random set of N questions per attempt, an optional timer,
-- and a free limit of 3 started quizzes per rolling 24 hours unless the learner has Pro.
-- Pro status is written only by the premium-sync Edge Function (service role).

-- The questions chosen for an attempt, in play order.
create table public.quiz_attempt_questions (
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  position int not null,
  primary key (attempt_id, question_id),
  unique (attempt_id, position)
);
create index quiz_attempt_questions_question_id_idx on public.quiz_attempt_questions (question_id);

alter table public.quiz_attempt_questions enable row level security;
create policy "Learners read the questions of their attempts" on public.quiz_attempt_questions
  for select to authenticated using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.user_id = ((select auth.jwt()) ->> 'sub')
    )
  );

-- Whether the attempt runs the 15-second timer (kept so a resumed attempt keeps it).
alter table public.quiz_attempts add column timed boolean not null default false;

-- Pro status mirrored from RevenueCat by premium-sync. Learners read their own row; there
-- are no write grants, so only the service role can change it.
create table public.premium_entitlements (
  user_id text primary key references public.profiles (id) on delete cascade,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.premium_entitlements enable row level security;
create policy "Learners read their entitlement" on public.premium_entitlements
  for select to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));

revoke all on public.quiz_attempt_questions, public.premium_entitlements from anon, authenticated;
grant select on public.quiz_attempt_questions, public.premium_entitlements to authenticated;

-- Pro = an entitlement row that doesn't expire or expires in the future.
create function private.is_premium(p_user_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.premium_entitlements p
    where p.user_id = p_user_id and (p.expires_at is null or p.expires_at > now())
  );
$$;

-- Free quizzes left in the last 24 hours, or null for Pro (unlimited).
create function private.quiz_sessions_left(p_user_id text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_premium(p_user_id) then null
    else greatest(0, 3 - (
      select count(*)::int from public.quiz_attempts a
      where a.user_id = p_user_id and a.started_at > now() - interval '24 hours'
    ))
  end;
$$;

revoke all on function private.is_premium(text), private.quiz_sessions_left(text) from public, anon;
grant execute on function private.is_premium(text), private.quiz_sessions_left(text) to authenticated;

create function public.quiz_sessions_left()
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select private.quiz_sessions_left((select auth.jwt()) ->> 'sub');
$$;
revoke all on function public.quiz_sessions_left() from public, anon;
grant execute on function public.quiz_sessions_left() to authenticated;

-- start_quiz_attempt gains the question count, the timer and the free limit.
drop function public.start_quiz_attempt(uuid);
drop function private.start_quiz_attempt(uuid);

create function private.start_quiz_attempt(p_quiz_id uuid, p_question_count int default null, p_timed boolean default false)
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

  -- The profile normally exists (the app syncs it); make sure the foreign key holds.
  insert into public.profiles (id) values (v_user) on conflict (id) do nothing;

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
revoke all on function private.start_quiz_attempt(uuid, int, boolean) from public, anon;
grant execute on function private.start_quiz_attempt(uuid, int, boolean) to authenticated;

create function public.start_quiz_attempt(p_quiz_id uuid, p_question_count int default null, p_timed boolean default false)
returns public.quiz_attempts
language sql
security invoker
set search_path = ''
as $$
  select * from private.start_quiz_attempt(p_quiz_id, p_question_count, p_timed);
$$;
revoke all on function public.start_quiz_attempt(uuid, int, boolean) from public, anon;
grant execute on function public.start_quiz_attempt(uuid, int, boolean) to authenticated;

-- Answers must now be for one of the attempt's chosen questions (when it has a set).
create or replace function private.answer_quiz_question(p_attempt_id uuid, p_question_id uuid, p_answer_id uuid default null)
returns table (is_correct boolean, correct_answer_id uuid, explanation text)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user text := auth.jwt() ->> 'sub';
  v_attempt public.quiz_attempts;
  v_explanation text;
  v_correct_id uuid;
  v_is_correct boolean := false;
begin
  select a.* into v_attempt
  from public.quiz_attempts a
  where a.id = p_attempt_id and a.user_id = v_user
  for update;
  if not found then
    raise exception 'Quiz attempt not found.' using errcode = '42501';
  end if;
  if v_attempt.finished_at is not null then
    raise exception 'This quiz attempt is finished.' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.quiz_attempt_questions aq where aq.attempt_id = p_attempt_id)
    and not exists (
      select 1 from public.quiz_attempt_questions aq
      where aq.attempt_id = p_attempt_id and aq.question_id = p_question_id
    ) then
    raise exception 'That question is not in this quiz.' using errcode = 'P0001';
  end if;

  select qq.explanation into v_explanation
  from public.quiz_questions qq
  where qq.id = p_question_id and qq.quiz_id = v_attempt.quiz_id;
  if not found then
    raise exception 'That question is not in this quiz.' using errcode = 'P0001';
  end if;

  select qa.id into v_correct_id
  from public.quiz_answers qa
  where qa.question_id = p_question_id and qa.is_correct;

  if p_answer_id is not null then
    if not exists (
      select 1 from public.quiz_answers qa where qa.id = p_answer_id and qa.question_id = p_question_id
    ) then
      raise exception 'That answer is not for this question.' using errcode = 'P0001';
    end if;
    v_is_correct := p_answer_id = v_correct_id;
  end if;

  begin
    insert into public.quiz_attempt_answers (attempt_id, question_id, answer_id, is_correct, correct_answer_id)
    values (p_attempt_id, p_question_id, p_answer_id, v_is_correct, v_correct_id);
  exception when unique_violation then
    raise exception 'This question is already answered.' using errcode = 'P0001';
  end;

  if p_answer_id is not null then
    update public.quiz_attempts a
    set correct_count = a.correct_count + (case when v_is_correct then 1 else 0 end),
        wrong_count = a.wrong_count + (case when v_is_correct then 0 else 1 end)
    where a.id = p_attempt_id;
  end if;

  return query select v_is_correct, v_correct_id, v_explanation;
end;
$$;
