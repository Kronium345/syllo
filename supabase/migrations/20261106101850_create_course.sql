-- Tutors create draft courses (prompts/21). One RPC, no insert policies on courses/tutors.
-- The tutor role comes from the Clerk session token: claims.metadata = the user's public
-- metadata, so `metadata.role = 'tutor'` is checked here, on the server.

create function private.create_course(
  p_title text,
  p_subtitle text,
  p_description text,
  p_category text,
  p_level text,
  p_access text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user text := (select auth.jwt()) ->> 'sub';
  v_role text := (select auth.jwt()) -> 'metadata' ->> 'role';
  v_title text := btrim(coalesce(p_title, ''));
  v_subtitle text := nullif(btrim(coalesce(p_subtitle, '')), '');
  v_description text := btrim(coalesce(p_description, ''));
  v_tutor uuid;
  v_base text;
  v_id uuid;
begin
  if v_user is null or v_role is distinct from 'tutor' then
    raise exception 'Only tutors can create courses' using errcode = '42501';
  end if;

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

  -- The tutor row links courses to this Clerk user; made on first use.
  select t.id into v_tutor from public.tutors t where t.profile_id = v_user;
  if v_tutor is null then
    insert into public.tutors (name, profile_id)
    values (
      coalesce((select nullif(btrim(p.full_name), '') from public.profiles p where p.id = v_user), 'New tutor'),
      v_user
    )
    returning id into v_tutor;
  end if;

  v_base := left(btrim(regexp_replace(lower(v_title), '[^a-z0-9]+', '-', 'g'), '-'), 60);
  if v_base = '' then
    v_base := 'course';
  end if;

  for attempt in 1..5 loop
    begin
      insert into public.courses (slug, title, subtitle, description, category, level, access, tutor_id, is_published)
      values (
        v_base || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6),
        v_title, v_subtitle, v_description, p_category, p_level, p_access, v_tutor, false
      )
      returning id into v_id;
      return v_id;
    exception when unique_violation then
      if attempt = 5 then
        raise;
      end if;
    end;
  end loop;
  return null;
end;
$$;
revoke all on function private.create_course(text, text, text, text, text, text) from public, anon;
grant execute on function private.create_course(text, text, text, text, text, text) to authenticated;

create function public.create_course(
  p_title text,
  p_subtitle text,
  p_description text,
  p_category text,
  p_level text,
  p_access text
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.create_course(p_title, p_subtitle, p_description, p_category, p_level, p_access);
$$;
revoke all on function public.create_course(text, text, text, text, text, text) from public, anon;
grant execute on function public.create_course(text, text, text, text, text, text) to authenticated;
