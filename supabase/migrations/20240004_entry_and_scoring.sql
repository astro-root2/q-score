create table if not exists public.entry_forms (
  id            uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  title         text not null default 'エントリーフォーム',
  description   text,
  fields        jsonb not null default '[]',
  is_open       boolean not null default false,
  created_at    timestamptz not null default now()
);
create table if not exists public.entry_responses (
  id             uuid primary key default gen_random_uuid(),
  form_id        uuid not null references public.entry_forms(id) on delete cascade,
  tournament_id  uuid not null,
  data           jsonb not null default '{}',
  participant_id uuid references public.participants(id) on delete set null,
  created_at     timestamptz not null default now()
);
alter table public.paper_questions add column if not exists points int not null default 1;
alter table public.entry_forms    enable row level security;
alter table public.entry_responses enable row level security;
create policy "owner_all" on public.entry_forms for all using (
  exists (select 1 from public.tournaments t where t.id = tournament_id and t.owner_id = auth.uid())
);
create policy "public_insert" on public.entry_responses for insert with check (true);
create policy "owner_select" on public.entry_responses for select using (
  exists (select 1 from public.entry_forms ef join public.tournaments t on t.id = ef.tournament_id
          where ef.id = form_id and t.owner_id = auth.uid())
);
create policy "owner_delete" on public.entry_responses for delete using (
  exists (select 1 from public.entry_forms ef join public.tournaments t on t.id = ef.tournament_id
          where ef.id = form_id and t.owner_id = auth.uid())
);
create policy "owner_update" on public.entry_responses for update using (
  exists (select 1 from public.entry_forms ef join public.tournaments t on t.id = ef.tournament_id
          where ef.id = form_id and t.owner_id = auth.uid())
);
