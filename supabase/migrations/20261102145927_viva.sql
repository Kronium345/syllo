-- prompts/17: viva practice. After a finished quiz, a learner explains up to 5 questions out
-- loud; the viva-answer Edge Function sends the recording to Gemini and saves the graded
-- feedback. Sessions are created only by RPCs; answers and tries are written only by the Edge
-- Function (service role). Learners must agree to AI feedback (and confirm 18+) first.

-- 1. Consent ---------------------------------------------------------------------------------

alter table public.profiles add column ai_consent_at timestamptz;
comment on column public.profiles.ai_consent_at is
  'When the learner confirmed they are 18+ and agreed to send voice answers to Google Gemini (viva practice). Null = no consent.';

create function private.set_ai_consent(p_user_id text, p_given boolean)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set ai_consent_at = case when p_given then coalesce(ai_consent_at, now()) else null end
  where id = p_user_id;
$$;
revoke all on function private.set_ai_consent(text, boolean) from public, anon;
grant execute on function private.set_ai_consent(text, boolean) to authenticated;

create function public.give_ai_consent()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_ai_consent((select auth.jwt()) ->> 'sub', true);
$$;
create function public.withdraw_ai_consent()
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_ai_consent((select auth.jwt()) ->> 'sub', false);
$$;
revoke all on function public.give_ai_consent(), public.withdraw_ai_consent() from public, anon;
grant execute on function public.give_ai_consent(), public.withdraw_ai_consent() to authenticated;

-- 2. Tables ----------------------------------------------------------------------------------

create table public.viva_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  total_questions int not null
);
create index viva_sessions_user_id_started_at_idx on public.viva_sessions (user_id, started_at);
create index viva_sessions_attempt_id_idx on public.viva_sessions (attempt_id);

create table public.viva_session_questions (
  session_id uuid not null references public.viva_sessions (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  position int not null,
  reason text not null check (reason in ('wrong', 'skipped', 'flagged', 'review')),
  tries smallint not null default 0,
  primary key (session_id, question_id),
  unique (session_id, position)
);
create index viva_session_questions_question_id_idx on public.viva_session_questions (question_id);

create table public.viva_answers (
  session_id uuid not null,
  question_id uuid not null,
  transcript text not null,
  verdict text not null check (verdict in ('correct', 'partly_correct', 'incorrect', 'no_answer')),
  score smallint not null check (score between 0 and 10),
  accuracy smallint not null check (accuracy between 1 and 5),
  reasoning smallint not null check (reasoning between 1 and 5),
  clarity smallint not null check (clarity between 1 and 5),
  strengths text[] not null default '{}',
  improvements text[] not null default '{}',
  model_answer text not null,
  model text not null,
  audio_seconds numeric(5, 1) not null,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now(),
  primary key (session_id, question_id),
  foreign key (session_id, question_id) references public.viva_session_questions (session_id, question_id) on delete cascade
);

create table public.viva_feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  session_id uuid not null,
  question_id uuid not null,
  reason text not null check (reason in ('inaccurate', 'offensive', 'other')),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  foreign key (session_id, question_id) references public.viva_answers (session_id, question_id) on delete cascade
);
create index viva_feedback_reports_user_id_idx on public.viva_feedback_reports (user_id);
create index viva_feedback_reports_answer_idx on public.viva_feedback_reports (session_id, question_id);

comment on table public.viva_answers is
  'AI feedback for one spoken answer (Gemini via the viva-answer Edge Function). Written only with the service role; audio is never stored.';
comment on table public.viva_feedback_reports is
  'Learners flagging AI feedback (Google Play AI-generated content policy). Reviewed in Supabase.';

-- 3. RLS: read own; the only learner write is a report on their own answer ------------------

alter table public.viva_sessions enable row level security;
alter table public.viva_session_questions enable row level security;
alter table public.viva_answers enable row level security;
alter table public.viva_feedback_reports enable row level security;

create policy "Learners read their viva sessions" on public.viva_sessions
  for select to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));
create policy "Learners read their viva questions" on public.viva_session_questions
  for select to authenticated using (
    exists (select 1 from public.viva_sessions s where s.id = session_id and s.user_id = ((select auth.jwt()) ->> 'sub'))
  );
create policy "Learners read their viva answers" on public.viva_answers
  for select to authenticated using (
    exists (select 1 from public.viva_sessions s where s.id = session_id and s.user_id = ((select auth.jwt()) ->> 'sub'))
  );
create policy "Learners read their reports" on public.viva_feedback_reports
  for select to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));
create policy "Learners report feedback on their own answers" on public.viva_feedback_reports
  for insert to authenticated with check (
    user_id = ((select auth.jwt()) ->> 'sub')
    and exists (
      select 1 from public.viva_sessions s
      where s.id = viva_feedback_reports.session_id and s.user_id = ((select auth.jwt()) ->> 'sub')
    )
  );

revoke all on public.viva_sessions, public.viva_session_questions, public.viva_answers, public.viva_feedback_reports
  from anon, authenticated;
grant select on public.viva_sessions, public.viva_session_questions, public.viva_answers, public.viva_feedback_reports
  to authenticated;
grant insert on public.viva_feedback_reports to authenticated;

-- 4. Limits ----------------------------------------------------------------------------------

