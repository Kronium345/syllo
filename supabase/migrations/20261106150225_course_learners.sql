-- Course learners for tutors (prompts/26). Tutors can't read enrollments, profiles or other
-- learners' progress directly; these two owner-checked RPCs give them exactly what the Learners
-- page needs: name, photo, enrol date and lesson progress (no emails), and removing an enrolment.

create function private.course_learners(p_course_id uuid)
returns table (
  user_id text,
  full_name text,
  avatar_url text,
  enrolled_at timestamptz,
  lessons_done int,
  lessons_total int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total int;
begin
  perform private.require_course_owner(p_course_id);
  select count(*)::int into v_total
  from public.lessons l join public.chapters ch on ch.id = l.chapter_id
  where ch.course_id = p_course_id;

  return query
  select
    e.user_id,
    p.full_name,
    p.avatar_url,
    e.created_at,
    (
      select count(*)::int
      from public.lesson_progress lp
      join public.lessons l on l.id = lp.lesson_id
      join public.chapters ch on ch.id = l.chapter_id
      where lp.user_id = e.user_id and ch.course_id = p_course_id
    ),
    v_total
  from public.enrollments e
  left join public.profiles p on p.id = e.user_id
  where e.course_id = p_course_id
  order by e.created_at desc;
end;
$$;

create function private.remove_learner(p_course_id uuid, p_user_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.require_course_owner(p_course_id);
  delete from public.enrollments where course_id = p_course_id and user_id = p_user_id;
  if not found then
    raise exception 'That learner isn''t enrolled in this course' using errcode = '22023';
  end if;
  -- lesson_progress is kept on purpose: it comes back if they enrol again.
end;
$$;

create function public.course_learners(p_course_id uuid)
returns table (
  user_id text,
  full_name text,
  avatar_url text,
  enrolled_at timestamptz,
  lessons_done int,
  lessons_total int
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.course_learners(p_course_id); $$;

create function public.remove_learner(p_course_id uuid, p_user_id text)
returns void language sql security invoker set search_path = ''
as $$ select private.remove_learner(p_course_id, p_user_id); $$;

revoke all on function
  private.course_learners(uuid), private.remove_learner(uuid, text),
  public.course_learners(uuid), public.remove_learner(uuid, text)
from public, anon;
grant execute on function
  private.course_learners(uuid), private.remove_learner(uuid, text),
  public.course_learners(uuid), public.remove_learner(uuid, text)
to authenticated;
