-- prompts/18: interview practice. A learner answers 5 interview questions out loud (pharmacy
-- careers from a written bank, or any role with questions written by Gemini) and gets AI
-- feedback per answer plus an overall summary. Same rules as viva (prompts/17): sessions are
-- created only by RPCs / the interview-start function, answers and summaries only by Edge
-- Functions with the service role, consent (profiles.ai_consent_at) is required, audio is never
-- stored. Limits are separate from viva: free 1 per 7 days, Pro 5 per 24 hours.

-- 1. Question bank ---------------------------------------------------------------------------

create table public.interview_questions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  category text not null check (category in (
    'motivation', 'teamwork', 'communication', 'ethics', 'patient_safety', 'situational',
    'explaining_medicines', 'resilience'
  )),
  kind text not null check (kind in ('behavioural', 'situational', 'motivation')),
  -- Empty = every pharmacy target; otherwise the targets it suits.
  settings text[] not null default '{}',
  prompt text not null check (char_length(prompt) between 10 and 300),
  key_points text[] not null,
  active boolean not null default true
);
comment on table public.interview_questions is
  'Original pharmacy-career interview questions (seeds/source/interview-questions.json). key_points ground the AI feedback.';

-- 2. Sessions --------------------------------------------------------------------------------

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  mode text not null check (mode in ('pharmacy', 'general')),
  target text check (target in ('foundation', 'community', 'hospital', 'placement')),
  role text check (char_length(role) between 2 and 60),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  total_questions int not null,
  -- The overall summary, written by interview-finish.
  readiness smallint check (readiness between 0 and 10),
  summary text,
  top_strengths text[] not null default '{}',
  next_steps text[] not null default '{}',
  summary_model text,
  -- Tokens for generating general questions and the summary (answers keep their own).
  input_tokens int,
  output_tokens int,
  check ((mode = 'pharmacy' and target is not null and role is null) or (mode = 'general' and role is not null and target is null))
);
create index interview_sessions_user_id_started_at_idx on public.interview_sessions (user_id, started_at);

create table public.interview_session_questions (
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  position int not null check (position between 1 and 10),
  -- The bank question (pharmacy) or null (written by Gemini for a general session).
  question_id uuid references public.interview_questions (id) on delete set null,
  -- Copied so generated questions live here and bank edits don't change past sessions.
  prompt text not null,
  kind text not null check (kind in ('behavioural', 'situational', 'motivation')),
  category text,
  key_points text[] not null default '{}',
  tries smallint not null default 0,
  primary key (session_id, position)
);
create index interview_session_questions_question_id_idx on public.interview_session_questions (question_id);

create table public.interview_answers (
  session_id uuid not null,
  position int not null,
  transcript text not null,
  verdict text not null check (verdict in ('strong', 'good', 'needs_work', 'no_answer')),
  score smallint not null check (score between 0 and 10),
  structure smallint not null check (structure between 1 and 5),
  relevance smallint not null check (relevance between 1 and 5),
  clarity smallint not null check (clarity between 1 and 5),
  strengths text[] not null default '{}',
  improvements text[] not null default '{}',
  model_answer text not null,
  model text not null,
  audio_seconds numeric(5, 1) not null,
  input_tokens int,
  output_tokens int,
  created_at timestamptz not null default now(),
  primary key (session_id, position),
  foreign key (session_id, position) references public.interview_session_questions (session_id, position) on delete cascade
);
comment on table public.interview_answers is
  'AI feedback for one spoken interview answer (Gemini via interview-answer). Written only with the service role; audio is never stored.';

create table public.interview_feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  session_id uuid not null references public.interview_sessions (id) on delete cascade,
  -- An answer's position, or null for the overall summary.
  position int,
  reason text not null check (reason in ('inaccurate', 'offensive', 'other')),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now(),
  foreign key (session_id, position) references public.interview_answers (session_id, position) on delete cascade
);
create index interview_feedback_reports_user_id_idx on public.interview_feedback_reports (user_id);
create index interview_feedback_reports_answer_idx on public.interview_feedback_reports (session_id, position);
comment on table public.interview_feedback_reports is
  'Learners flagging AI interview feedback or summaries (Google Play AI-generated content policy). Reviewed in Supabase.';

