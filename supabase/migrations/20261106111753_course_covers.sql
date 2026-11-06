-- Course covers (prompts/24): a tutor's uploaded cover lives in the private R2 bucket under
-- uploads/<course_id>/cover-<12 hex>.jpg|png and is shown through signed links (course-cover
-- Edge Function). courses.cover_image_url stays for outside links.

alter table public.courses add column cover_key text;

create function public.can_edit_course(p_course_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select private.owns_course(p_course_id);
$$;

create function private.set_course_cover(p_course_id uuid, p_key text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  perform private.require_course_owner(p_course_id);
  if p_key is null or p_key !~ ('^uploads/' || p_course_id::text || '/cover-[0-9a-f]{12}\.(jpg|png)$') then
    raise exception 'That image doesn''t belong to this course' using errcode = '22023';
  end if;
  select cover_key into v_old from public.courses where id = p_course_id;
  update public.courses set cover_key = p_key where id = p_course_id;
  return case when v_old is distinct from p_key then v_old end;
end;
$$;

create function private.remove_course_cover(p_course_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  perform private.require_course_owner(p_course_id);
  select cover_key into v_old from public.courses where id = p_course_id;
  update public.courses set cover_key = null where id = p_course_id;
  return v_old;
end;
$$;

create function public.set_course_cover(p_course_id uuid, p_key text)
returns text language sql security invoker set search_path = ''
as $$ select private.set_course_cover(p_course_id, p_key); $$;

create function public.remove_course_cover(p_course_id uuid)
returns text language sql security invoker set search_path = ''
as $$ select private.remove_course_cover(p_course_id); $$;

revoke all on function
  public.can_edit_course(uuid),
  private.set_course_cover(uuid, text), private.remove_course_cover(uuid),
  public.set_course_cover(uuid, text), public.remove_course_cover(uuid)
from public, anon;
grant execute on function
  public.can_edit_course(uuid),
  private.set_course_cover(uuid, text), private.remove_course_cover(uuid),
  public.set_course_cover(uuid, text), public.remove_course_cover(uuid)
to authenticated;
