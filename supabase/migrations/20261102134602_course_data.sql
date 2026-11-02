-- prompts/16: course data the screens show but the schema didn't store.
--   1. courses.access (free | premium), enforced now: premium courses need Pro to enroll,
--      and to open their non-preview lessons and quizzes.
--   2. course_reviews (one 1-5 rating per enrolled learner) + courses.rating_average/count.
--   3. tutor_follows (the Follow button on Course details).
--   4. lesson_resources (downloadable files per lesson, in the private R2 bucket).

-- 1. Access tier ---------------------------------------------------------------------------

alter table public.courses
  add column access text not null default 'free' check (access in ('free', 'premium'));
comment on column public.courses.access is
  'free: anyone can enroll. premium: enrolling and non-preview content need an active Pro entitlement (private.is_premium).';

-- The sample courses that are Premium (seed.sql does the same for fresh databases).
update public.courses set access = 'premium'
where slug in ('advanced-animations', 'data-analysis-pandas', 'design-systems');

-- One access rule for lesson content, progress and resources: published, and a free preview
-- or enrolled (+ Pro for premium courses). A lapsed Pro learner keeps enrollment and progress
-- but loses premium content until they renew.
create function private.can_open_lesson(p_lesson_id uuid, p_user_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.lessons l
    join public.chapters ch on ch.id = l.chapter_id
    join public.courses c on c.id = ch.course_id
    where l.id = p_lesson_id
      and c.is_published
      and (
        l.is_preview
        or (
          exists (select 1 from public.enrollments e where e.course_id = c.id and e.user_id = p_user_id)
          and (c.access = 'free' or private.is_premium(p_user_id))
        )
      )
  );
$$;
revoke all on function private.can_open_lesson(uuid, text) from public, anon;
grant execute on function private.can_open_lesson(uuid, text) to authenticated;

drop policy "Learners read previews and enrolled lessons" on public.lesson_contents;
create policy "Learners read lessons they can open" on public.lesson_contents
  for select to authenticated using (private.can_open_lesson(lesson_id, (select auth.jwt()) ->> 'sub'));

drop policy "Learners complete lessons they can open" on public.lesson_progress;
create policy "Learners complete lessons they can open" on public.lesson_progress
  for insert to authenticated with check (
    user_id = ((select auth.jwt()) ->> 'sub')
    and private.can_open_lesson(lesson_id, (select auth.jwt()) ->> 'sub')
  );

-- Quizzes follow the same rule (previews stay open).
create or replace function private.can_use_quiz(p_quiz_id uuid, p_user_id text)
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
        or (
          exists (select 1 from public.enrollments e where e.course_id = c.id and e.user_id = p_user_id)
          and (c.access = 'free' or private.is_premium(p_user_id))
        )
      )
  );
$$;

-- Enrolling in a premium course needs Pro.
drop policy "Learners enroll themselves in published courses" on public.enrollments;
create policy "Learners enroll themselves in published courses" on public.enrollments
  for insert to authenticated with check (
    user_id = ((select auth.jwt()) ->> 'sub')
    and exists (
      select 1 from public.courses c
      where c.id = course_id
        and c.is_published
        and (c.access = 'free' or private.is_premium((select auth.jwt()) ->> 'sub'))
    )
  );

-- 2. Reviews and ratings -------------------------------------------------------------------

create table public.course_reviews (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  user_id text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, user_id)
);
create index course_reviews_user_id_idx on public.course_reviews (user_id);
comment on table public.course_reviews is
  'One rating (+ optional comment) per enrolled learner per course. Totals live on courses.rating_average/rating_count.';

alter table public.courses
  add column rating_average numeric(2, 1),
  add column rating_count int not null default 0;
comment on column public.courses.rating_average is 'Average of course_reviews.rating to one decimal; null until rated. Kept by private.refresh_course_rating().';

alter table public.course_reviews enable row level security;

