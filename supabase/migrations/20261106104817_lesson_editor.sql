-- Lesson editor (prompts/23): a tutor edits a lesson's title, notes and preview flag, sets its
-- uploaded video and adds/deletes resources. RPCs only (definer in private, invoker wrappers).
-- Tutor uploads live in R2 under uploads/<course_id>/<lesson_id>/; the RPCs accept only keys
-- under the lesson's own prefix. Files themselves are signed and deleted by the lesson-upload
-- Edge Function, which checks can_edit_lesson as the user first.

-- 1. Ownership -----------------------------------------------------------------------------

create function private.owns_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select private.owns_course(ch.course_id)
    from public.lessons l
    join public.chapters ch on ch.id = l.chapter_id
    where l.id = p_lesson_id
  ), false);
$$;

create function private.require_lesson_owner(p_lesson_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_lesson_id is null or not private.owns_lesson(p_lesson_id) then
    raise exception 'Not allowed to change this lesson' using errcode = '42501';
  end if;
end;
$$;

/** The R2 prefix a lesson's tutor uploads must use: uploads/<course_id>/<lesson_id>/ */
create function private.lesson_upload_prefix(p_lesson_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select 'uploads/' || ch.course_id::text || '/' || l.id::text || '/'
  from public.lessons l
  join public.chapters ch on ch.id = l.chapter_id
  where l.id = p_lesson_id;
$$;

create function private.check_upload_key(p_lesson_id uuid, p_key text, p_kind text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_prefix text := private.lesson_upload_prefix(p_lesson_id);
  v_name text;
begin
  if p_key is null or v_prefix is null or left(p_key, char_length(v_prefix)) <> v_prefix then
    raise exception 'That file doesn''t belong to this lesson' using errcode = '22023';
  end if;
  v_name := substr(p_key, char_length(v_prefix) + 1);
  if p_kind = 'video' and v_name !~ '^video-[0-9a-f]{12}\.(mp4|mov)$' then
    raise exception 'Unsupported video file' using errcode = '22023';
  end if;
  if p_kind = 'resource' and v_name !~ '^res-[0-9a-f]{12}\.(pdf|csv|txt|png|jpg|zip)$' then
    raise exception 'Unsupported resource file' using errcode = '22023';
  end if;
end;
$$;

create function public.can_edit_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.owns_lesson(p_lesson_id);
$$;

-- 2. Reading content: learners who can open the lesson, or its tutor -------------------------

drop policy "Learners read lessons they can open" on public.lesson_contents;
create policy "Read lessons they can open or own" on public.lesson_contents
  for select to authenticated
  using (
    private.can_open_lesson(lesson_id, ((select auth.jwt()) ->> 'sub'))
    or private.owns_lesson(lesson_id)
  );

drop policy "Learners read resources of lessons they can open" on public.lesson_resources;
create policy "Read resources of lessons they can open or own" on public.lesson_resources
  for select to authenticated
  using (
    private.can_open_lesson(lesson_id, ((select auth.jwt()) ->> 'sub'))
    or private.owns_lesson(lesson_id)
  );

-- 3. Lesson details --------------------------------------------------------------------------

create function private.update_lesson(p_lesson_id uuid, p_title text, p_body text, p_is_preview boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := private.check_outline_title(p_title);
  v_body text := coalesce(p_body, '');
begin
  perform private.require_lesson_owner(p_lesson_id);
  if char_length(v_body) > 30000 then
    raise exception 'Notes must be 30,000 characters or fewer' using errcode = '22023';
  end if;
  update public.lessons set title = v_title, is_preview = coalesce(p_is_preview, false) where id = p_lesson_id;
  insert into public.lesson_contents (lesson_id, body) values (p_lesson_id, v_body)
  on conflict (lesson_id) do update set body = excluded.body;
end;
$$;

-- 4. Video -----------------------------------------------------------------------------------

create function private.set_lesson_video(p_lesson_id uuid, p_key text, p_duration_seconds int)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  perform private.require_lesson_owner(p_lesson_id);
  perform private.check_upload_key(p_lesson_id, p_key, 'video');
  if p_duration_seconds is null or p_duration_seconds not between 1 and 36000 then
    raise exception 'Video length must be between 1 second and 10 hours' using errcode = '22023';
  end if;
  select video_key into v_old from public.lesson_contents where lesson_id = p_lesson_id;
  insert into public.lesson_contents (lesson_id, body, video_key) values (p_lesson_id, '', p_key)
  on conflict (lesson_id) do update set video_key = excluded.video_key, video_url = null;
  update public.lessons set duration_seconds = p_duration_seconds where id = p_lesson_id;
  return case when v_old is distinct from p_key then v_old end;
end;
$$;

create function private.remove_lesson_video(p_lesson_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  perform private.require_lesson_owner(p_lesson_id);
  select video_key into v_old from public.lesson_contents where lesson_id = p_lesson_id;
  update public.lesson_contents set video_key = null, video_url = null where lesson_id = p_lesson_id;
  update public.lessons set duration_seconds = 0 where id = p_lesson_id;
  return v_old;
end;
$$;

-- 5. Resources -------------------------------------------------------------------------------

create function private.add_lesson_resource(
  p_lesson_id uuid, p_title text, p_file_name text, p_size_bytes bigint, p_mime_type text, p_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := private.check_outline_title(p_title);
  v_file text := btrim(coalesce(p_file_name, ''));
  v_id uuid;
begin
  perform private.require_lesson_owner(p_lesson_id);
  perform private.check_upload_key(p_lesson_id, p_key, 'resource');
  if char_length(v_file) not between 1 and 200 then
    raise exception 'File name must be 1 to 200 characters' using errcode = '22023';
  end if;
  if p_size_bytes is null or p_size_bytes not between 1 and 26214400 then
    raise exception 'Files must be 25 MB or smaller' using errcode = '22023';
  end if;
  if p_mime_type is null or p_mime_type not in (
    'application/pdf', 'text/csv', 'text/plain', 'image/png', 'image/jpeg', 'application/zip'
  ) then
    raise exception 'Unsupported file type' using errcode = '22023';
  end if;
  insert into public.lesson_resources (lesson_id, position, title, file_name, size_bytes, mime_type, storage_key)
  values (
    p_lesson_id,
    coalesce((select max(position) from public.lesson_resources where lesson_id = p_lesson_id), 0) + 1,
    v_title, v_file, p_size_bytes, p_mime_type, p_key
  )
  returning id into v_id;
  return v_id;
end;
$$;

create function private.delete_lesson_resource(p_resource_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lesson uuid;
  v_key text;
begin
  select lesson_id, storage_key into v_lesson, v_key from public.lesson_resources where id = p_resource_id;
  perform private.require_lesson_owner(v_lesson);
  delete from public.lesson_resources where id = p_resource_id;
  update public.lesson_resources set position = -position where lesson_id = v_lesson;
  update public.lesson_resources r set position = n.rn
  from (
    select id, row_number() over (order by position desc) as rn
    from public.lesson_resources where lesson_id = v_lesson
  ) n
  where r.id = n.id;
  return v_key;
end;
$$;

-- 6. Grants and public wrappers --------------------------------------------------------------

revoke all on function
  private.owns_lesson(uuid), private.require_lesson_owner(uuid), private.lesson_upload_prefix(uuid),
  private.check_upload_key(uuid, text, text),
  private.update_lesson(uuid, text, text, boolean),
  private.set_lesson_video(uuid, text, int), private.remove_lesson_video(uuid),
  private.add_lesson_resource(uuid, text, text, bigint, text, text), private.delete_lesson_resource(uuid),
  public.can_edit_lesson(uuid)
from public, anon;
grant execute on function
  private.owns_lesson(uuid), private.require_lesson_owner(uuid), private.lesson_upload_prefix(uuid),
  private.check_upload_key(uuid, text, text),
  private.update_lesson(uuid, text, text, boolean),
  private.set_lesson_video(uuid, text, int), private.remove_lesson_video(uuid),
  private.add_lesson_resource(uuid, text, text, bigint, text, text), private.delete_lesson_resource(uuid),
  public.can_edit_lesson(uuid)
to authenticated;

create function public.update_lesson(p_lesson_id uuid, p_title text, p_body text, p_is_preview boolean)
returns void language sql security invoker set search_path = ''
as $$ select private.update_lesson(p_lesson_id, p_title, p_body, p_is_preview); $$;

create function public.set_lesson_video(p_lesson_id uuid, p_key text, p_duration_seconds int)
returns text language sql security invoker set search_path = ''
as $$ select private.set_lesson_video(p_lesson_id, p_key, p_duration_seconds); $$;

create function public.remove_lesson_video(p_lesson_id uuid)
returns text language sql security invoker set search_path = ''
as $$ select private.remove_lesson_video(p_lesson_id); $$;

create function public.add_lesson_resource(
  p_lesson_id uuid, p_title text, p_file_name text, p_size_bytes bigint, p_mime_type text, p_key text
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_lesson_resource(p_lesson_id, p_title, p_file_name, p_size_bytes, p_mime_type, p_key); $$;

create function public.delete_lesson_resource(p_resource_id uuid)
returns text language sql security invoker set search_path = ''
as $$ select private.delete_lesson_resource(p_resource_id); $$;

revoke all on function
  public.update_lesson(uuid, text, text, boolean),
  public.set_lesson_video(uuid, text, int), public.remove_lesson_video(uuid),
  public.add_lesson_resource(uuid, text, text, bigint, text, text), public.delete_lesson_resource(uuid)
from public, anon;
grant execute on function
  public.update_lesson(uuid, text, text, boolean),
  public.set_lesson_video(uuid, text, int), public.remove_lesson_video(uuid),
  public.add_lesson_resource(uuid, text, text, bigint, text, text), public.delete_lesson_resource(uuid)
to authenticated;