-- 3. RLS: the bank is readable; sessions read own; the only learner write is a report ----------

alter table public.interview_questions enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_session_questions enable row level security;
alter table public.interview_answers enable row level security;
alter table public.interview_feedback_reports enable row level security;

create policy "Signed-in learners read the interview bank" on public.interview_questions
  for select to authenticated using (true);
create policy "Learners read their interview sessions" on public.interview_sessions
  for select to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));
create policy "Learners read their interview questions" on public.interview_session_questions
  for select to authenticated using (
    exists (select 1 from public.interview_sessions s where s.id = session_id and s.user_id = ((select auth.jwt()) ->> 'sub'))
  );
create policy "Learners read their interview answers" on public.interview_answers
  for select to authenticated using (
    exists (select 1 from public.interview_sessions s where s.id = session_id and s.user_id = ((select auth.jwt()) ->> 'sub'))
  );
create policy "Learners read their interview reports" on public.interview_feedback_reports
  for select to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));
-- An answer report needs the answer (the foreign key); a summary report needs a summary.
create policy "Learners report feedback on their own interviews" on public.interview_feedback_reports
  for insert to authenticated with check (
    user_id = ((select auth.jwt()) ->> 'sub')
    and exists (
      select 1 from public.interview_sessions s
      where s.id = interview_feedback_reports.session_id
        and s.user_id = ((select auth.jwt()) ->> 'sub')
        and (interview_feedback_reports.position is not null or s.summary is not null)
    )
  );

revoke all on public.interview_questions, public.interview_sessions, public.interview_session_questions,
  public.interview_answers, public.interview_feedback_reports from anon, authenticated;
grant select on public.interview_questions, public.interview_sessions, public.interview_session_questions,
  public.interview_answers, public.interview_feedback_reports to authenticated;
grant insert on public.interview_feedback_reports to authenticated;

-- 4. Limits ----------------------------------------------------------------------------------

-- Free: 1 interview per rolling 7 days. Pro: 5 per rolling 24 hours. Separate from viva.
create function private.interview_sessions_left(p_user_id text)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when private.is_premium(p_user_id) then greatest(0, 5 - (
      select count(*)::int from public.interview_sessions s
      where s.user_id = p_user_id and s.started_at > now() - interval '24 hours'
    ))
    else greatest(0, 1 - (
      select count(*)::int from public.interview_sessions s
      where s.user_id = p_user_id and s.started_at > now() - interval '7 days'
    ))
  end;
$$;
revoke all on function private.interview_sessions_left(text) from public, anon;
grant execute on function private.interview_sessions_left(text) to authenticated, service_role;

create function public.interview_sessions_left()
returns int
language sql
stable
security invoker
set search_path = ''
as $$
  select private.interview_sessions_left((select auth.jwt()) ->> 'sub');
$$;
revoke all on function public.interview_sessions_left() from public, anon;
grant execute on function public.interview_sessions_left() to authenticated;

