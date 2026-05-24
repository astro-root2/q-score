alter table public.participants
  add column if not exists nickname text,
  add column if not exists affiliation text,
  add column if not exists grade text,
  add column if not exists paper_rank int;

alter table public.matches add column if not exists question_text text;
alter table public.tournaments
  add column if not exists color_config jsonb not null default '{}',
  add column if not exists display_config jsonb not null default '{}',
  add column if not exists logo_url text;

create table if not exists public.paper_rounds (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null default 'ペーパー1回戦',
  order_index int not null default 0,
  time_limit_seconds int,
  ranking_priority jsonb not null default '["raw_score","proximity","chain1","chain2","chain3"]',
  created_at timestamptz not null default now()
);

create table if not exists public.paper_questions (
  id uuid primary key default gen_random_uuid(),
  paper_round_id uuid not null references public.paper_rounds(id) on delete cascade,
  order_index int not null,
  question_text text not null default '',
  correct_answer text not null default '',
  question_type text not null default 'regular' check (question_type in ('regular','proximity')),
  created_at timestamptz not null default now()
);

create table if not exists public.paper_submissions (
  id uuid primary key default gen_random_uuid(),
  paper_round_id uuid not null references public.paper_rounds(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  photo_url text,
  submitted_at timestamptz,
  raw_score int not null default 0,
  proximity_error numeric,
  chain1 int not null default 0,
  chain2 int not null default 0,
  chain3 int not null default 0,
  answers jsonb not null default '[]',
  created_at timestamptz not null default now(),
  unique (paper_round_id, participant_id)
);

alter table public.paper_rounds enable row level security;
alter table public.paper_questions enable row level security;
alter table public.paper_submissions enable row level security;

create policy "owner_all" on public.paper_rounds for all using (
  exists (select 1 from public.tournaments t where t.id = tournament_id and t.owner_id = auth.uid()));
create policy "owner_all" on public.paper_questions for all using (
  exists (select 1 from public.paper_rounds pr join public.tournaments t on t.id = pr.tournament_id where pr.id = paper_round_id and t.owner_id = auth.uid()));
create policy "owner_all" on public.paper_submissions for all using (
  exists (select 1 from public.paper_rounds pr join public.tournaments t on t.id = pr.tournament_id where pr.id = paper_round_id and t.owner_id = auth.uid()));
