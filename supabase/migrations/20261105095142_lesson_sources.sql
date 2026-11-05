-- prompts/19: credits for lessons adapted from openly licensed sources. One row per source a
-- lesson was adapted from (role 'adapted') or points to for more (role 'further_reading').
-- Written only by the generated seed (seeds/course-content.sql); readable by signed-in learners
-- for published courses, like the outline (credits aren't secret, even for locked lessons).

create table public.lesson_sources (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  position int not null check (position >= 1),
  title text not null check (char_length(title) between 1 and 200),
  -- The credit owner, e.g. "Meta Platforms, Inc. and affiliates".
  author text not null,
  -- The public page (or the pinned repository file when the live page is gone).
  url text not null check (url ~ '^https://'),
  licence text not null,
  licence_url text not null check (licence_url ~ '^https://'),
  -- A statement the licence requires, e.g. the OGL v3.0 attribution statement.
  attribution_note text,
  role text not null default 'adapted' check (role in ('adapted', 'further_reading')),
  unique (lesson_id, position)
);

comment on table public.lesson_sources is
  'Sources each lesson was adapted from or links to (prompts/19). Generated from seeds/source/course-sources.json; never written by learners.';

alter table public.lesson_sources enable row level security;

create policy "Learners read sources of published courses" on public.lesson_sources
  for select to authenticated using (
    exists (
      select 1
      from public.lessons l
      join public.chapters ch on ch.id = l.chapter_id
      join public.courses c on c.id = ch.course_id
      where l.id = lesson_id and c.is_published
    )
  );

revoke all on public.lesson_sources from anon, authenticated;
grant select on public.lesson_sources to authenticated;