-- Free: 1 session per rolling 7 days. Pro: 5 per rolling 24 hours.
create function private.viva_sessions_left(p_user_id text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_premium(p_user_id) then greatest(0, 5 - (
      select count(*)::int from public.viva_sessions v
      where v.user_id = p_user_id and v.started_at > now() - interval '24 hours'
    ))
    else greatest(0, 1 - (
      select count(*)::int from public.viva_sessions v
      where v.user_id = p_user_id and v.started_at > now() - interval '7 days'
    ))
  end;
$$;
revoke all on function private.viva_sessions_left(text) from public, anon;
grant execute on function private.viva_sessions_left(text) to authenticated;

create function public.viva_sessions_left()
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select private.viva_sessions_left((select auth.jwt()) ->> 'sub');
$$;
revoke all on function public.viva_sessions_left() from public, anon;
grant execute on function public.viva_sessions_left() to authenticated;

-- 5. Start and finish ------------------------------------------------------------------------

create function private.start_viva_session(p_attempt_id uuid)
returns public.viva_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := auth.jwt() ->> 'sub';
  v_attempt public.quiz_attempts;
  v_session public.viva_sessions;
  v_count int;
  v_ids uuid[];
  v_reasons text[];
begin
  if v_user is null then
    raise exception 'Sign in to practise.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user and p.ai_consent_at is not null) then
    raise exception 'Agree to AI feedback first.' using errcode = 'P0003';
  end if;

  select * into v_attempt from public.quiz_attempts a where a.id = p_attempt_id and a.user_id = v_user;
  if v_attempt.id is null or v_attempt.finished_at is null then
    raise exception 'Finish the quiz first.' using errcode = 'P0001';
  end if;
  if not private.can_use_quiz(v_attempt.quiz_id, v_user) then
    raise exception 'You can''t open this quiz.' using errcode = '42501';
  end if;

  -- Reopening an unfinished session doesn't count against the limit.
  select * into v_session from public.viva_sessions s
  where s.attempt_id = p_attempt_id and s.user_id = v_user and s.finished_at is null
  order by s.started_at desc
  limit 1;
  if v_session.id is not null then
    return v_session;
  end if;

  if private.viva_sessions_left(v_user) = 0 then
    if private.is_premium(v_user) then
      raise exception 'You''ve used today''s 5 vivas.' using errcode = 'P0002';
    end if;
    raise exception 'You''ve used this week''s free viva.' using errcode = 'P0002';
  end if;

  -- Questions with an answer row only (unanswered ones would reveal the answer): wrong, then
  -- skipped, then flagged-but-correct, each in play order; at most 5.
  select array_agg(picked.question_id order by picked.rank, picked.position),
         array_agg(picked.reason order by picked.rank, picked.position)
  into v_ids, v_reasons
  from (
    select ans.question_id,
      case
        when ans.answer_id is not null and not ans.is_correct then 'wrong'
        when ans.answer_id is null then 'skipped'
        else 'flagged'
      end as reason,
      case
        when ans.answer_id is not null and not ans.is_correct then 1
        when ans.answer_id is null then 2
        else 3
      end as rank,
      coalesce(aq.position, 0) as position
    from public.quiz_attempt_answers ans
    left join public.quiz_attempt_questions aq on aq.attempt_id = ans.attempt_id and aq.question_id = ans.question_id
    where ans.attempt_id = p_attempt_id
      and (
        not ans.is_correct
        or exists (select 1 from public.question_flags f where f.user_id = v_user and f.question_id = ans.question_id)
      )
    order by rank, position
    limit 5
  ) picked;

  -- A perfect, unflagged attempt: 3 random answered questions to explain ("review").
  if coalesce(array_length(v_ids, 1), 0) = 0 then
    select array_agg(r.question_id), array_agg('review'::text)
    into v_ids, v_reasons
    from (
      select ans.question_id from public.quiz_attempt_answers ans
      where ans.attempt_id = p_attempt_id
      order by random()
      limit 3
    ) r;
  end if;
  v_count := coalesce(array_length(v_ids, 1), 0);
  if v_count = 0 then
    raise exception 'Nothing to practise in this quiz.' using errcode = 'P0001';
  end if;

  insert into public.viva_sessions (user_id, attempt_id, total_questions)
  values (v_user, p_attempt_id, v_count)
  returning * into v_session;

  insert into public.viva_session_questions (session_id, question_id, position, reason)
  select v_session.id, picked.question_id, picked.ord, picked.reason
  from unnest(v_ids, v_reasons) with ordinality as picked(question_id, reason, ord);

  return v_session;
end;
$$;
revoke all on function private.start_viva_session(uuid) from public, anon;
grant execute on function private.start_viva_session(uuid) to authenticated;

create function public.start_viva_session(p_attempt_id uuid)
returns public.viva_sessions
language sql
security invoker
set search_path = ''
as $$
  select * from private.start_viva_session(p_attempt_id);
$$;
revoke all on function public.start_viva_session(uuid) from public, anon;
grant execute on function public.start_viva_session(uuid) to authenticated;

create function private.finish_viva_session(p_session_id uuid)
returns public.viva_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := auth.jwt() ->> 'sub';
  v_session public.viva_sessions;
begin
  update public.viva_sessions s
  set finished_at = coalesce(s.finished_at, now())
  where s.id = p_session_id and s.user_id = v_user
  returning * into v_session;
  if v_session.id is null then
    raise exception 'Viva session not found.' using errcode = 'P0001';
  end if;
  return v_session;
end;
$$;
revoke all on function private.finish_viva_session(uuid) from public, anon;
grant execute on function private.finish_viva_session(uuid) to authenticated;

create function public.finish_viva_session(p_session_id uuid)
returns public.viva_sessions
language sql
security invoker
set search_path = ''
as $$
  select * from private.finish_viva_session(p_session_id);
$$;
revoke all on function public.finish_viva_session(uuid) from public, anon;
grant execute on function public.finish_viva_session(uuid) to authenticated;
