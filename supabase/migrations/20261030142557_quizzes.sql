-- Quizzes, quiz attempts and question flags (prompts/05-quizzes-and-exam-prep.md).
-- A chapter can have quizzes; a quiz has multiple-choice questions with one correct answer.
-- Learners never read which answer is correct: the database grades each answer through
-- the functions at the bottom and keeps the attempt's score, so the app can't fake it.

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  title text not null,
  position int not null default 1,
  is_preview boolean not null default false,
  unique (chapter_id, position)
);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  position int not null,
  prompt text not null,
  explanation text,
  reference_url text,
  unique (quiz_id, position)
);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  position int not null,
  text text not null,
  is_correct boolean not null default false,
  unique (question_id, position)
);
-- At most one correct answer per question.
create unique index quiz_answers_one_correct_idx on public.quiz_answers (question_id) where is_correct;

-- One row per try at a quiz (Retake starts a new one). Counts are kept by the functions.
create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  quiz_id uuid not null references public.quizzes (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  total_questions int not null,
  correct_count int not null default 0,
  wrong_count int not null default 0,
  skipped_count int not null default 0
);
create index quiz_attempts_user_id_idx on public.quiz_attempts (user_id);
create index quiz_attempts_quiz_id_idx on public.quiz_attempts (quiz_id);

-- Each question is answered at most once per attempt; answer_id null = skipped or timed out.
create table public.quiz_attempt_answers (
  attempt_id uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  answer_id uuid references public.quiz_answers (id) on delete cascade,
  is_correct boolean not null,
  correct_answer_id uuid not null references public.quiz_answers (id) on delete cascade,
  answered_at timestamptz not null default now(),
  primary key (attempt_id, question_id)
);
create index quiz_attempt_answers_question_id_idx on public.quiz_attempt_answers (question_id);
create index quiz_attempt_answers_answer_id_idx on public.quiz_attempt_answers (answer_id);
create index quiz_attempt_answers_correct_answer_id_idx on public.quiz_attempt_answers (correct_answer_id);

-- Questions a learner marked to review later.
create table public.question_flags (
  user_id text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  question_id uuid not null references public.quiz_questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);
create index question_flags_question_id_idx on public.question_flags (question_id);

-- Shared access rule, in a schema the Data API doesn't expose: a learner can use a quiz
-- when its course is published and the quiz is a free preview or they're enrolled.
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.can_use_quiz(p_quiz_id uuid, p_user_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.quizzes q
    join public.chapters ch on ch.id = q.chapter_id
    join public.courses c on c.id = ch.course_id
    where q.id = p_quiz_id
      and c.is_published
      and (
        q.is_preview
        or exists (
          select 1 from public.enrollments e
          where e.course_id = c.id and e.user_id = p_user_id
        )
      )
  );
$$;
revoke all on function private.can_use_quiz(uuid, text) from public, anon;
grant execute on function private.can_use_quiz(uuid, text) to authenticated;

alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_attempt_answers enable row level security;
alter table public.question_flags enable row level security;

-- Quizzes are part of the outline: readable when their course is published.
create policy "Learners read quizzes of published courses" on public.quizzes
  for select to authenticated using (
    exists (
      select 1
      from public.chapters ch
      join public.courses c on c.id = ch.course_id
      where ch.id = chapter_id and c.is_published
    )
  );

-- Questions and answers: previews, or quizzes in courses the learner is enrolled in.
create policy "Learners read questions they can use" on public.quiz_questions
  for select to authenticated using (private.can_use_quiz(quiz_id, (select auth.jwt()) ->> 'sub'));
create policy "Learners read answers they can use" on public.quiz_answers
  for select to authenticated using (
    exists (
      select 1 from public.quiz_questions qq
      where qq.id = question_id and private.can_use_quiz(qq.quiz_id, (select auth.jwt()) ->> 'sub')
    )
  );