create policy "Learners read reviews of published courses" on public.course_reviews
  for select to authenticated using (
    exists (select 1 from public.courses c where c.id = course_id and c.is_published)
  );
create policy "Enrolled learners add their review" on public.course_reviews
  for insert to authenticated with check (
    user_id = ((select auth.jwt()) ->> 'sub')
    and exists (
      select 1 from public.enrollments e
      where e.course_id = course_reviews.course_id and e.user_id = ((select auth.jwt()) ->> 'sub')
    )
  );
create policy "Enrolled learners edit their review" on public.course_reviews
  for update to authenticated
  using (user_id = ((select auth.jwt()) ->> 'sub'))
  with check (
    user_id = ((select auth.jwt()) ->> 'sub')
    and exists (
      select 1 from public.enrollments e
      where e.course_id = course_reviews.course_id and e.user_id = ((select auth.jwt()) ->> 'sub')
    )
  );
create policy "Learners remove their review" on public.course_reviews
  for delete to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));

grant select, insert, update, delete on public.course_reviews to authenticated;
revoke all on public.course_reviews from anon;

-- Keeps courses.rating_average/rating_count in step (learners can't write courses).
create function private.refresh_course_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course uuid := coalesce(new.course_id, old.course_id);
begin
  update public.courses c
  set rating_average = s.average, rating_count = s.total
  from (
    select round(avg(r.rating)::numeric, 1) as average, count(*)::int as total
    from public.course_reviews r
    where r.course_id = v_course
  ) s
  where c.id = v_course;
  if tg_op = 'UPDATE' and old.course_id is distinct from new.course_id then
    update public.courses c
    set rating_average = s.average, rating_count = s.total
    from (
      select round(avg(r.rating)::numeric, 1) as average, count(*)::int as total
      from public.course_reviews r
      where r.course_id = old.course_id
    ) s
    where c.id = old.course_id;
  end if;
  return null;
end;
$$;
revoke all on function private.refresh_course_rating() from public, anon, authenticated;

create trigger course_reviews_refresh_rating
  after insert or update or delete on public.course_reviews
  for each row execute function private.refresh_course_rating();

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

create trigger course_reviews_touch_updated_at
  before update on public.course_reviews
  for each row execute function private.touch_updated_at();

-- 3. Tutor follows -------------------------------------------------------------------------

create table public.tutor_follows (
  user_id text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  tutor_id uuid not null references public.tutors (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tutor_id)
);
create index tutor_follows_tutor_id_idx on public.tutor_follows (tutor_id);

alter table public.tutor_follows enable row level security;
create policy "Learners read their follows" on public.tutor_follows
  for select to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));
create policy "Learners follow tutors" on public.tutor_follows
  for insert to authenticated with check (user_id = ((select auth.jwt()) ->> 'sub'));
create policy "Learners unfollow tutors" on public.tutor_follows
  for delete to authenticated using (user_id = ((select auth.jwt()) ->> 'sub'));

grant select, insert, delete on public.tutor_follows to authenticated;
revoke all on public.tutor_follows from anon;

-- 4. Lesson resources ----------------------------------------------------------------------

create table public.lesson_resources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position int not null,
  title text not null,
  file_name text not null,
  size_bytes bigint not null check (size_bytes >= 0),
  mime_type text not null,
  storage_key text not null,
  credit text,
  created_at timestamptz not null default now(),
  unique (lesson_id, position)
);
comment on table public.lesson_resources is
  'Downloadable files for a lesson. storage_key is in the private R2 bucket; the lesson-resource Edge Function signs 1-hour download links for learners who can open the lesson.';

alter table public.lesson_resources enable row level security;
create policy "Learners read resources of lessons they can open" on public.lesson_resources
  for select to authenticated using (private.can_open_lesson(lesson_id, (select auth.jwt()) ->> 'sub'));

grant select on public.lesson_resources to authenticated;
revoke all on public.lesson_resources from anon;
