-- Syllo's first schema (prompts/04-supabase.md).
-- Who the user is comes from Clerk: Supabase trusts Clerk session tokens (third-party
-- auth), so auth.jwt()->>'sub' is the Clerk user id and every signed-in request runs as
-- the `authenticated` role. Course content is read-only for learners; tutors write it in Part 2.

-- Profiles: one row per learner, keyed by the Clerk user id. The app upserts it on sign-in.
create table public.profiles (
  id text primary key default (auth.jwt() ->> 'sub'),
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Tutors: course creators. profile_id links a tutor to a Clerk user in Part 2.
create table public.tutors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  headline text,
  bio text,
  avatar_url text,
  profile_id text unique references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  description text,
  cover_image_url text,
  category text,
  level text check (level in ('beginner', 'intermediate', 'advanced')),
  tutor_id uuid not null references public.tutors (id),
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index courses_tutor_id_idx on public.courses (tutor_id);

create table public.chapters (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses (id) on delete cascade,
  title text not null,
  position int not null,
  unique (course_id, position)
);

-- Lessons are the outline (readable before enrolling)...
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  title text not null,
  position int not null,
  duration_seconds int not null default 0,
  is_preview boolean not null default false,
  unique (chapter_id, position)
);

-- ...and their content is what enrolling unlocks (or a free preview).
create table public.lesson_contents (
  lesson_id uuid primary key references public.lessons (id) on delete cascade,
  video_url text,
  body text
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default (auth.jwt() ->> 'sub') references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, course_id)
);
create index enrollments_course_id_idx on public.enrollments (course_id);

-- Row-level security: everything is closed unless a policy below opens it, and only to
-- signed-in learners (`authenticated`). Anonymous requests read nothing.
alter table public.profiles enable row level security;
alter table public.tutors enable row level security;
alter table public.courses enable row level security;
alter table public.chapters enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_contents enable row level security;
alter table public.enrollments enable row level security;

-- Profiles: a learner sees and edits only their own row.
create policy "Learners read their own profile" on public.profiles
  for select to authenticated using (id = (select auth.jwt() ->> 'sub'));
create policy "Learners create their own profile" on public.profiles
  for insert to authenticated with check (id = (select auth.jwt() ->> 'sub'));
create policy "Learners update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.jwt() ->> 'sub'))
  with check (id = (select auth.jwt() ->> 'sub'));
create policy "Learners delete their own profile" on public.profiles
  for delete to authenticated using (id = (select auth.jwt() ->> 'sub'));

-- The catalogue: tutors, published courses and their outline are readable by every learner.
create policy "Learners read tutors" on public.tutors
  for select to authenticated using (true);
create policy "Learners read published courses" on public.courses
  for select to authenticated using (is_published);
create policy "Learners read chapters of published courses" on public.chapters
  for select to authenticated using (
    exists (select 1 from public.courses c where c.id = course_id and c.is_published)
  );
create policy "Learners read lessons of published courses" on public.lessons
  for select to authenticated using (
    exists (
      select 1
      from public.chapters ch
      join public.courses c on c.id = ch.course_id
      where ch.id = chapter_id and c.is_published
    )
  );

-- Lesson content: free previews, or every lesson of a course the learner is enrolled in.
create policy "Learners read previews and enrolled lessons" on public.lesson_contents
  for select to authenticated using (
    exists (
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

-- Enrollments: a learner manages only their own, and only in published courses.
create policy "Learners read their enrollments" on public.enrollments
  for select to authenticated using (user_id = (select auth.jwt() ->> 'sub'));
create policy "Learners enroll themselves in published courses" on public.enrollments
  for insert to authenticated with check (
    user_id = (select auth.jwt() ->> 'sub')
    and exists (select 1 from public.courses c where c.id = course_id and c.is_published)
  );
create policy "Learners leave their own courses" on public.enrollments
  for delete to authenticated using (user_id = (select auth.jwt() ->> 'sub'));

-- Data API privileges, explicit so they don't depend on the project's default grants.
-- RLS above still decides which rows each request can touch.
revoke all on public.profiles, public.tutors, public.courses, public.chapters,
  public.lessons, public.lesson_contents, public.enrollments from anon;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.tutors, public.courses, public.chapters, public.lessons, public.lesson_contents
  to authenticated;
grant select, insert, delete on public.enrollments to authenticated;
