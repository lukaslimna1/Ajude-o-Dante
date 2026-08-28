-- Migration: Create dante_campaign table
create table if not exists public.dante_campaign (
  id text primary key,
  goal_cents bigint not null check (goal_cents >= 0),
  confirmed_cents bigint not null default 0 check (confirmed_cents >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.dante_campaign enable row level security;

-- Allow public read-only access
drop policy if exists "Allow public read-only access on dante_campaign" on public.dante_campaign;
create policy "Allow public read-only access on dante_campaign"
  on public.dante_campaign
  for select
  using (true);

-- Insert initial record for main campaign
insert into public.dante_campaign (id, goal_cents, confirmed_cents)
values ('main', 350000, 0)
on conflict (id) do nothing;