-- Shared start checks: consent, then the limit (with the free or Pro message).
create function private.check_interview_start(p_user_id text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'Sign in to practise.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id and p.ai_consent_at is not null) then
    raise exception 'Agree to AI feedback first.' using errcode = 'P0003';
  end if;
  if private.interview_sessions_left(p_user_id) = 0 then
    if private.is_premium(p_user_id) then
      raise exception 'You''ve used today''s 5 interviews.' using errcode = 'P0002';
    end if;
    raise exception 'You''ve used this week''s free interview.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function private.check_interview_start(text) from public, anon;
grant execute on function private.check_interview_start(text) to authenticated, service_role;

-- 5. Start (pharmacy careers): 1 motivation question, then 4 from different categories ---------

create function private.start_interview_session(p_target text)
returns public.interview_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := auth.jwt() ->> 'sub';
  v_session public.interview_sessions;
  v_ids uuid[];
begin
  if p_target is null or p_target not in ('foundation', 'community', 'hospital', 'placement') then
    raise exception 'Choose what you''re applying for.' using errcode = 'P0001';
  end if;
  if v_user is null then
    raise exception 'Sign in to practise.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = v_user and p.ai_consent_at is not null) then
    raise exception 'Agree to AI feedback first.' using errcode = 'P0003';
  end if;

  -- Reopening an unfinished session for the same target doesn't count against the limit.
  select * into v_session from public.interview_sessions s
  where s.user_id = v_user and s.mode = 'pharmacy' and s.target = p_target and s.finished_at is null
  order by s.started_at desc
  limit 1;
  if v_session.id is not null then
    return v_session;
  end if;

  perform private.check_interview_start(v_user);

  with usable as (
    select q.id, q.category from public.interview_questions q
    where q.active and (cardinality(q.settings) = 0 or p_target = any (q.settings))
  ),
  opener as (
    select u.id from usable u where u.category = 'motivation' order by random() limit 1
  ),
  one_per_category as (
    select distinct on (u.category) u.id from usable u
    where u.category <> 'motivation'
    order by u.category, random()
  ),
  rest as (
    select c.id from one_per_category c order by random() limit 4
  )
  select array(select o.id from opener o) || array(select r.id from rest r) into v_ids;

  if coalesce(array_length(v_ids, 1), 0) < 5 then
    raise exception 'Not enough questions for this interview.' using errcode = 'P0001';
  end if;

  insert into public.interview_sessions (user_id, mode, target, total_questions)
  values (v_user, 'pharmacy', p_target, 5)
  returning * into v_session;

  insert into public.interview_session_questions (session_id, position, question_id, prompt, kind, category, key_points)
  select v_session.id, picked.ord, q.id, q.prompt, q.kind, q.category, q.key_points
  from unnest(v_ids) with ordinality as picked(question_id, ord)
  join public.interview_questions q on q.id = picked.question_id;

  return v_session;
end;
$$;
revoke all on function private.start_interview_session(text) from public, anon;
grant execute on function private.start_interview_session(text) to authenticated;

create function public.start_interview_session(p_target text)
returns public.interview_sessions
language sql
security invoker
set search_path = ''
as $$
  select * from private.start_interview_session(p_target);
$$;
revoke all on function public.start_interview_session(text) from public, anon;
grant execute on function public.start_interview_session(text) to authenticated;

-- 6. Start (any role): only the interview-start Edge Function (service role) calls this, after
-- Gemini has written the questions. p_questions: [{ "prompt", "kind", "keyPoints": [] }].
create function public.create_general_interview(p_user_id text, p_role text, p_questions jsonb)
returns public.interview_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.interview_sessions;
  v_count int := jsonb_array_length(p_questions);
begin
  perform private.check_interview_start(p_user_id);
  if v_count < 1 or v_count > 10 then
    raise exception 'An interview needs 1 to 10 questions.' using errcode = 'P0001';
  end if;

  insert into public.interview_sessions (user_id, mode, role, total_questions)
  values (p_user_id, 'general', p_role, v_count)
  returning * into v_session;

  insert into public.interview_session_questions (session_id, position, prompt, kind, key_points)
  select v_session.id, q.ord, q.item ->> 'prompt', q.item ->> 'kind',
    coalesce(array(select jsonb_array_elements_text(q.item -> 'keyPoints')), '{}')
  from jsonb_array_elements(p_questions) with ordinality as q(item, ord);

  return v_session;
end;
$$;
revoke all on function public.create_general_interview(text, text, jsonb) from public, anon, authenticated;
grant execute on function public.create_general_interview(text, text, jsonb) to service_role;
