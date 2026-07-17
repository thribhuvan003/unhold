-- Post-letter follow-through: user-reported case outcomes.
-- Insert-only log; latest row per case wins. Powers /impact "accounts reported
-- unfrozen" and the outcome_logged analytics funnel step. One row per
-- (case, outcome) so repeat taps are idempotent.

create table if not exists public.case_outcomes (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  outcome text not null check (
    outcome in ('unfrozen', 'partially_unfrozen', 'response_received', 'still_frozen')
  ),
  testimonial_opt_in boolean not null default false,
  testimonial_text text check (char_length(testimonial_text) <= 600),
  reported_at timestamptz not null default now()
);

create unique index if not exists case_outcomes_case_outcome_uniq
  on public.case_outcomes (case_id, outcome);
create index if not exists case_outcomes_outcome_idx
  on public.case_outcomes (outcome);

-- Server-only data boundary (same posture as all application tables):
-- RLS on, no policies, no grants to anon/authenticated. Authorised server
-- routes use the service role after explicit owner checks.
alter table public.case_outcomes enable row level security;
revoke all on public.case_outcomes from anon, authenticated;
