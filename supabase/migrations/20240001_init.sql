create extension if not exists "pgcrypto";

create table public.tournaments (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  status      text not null default 'draft' check (status in ('draft','active','completed')),
  theme_color text not null default '#6366f1',
  settings    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

create table public.teams (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name          text not null,
  created_at    timestamptz not null default now()
);

create table public.participants (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id       uuid references public.teams(id) on delete set null,
  name          text not null,
  ruby          text,
  status        text not null default 'active' check (status in ('active','withdrawn')),
  created_at    timestamptz not null default now()
);

create table public.rounds (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name          text not null,
  order_index   int not null default 0,
  rule_id       text not null,
  rule_params   jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create table public.matches (
  id            uuid primary key default gen_random_uuid(),
  round_id      uuid not null references public.rounds(id) on delete cascade,
  match_num     int not null default 1,
  name          text,
  status        text not null default 'pending' check (status in ('pending','active','paused','completed')),
  game_state    jsonb,
  display_token text not null default encode(gen_random_bytes(16), 'hex'),
  obs_token     text not null default encode(gen_random_bytes(16), 'hex'),
  staff_token   text not null default encode(gen_random_bytes(16), 'hex'),
  created_at    timestamptz not null default now()
);

create table public.questions (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  order_index   int not null default 0,
  body          text not null default '',
  answer        text not null default '',
  genre         text,
  difficulty    int not null default 1 check (difficulty between 1 and 5),
  note          text,
  used          boolean not null default false,
  created_at    timestamptz not null default now()
);

create table public.game_events (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  seq         int not null,
  event_type  text not null,
  actor_id    uuid references public.participants(id) on delete set null,
  operator_id uuid references auth.users(id) on delete set null,
  payload     jsonb not null default '{}',
  undone      boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (match_id, seq)
);

alter table public.tournaments  enable row level security;
alter table public.teams        enable row level security;
alter table public.participants enable row level security;
alter table public.rounds       enable row level security;
alter table public.matches      enable row level security;
alter table public.questions    enable row level security;
alter table public.game_events  enable row level security;

create policy "owner_all" on public.tournaments
  for all using (auth.uid() = owner_id);

create policy "owner_all" on public.teams
  for all using (
    exists (select 1 from public.tournaments t
            where t.id = tournament_id and t.owner_id = auth.uid())
  );

create policy "owner_all" on public.participants
  for all using (
    exists (select 1 from public.tournaments t
            where t.id = tournament_id and t.owner_id = auth.uid())
  );

create policy "owner_all" on public.rounds
  for all using (
    exists (select 1 from public.tournaments t
            where t.id = tournament_id and t.owner_id = auth.uid())
  );

create policy "owner_all" on public.matches
  for all using (
    exists (
      select 1 from public.rounds r
      join public.tournaments t on t.id = r.tournament_id
      where r.id = round_id and t.owner_id = auth.uid()
    )
  );

create policy "public_read_by_token" on public.matches
  for select using (true);

create policy "owner_all" on public.questions
  for all using (
    exists (select 1 from public.tournaments t
            where t.id = tournament_id and t.owner_id = auth.uid())
  );

create policy "owner_all" on public.game_events
  for all using (
    exists (
      select 1 from public.matches m
      join public.rounds r on r.id = m.round_id
      join public.tournaments t on t.id = r.tournament_id
      where m.id = match_id and t.owner_id = auth.uid()
    )
  );

create policy "public_read" on public.game_events
  for select using (true);
