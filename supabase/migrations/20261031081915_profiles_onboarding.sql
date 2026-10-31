-- Onboarding answers (prompts/07): the goal and interests a learner picks before signing
-- up, saved to their own profile after sign-up. The existing own-row RLS policies cover
-- these columns.
alter table public.profiles
  add column onboarding_goal text
    check (onboarding_goal in ('career_advancement', 'switch_career', 'personal_growth', 'certifications')),
  add column interests text[] not null default '{}'
    check (interests <@ array['design', 'development', 'marketing', 'business', 'data', 'photography']),
  add column onboarding_completed_at timestamptz;
