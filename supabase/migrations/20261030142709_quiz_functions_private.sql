-- The security advisor (authenticated_security_definer_function_executable) flags SECURITY
-- DEFINER functions in the exposed `public` schema. Its remedy: keep the privileged code
-- out of the exposed schema. The quiz functions move to `private` (not exposed by the Data
-- API) unchanged, and `public` keeps thin SECURITY INVOKER wrappers the app calls through
-- /rest/v1/rpc/. Behaviour and access checks are identical.

alter function public.start_quiz_attempt(uuid) set schema private;
alter function public.answer_quiz_question(uuid, uuid, uuid) set schema private;
alter function public.finish_quiz_attempt(uuid) set schema private;

create function public.start_quiz_attempt(p_quiz_id uuid)
returns public.quiz_attempts
language sql
security invoker
set search_path = ''
as $$
  select * from private.start_quiz_attempt(p_quiz_id);
$$;

create function public.answer_quiz_question(p_attempt_id uuid, p_question_id uuid, p_answer_id uuid default null)
returns table (is_correct boolean, correct_answer_id uuid, explanation text)
language sql
security invoker
set search_path = ''
as $$
  select * from private.answer_quiz_question(p_attempt_id, p_question_id, p_answer_id);
$$;

create function public.finish_quiz_attempt(p_attempt_id uuid)
returns public.quiz_attempts
language sql
security invoker
set search_path = ''
as $$
  select * from private.finish_quiz_attempt(p_attempt_id);
$$;

revoke all on function public.start_quiz_attempt(uuid) from public, anon;
revoke all on function public.answer_quiz_question(uuid, uuid, uuid) from public, anon;
revoke all on function public.finish_quiz_attempt(uuid) from public, anon;
grant execute on function public.start_quiz_attempt(uuid) to authenticated;
grant execute on function public.answer_quiz_question(uuid, uuid, uuid) to authenticated;
grant execute on function public.finish_quiz_attempt(uuid) to authenticated;
