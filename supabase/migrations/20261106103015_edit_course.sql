-- Course editor (prompts/22): tutors read their drafts' outline and change their courses
-- through RPCs only (definer in private, invoker wrappers in public). The tutor role comes from
-- the Clerk session token (claims.metadata = public metadata), as in create_course (prompts/21).

-- 1. Ownership -----------------------------------------------------------------------------

create function private.owns_course(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select auth.jwt()) -> 'metadata' ->> 'role', '') = 'tutor'
    and exists (
      select 1
      from public.courses c
      join public.tutors t on t.id = c.tutor_id
      where c.id = p_course_id
        and t.profile_id = ((select auth.jwt()) ->> 'sub')
    );
$$;

create function private.require_course_owner(p_course_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_course_id is null or not private.owns_course(p_course_id) then
    raise exception 'Not allowed to change this course' using errcode = '42501';
  end if;
end;
$$;

create function private.check_outline_title(p_title text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
begin
  if char_length(v_title) not between 2 and 80 then
    raise exception 'Title must be 2 to 80 characters' using errcode = '22023';
  end if;
  return v_title;
end;
$$;

-- 2. Reading the outline: one SELECT policy per table ---------------------------------------

drop policy "Learners read chapters of published courses" on public.chapters;
create policy "Read chapters of published or own courses" on public.chapters
  for select to authenticated
  using (
    exists (select 1 from public.courses c where c.id = chapters.course_id and c.is_published)
    or private.owns_course(chapters.course_id)
  );

drop policy "Learners read lessons of published courses" on public.lessons;
create policy "Read lessons of published or own courses" on public.lessons
  for select to authenticated
  using (
    exists (
      select 1 from public.chapters ch join public.courses c on c.id = ch.course_id
      where ch.id = lessons.chapter_id
        and (c.is_published or private.owns_course(c.id))
    )
  );

drop policy "Learners read quizzes of published courses" on public.quizzes;
create policy "Read quizzes of published or own courses" on public.quizzes
  for select to authenticated
  using (
    exists (
      select 1 from public.chapters ch join public.courses c on c.id = ch.course_id
      where ch.id = quizzes.chapter_id
        and (c.is_published or private.owns_course(c.id))
    )
  );

-- 3. Course details and publishing ---------------------------------------------------------

create function private.update_course(
  p_course_id uuid, p_title text, p_subtitle text, p_description text,
  p_category text, p_level text, p_access text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := btrim(coalesce(p_title, ''));
  v_subtitle text := nullif(btrim(coalesce(p_subtitle, '')), '');
  v_description text := btrim(coalesce(p_description, ''));
begin
  perform private.require_course_owner(p_course_id);
  if char_length(v_title) not between 3 and 80 then
    raise exception 'Title must be 3 to 80 characters' using errcode = '22023';
  end if;
  if v_subtitle is not null and char_length(v_subtitle) > 120 then
    raise exception 'Subtitle must be 120 characters or fewer' using errcode = '22023';
  end if;
  if char_length(v_description) not between 20 and 2000 then
    raise exception 'Description must be 20 to 2000 characters' using errcode = '22023';
  end if;
  if p_level is null or p_level not in ('beginner', 'intermediate', 'advanced') then
    raise exception 'Unknown level' using errcode = '22023';
  end if;
  if p_access is null or p_access not in ('free', 'premium') then
    raise exception 'Unknown access' using errcode = '22023';
  end if;
  if not exists (select 1 from public.courses c where c.category = p_category) then
    raise exception 'Unknown category' using errcode = '22023';
  end if;
  update public.courses
  set title = v_title, subtitle = v_subtitle, description = v_description,
      category = p_category, level = p_level, access = p_access
  where id = p_course_id;
end;
$$;

create function private.set_course_published(p_course_id uuid, p_published boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_course_owner(p_course_id);
  if coalesce(p_published, false) and not exists (
    select 1 from public.lessons l join public.chapters ch on ch.id = l.chapter_id
    where ch.course_id = p_course_id
  ) then
    raise exception 'Add a lesson before publishing' using errcode = '22023';
  end if;
  update public.courses set is_published = coalesce(p_published, false) where id = p_course_id;
end;
$$;

-- 4. Chapters (positions stay 1..n; unique (course_id, position) needs a two-step renumber) --

create function private.renumber_chapters(p_course_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.chapters set position = -position where course_id = p_course_id;
  update public.chapters c set position = r.rn
  from (
    select id, row_number() over (order by position desc) as rn
    from public.chapters where course_id = p_course_id
  ) r
  where c.id = r.id;
$$;

create function private.add_chapter(p_course_id uuid, p_title text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := private.check_outline_title(p_title);
  v_id uuid;
begin
  perform private.require_course_owner(p_course_id);
  insert into public.chapters (course_id, title, position)
  values (
    p_course_id, v_title,
    coalesce((select max(position) from public.chapters where course_id = p_course_id), 0) + 1
  )
  returning id into v_id;
  return v_id;
end;
$$;

create function private.rename_chapter(p_chapter_id uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := private.check_outline_title(p_title);
begin
  perform private.require_course_owner((select course_id from public.chapters where id = p_chapter_id));
  update public.chapters set title = v_title where id = p_chapter_id;
end;
$$;

create function private.delete_chapter(p_chapter_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course uuid := (select course_id from public.chapters where id = p_chapter_id);
begin
  perform private.require_course_owner(v_course);
  delete from public.chapters where id = p_chapter_id;
  perform private.renumber_chapters(v_course);
end;
$$;

create function private.move_chapter(p_chapter_id uuid, p_direction int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_course uuid;
  v_pos int;
  v_other uuid;
  v_other_pos int;
begin
  select course_id, position into v_course, v_pos from public.chapters where id = p_chapter_id;
  perform private.require_course_owner(v_course);
  if p_direction < 0 then
    select id, position into v_other, v_other_pos from public.chapters
    where course_id = v_course and position < v_pos order by position desc limit 1;
  else
    select id, position into v_other, v_other_pos from public.chapters
    where course_id = v_course and position > v_pos order by position limit 1;
  end if;
  if v_other is null then
    return;
  end if;
  update public.chapters set position = -1 where id = p_chapter_id;
  update public.chapters set position = v_pos where id = v_other;
  update public.chapters set position = v_other_pos where id = p_chapter_id;
end;
$$;

-- 5. Lessons -------------------------------------------------------------------------------

create function private.renumber_lessons(p_chapter_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.lessons set position = -position where chapter_id = p_chapter_id;
  update public.lessons l set position = r.rn
  from (
    select id, row_number() over (order by position desc) as rn
    from public.lessons where chapter_id = p_chapter_id
  ) r
  where l.id = r.id;
$$;

create function private.add_lesson(p_chapter_id uuid, p_title text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := private.check_outline_title(p_title);
  v_id uuid;
begin
  perform private.require_course_owner((select course_id from public.chapters where id = p_chapter_id));
  insert into public.lessons (chapter_id, title, position, duration_seconds, is_preview)
  values (
    p_chapter_id, v_title,
    coalesce((select max(position) from public.lessons where chapter_id = p_chapter_id), 0) + 1,
    0, false
  )
  returning id into v_id;
  insert into public.lesson_contents (lesson_id, body) values (v_id, '');
  return v_id;
end;
$$;

create function private.delete_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter uuid := (select chapter_id from public.lessons where id = p_lesson_id);
begin
  perform private.require_course_owner((select course_id from public.chapters where id = v_chapter));
  delete from public.lessons where id = p_lesson_id;
  perform private.renumber_lessons(v_chapter);
end;
$$;

create function private.move_lesson(p_lesson_id uuid, p_direction int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chapter uuid;
  v_pos int;
  v_other uuid;
  v_other_pos int;
begin
  select chapter_id, position into v_chapter, v_pos from public.lessons where id = p_lesson_id;
  perform private.require_course_owner((select course_id from public.chapters where id = v_chapter));
  if p_direction < 0 then
    select id, position into v_other, v_other_pos from public.lessons
    where chapter_id = v_chapter and position < v_pos order by position desc limit 1;
  else
    select id, position into v_other, v_other_pos from public.lessons
    where chapter_id = v_chapter and position > v_pos order by position limit 1;
  end if;
  if v_other is null then
    return;
  end if;
  update public.lessons set position = -1 where id = p_lesson_id;
  update public.lessons set position = v_pos where id = v_other;
  update public.lessons set position = v_other_pos where id = p_lesson_id;
end;
$$;

-- 6. Grants and public wrappers --------------------------------------------------------------

revoke all on function
  private.owns_course(uuid), private.require_course_owner(uuid), private.check_outline_title(text),
  private.update_course(uuid, text, text, text, text, text, text),
  private.set_course_published(uuid, boolean),
  private.renumber_chapters(uuid), private.add_chapter(uuid, text), private.rename_chapter(uuid, text),
  private.delete_chapter(uuid), private.move_chapter(uuid, int),
  private.renumber_lessons(uuid), private.add_lesson(uuid, text), private.delete_lesson(uuid),
  private.move_lesson(uuid, int)
from public, anon;
grant execute on function
  private.owns_course(uuid), private.require_course_owner(uuid), private.check_outline_title(text),
  private.update_course(uuid, text, text, text, text, text, text),
  private.set_course_published(uuid, boolean),
  private.add_chapter(uuid, text), private.rename_chapter(uuid, text),
  private.delete_chapter(uuid), private.move_chapter(uuid, int),
  private.add_lesson(uuid, text), private.delete_lesson(uuid), private.move_lesson(uuid, int)
to authenticated;

create function public.update_course(
  p_course_id uuid, p_title text, p_subtitle text, p_description text,
  p_category text, p_level text, p_access text
)
returns void language sql security invoker set search_path = ''
as $$ select private.update_course(p_course_id, p_title, p_subtitle, p_description, p_category, p_level, p_access); $$;

create function public.set_course_published(p_course_id uuid, p_published boolean)
returns void language sql security invoker set search_path = ''
as $$ select private.set_course_published(p_course_id, p_published); $$;

create function public.add_chapter(p_course_id uuid, p_title text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_chapter(p_course_id, p_title); $$;

create function public.rename_chapter(p_chapter_id uuid, p_title text)
returns void language sql security invoker set search_path = ''
as $$ select private.rename_chapter(p_chapter_id, p_title); $$;

create function public.delete_chapter(p_chapter_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.delete_chapter(p_chapter_id); $$;

create function public.move_chapter(p_chapter_id uuid, p_direction int)
returns void language sql security invoker set search_path = ''
as $$ select private.move_chapter(p_chapter_id, p_direction); $$;

create function public.add_lesson(p_chapter_id uuid, p_title text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_lesson(p_chapter_id, p_title); $$;

create function public.delete_lesson(p_lesson_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.delete_lesson(p_lesson_id); $$;

create function public.move_lesson(p_lesson_id uuid, p_direction int)
returns void language sql security invoker set search_path = ''
as $$ select private.move_lesson(p_lesson_id, p_direction); $$;

revoke all on function
  public.update_course(uuid, text, text, text, text, text, text),
  public.set_course_published(uuid, boolean),
  public.add_chapter(uuid, text), public.rename_chapter(uuid, text),
  public.delete_chapter(uuid), public.move_chapter(uuid, int),
  public.add_lesson(uuid, text), public.delete_lesson(uuid), public.move_lesson(uuid, int)
from public, anon;
grant execute on function
  public.update_course(uuid, text, text, text, text, text, text),
  public.set_course_published(uuid, boolean),
  public.add_chapter(uuid, text), public.rename_chapter(uuid, text),
  public.delete_chapter(uuid), public.move_chapter(uuid, int),
  public.add_lesson(uuid, text), public.delete_lesson(uuid), public.move_lesson(uuid, int)
to authenticated;