-- Attempts: learners read their own; writes only through the functions below.
create policy "Learners read their attempts" on public.quiz_attempts
  for select to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));
create policy "Learners read answers in their attempts" on public.quiz_attempt_answers
  for select to authenticated using (
    exists (
      select 1 from public.quiz_attempts a
      where a.id = attempt_id and a.user_id = ((select auth.jwt()) ->> 'sub')
    )
  );

-- Flags: learners manage their own, on questions they can read.
create policy "Learners read their flags" on public.question_flags
  for select to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));
create policy "Learners flag questions they can use" on public.question_flags
  for insert to authenticated with check (
    user_id = ((select auth.jwt()) ->> 'sub')
    and exists (
      select 1 from public.quiz_questions qq
      where qq.id = question_id and private.can_use_quiz(qq.quiz_id, (select auth.jwt()) ->> 'sub')
    )
  );
create policy "Learners remove their flags" on public.question_flags
  for delete to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));

-- Data API privileges. quiz_answers is granted per column so is_correct stays hidden
-- (select the columns explicitly; `select=*` is refused).
revoke all on public.quizzes, public.quiz_questions, public.quiz_answers, public.quiz_attempts,
  public.quiz_attempt_answers, public.question_flags from anon, authenticated;
grant select on public.quizzes, public.quiz_questions to authenticated;
grant select (id, question_id, position, text) on public.quiz_answers to authenticated;
grant select on public.quiz_attempts, public.quiz_attempt_answers to authenticated;
grant select, insert, delete on public.question_flags to authenticated;

-- Starts a new attempt at a quiz the learner can use.
create function public.start_quiz_attempt(p_quiz_id uuid)
returns public.quiz_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := auth.jwt() ->> 'sub';
  v_total int;
  v_attempt public.quiz_attempts;
begin
  if v_user is null then
    raise exception 'Sign in to take quizzes.' using errcode = '42501';
  end if;
  if not private.can_use_quiz(p_quiz_id, v_user) then
    raise exception 'Enroll in this course to take its quizzes.' using errcode = '42501';
  end if;

  select count(*) into v_total from public.quiz_questions qq where qq.quiz_id = p_quiz_id;
  if v_total = 0 then
    raise exception 'This quiz has no questions yet.' using errcode = 'P0001';
  end if;

  -- The profile normally exists (the app syncs it); make sure the foreign key holds.
  insert into public.profiles (id) values (v_user) on conflict (id) do nothing;

  insert into public.quiz_attempts (user_id, quiz_id, total_questions)
  values (v_user, p_quiz_id, v_total)
  returning * into v_attempt;
  return v_attempt;
end;
$$;

-- Records one answer (null = skipped / timed out), grades it and returns the result.
create function public.answer_quiz_question(p_attempt_id uuid, p_question_id uuid, p_answer_id uuid default null)
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

-- Finishes an attempt (early finishes allowed); unanswered and skipped questions count as skipped.
create function public.finish_quiz_attempt(p_attempt_id uuid)
returns public.quiz_attempts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt public.quiz_attempts;
begin
  update public.quiz_attempts a
  set finished_at = coalesce(a.finished_at, now()),
      skipped_count = a.total_questions - a.correct_count - a.wrong_count
  where a.id = p_attempt_id and a.user_id = (auth.jwt() ->> 'sub')
  returning a.* into v_attempt;
  if not found then
    raise exception 'Quiz attempt not found.' using errcode = '42501';
  end if;
  return v_attempt;
end;
$$;

revoke all on function public.start_quiz_attempt(uuid) from public, anon;
revoke all on function public.answer_quiz_question(uuid, uuid, uuid) from public, anon;
revoke all on function public.finish_quiz_attempt(uuid) from public, anon;
grant execute on function public.start_quiz_attempt(uuid) to authenticated;
grant execute on function public.answer_quiz_question(uuid, uuid, uuid) to authenticated;
grant execute on function public.finish_quiz_attempt(uuid) to authenticated;
