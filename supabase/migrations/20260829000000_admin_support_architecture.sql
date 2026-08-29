-- Migration: Admin authorization table, support types (financial & non-financial), hardened SECURITY DEFINER functions with search_path, explicit table grants, and updated trigger

-- 1. Create table dante_admins for verified admin users
create table if not exists public.dante_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notes text null,
  created_at timestamptz not null default now()
);

-- Enable RLS on dante_admins
alter table public.dante_admins enable row level security;

-- Explicit table grants for dante_admins (never accessible via Data API for anon or authenticated)
revoke all on table public.dante_admins from anon, authenticated, public;
grant select, insert, update, delete on table public.dante_admins to service_role;

-- Helper function to check if current user is an authorized admin
create or replace function public.is_dante_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.dante_admins
    where user_id = auth.uid()
  );
$$;

-- Restrict is_dante_admin to authenticated and service_role only (never anon/public)
revoke all on function public.is_dante_admin() from public, anon;
grant execute on function public.is_dante_admin() to authenticated, service_role;

-- 2. Add incremental columns to dante_contributions with backward-compatible defaults
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'dante_contributions' and column_name = 'supporter_type') then
    alter table public.dante_contributions add column supporter_type text not null default 'person';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'dante_contributions' and column_name = 'support_type') then
    alter table public.dante_contributions add column support_type text not null default 'financial';
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'dante_contributions' and column_name = 'counts_for_goal') then
    alter table public.dante_contributions add column counts_for_goal boolean not null default true;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'dante_contributions' and column_name = 'description') then
    alter table public.dante_contributions add column description text null;
  end if;
end $$;

-- 3. Adjust constraints on dante_contributions
alter table public.dante_contributions alter column amount_cents drop not null;

alter table public.dante_contributions drop constraint if exists dante_contributions_amount_cents_check;
alter table public.dante_contributions drop constraint if exists chk_dante_contributions_supporter_type;
alter table public.dante_contributions drop constraint if exists chk_dante_contributions_support_type;
alter table public.dante_contributions drop constraint if exists chk_dante_contributions_amount_by_type;

alter table public.dante_contributions
  add constraint chk_dante_contributions_supporter_type
  check (supporter_type in ('person', 'organization'));

alter table public.dante_contributions
  add constraint chk_dante_contributions_support_type
  check (support_type in ('financial', 'material', 'service', 'publicity', 'other'));

alter table public.dante_contributions
  add constraint chk_dante_contributions_amount_by_type
  check (
    (support_type = 'financial' and amount_cents is not null and amount_cents > 0)
    or
    (support_type <> 'financial' and (amount_cents is null or amount_cents > 0))
  );

-- Explicit table grants for dante_contributions
revoke all on table public.dante_contributions from anon, public;
grant select, insert, update, delete on table public.dante_contributions to authenticated;
grant select, insert, update, delete on table public.dante_contributions to service_role;

-- 4. RLS Policies on dante_contributions (strictly controlled via is_dante_admin)
drop policy if exists "Admins have full access on dante_contributions" on public.dante_contributions;
create policy "Admins have full access on dante_contributions"
  on public.dante_contributions
  for all
  using (public.is_dante_admin())
  with check (public.is_dante_admin());

-- Remove any full-access administrative policy on dante_campaign (total is strictly derived via ledger trigger)
drop policy if exists "Admins have full access on dante_campaign" on public.dante_campaign;

-- 5. Updated trigger function to calculate campaign total strictly from approved & counted contributions
create or replace function public.recalculate_dante_campaign_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.dante_campaign
  set confirmed_cents = (
    select coalesce(sum(amount_cents), 0)
    from public.dante_contributions
    where status = 'approved'
      and counts_for_goal = true
      and amount_cents is not null
  ),
  updated_at = now()
  where id = 'main';

  return null;
end;
$$;

-- Restrict trigger function execution from direct public/client calls
revoke all on function public.recalculate_dante_campaign_total() from public, anon, authenticated;

-- 6. Hardening the existing register_dante_contribution RPC (EXACT 14 parameters preserved, exclusively for service_role)
create or replace function public.register_dante_contribution(
  p_dedupe_key text,
  p_source text,
  p_amount_cents bigint,
  p_status text,
  p_donor_name text default null,
  p_public_name boolean default false,
  p_public_display_name text default null,
  p_occurred_at timestamptz default now(),
  p_provider text default null,
  p_provider_payment_id text default null,
  p_pix_end_to_end_id text default null,
  p_transaction_id text default null,
  p_institution text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_contribution public.dante_contributions%rowtype;
  v_confirmed_cents bigint;
begin
  -- Validate constraints
  if p_amount_cents <= 0 then
    raise exception 'amount_cents must be greater than 0';
  end if;

  if p_source not in ('mercado_pago', 'pix_direct', 'cash', 'clinic_direct', 'manual') then
    raise exception 'invalid source: %', p_source;
  end if;

  if p_status not in ('pending', 'approved', 'cancelled', 'refunded', 'rejected', 'charged_back') then
    raise exception 'invalid status: %', p_status;
  end if;

  -- Upsert contribution based on dedupe_key (table defaults automatically set supporter_type='person', support_type='financial', counts_for_goal=true)
  insert into public.dante_contributions (
    dedupe_key,
    source,
    amount_cents,
    status,
    donor_name,
    public_name,
    public_display_name,
    occurred_at,
    provider,
    provider_payment_id,
    pix_end_to_end_id,
    transaction_id,
    institution,
    notes,
    supporter_type,
    support_type,
    counts_for_goal,
    updated_at
  )
  values (
    p_dedupe_key,
    p_source,
    p_amount_cents,
    p_status,
    p_donor_name,
    p_public_name,
    p_public_display_name,
    coalesce(p_occurred_at, now()),
    p_provider,
    p_provider_payment_id,
    p_pix_end_to_end_id,
    p_transaction_id,
    p_institution,
    p_notes,
    'person',
    'financial',
    true,
    now()
  )
  on conflict (dedupe_key) do update set
    amount_cents = excluded.amount_cents,
    status = excluded.status,
    donor_name = coalesce(excluded.donor_name, public.dante_contributions.donor_name),
    public_name = excluded.public_name,
    public_display_name = coalesce(excluded.public_display_name, public.dante_contributions.public_display_name),
    occurred_at = coalesce(excluded.occurred_at, public.dante_contributions.occurred_at),
    provider = coalesce(excluded.provider, public.dante_contributions.provider),
    provider_payment_id = coalesce(excluded.provider_payment_id, public.dante_contributions.provider_payment_id),
    pix_end_to_end_id = coalesce(excluded.pix_end_to_end_id, public.dante_contributions.pix_end_to_end_id),
    transaction_id = coalesce(excluded.transaction_id, public.dante_contributions.transaction_id),
    institution = coalesce(excluded.institution, public.dante_contributions.institution),
    notes = coalesce(excluded.notes, public.dante_contributions.notes),
    updated_at = now()
  returning * into v_contribution;

  -- Query updated campaign total
  select confirmed_cents into v_confirmed_cents
  from public.dante_campaign
  where id = 'main';

  return jsonb_build_object(
    'id', v_contribution.id,
    'dedupe_key', v_contribution.dedupe_key,
    'status', v_contribution.status,
    'amount_cents', v_contribution.amount_cents,
    'confirmed_cents', coalesce(v_confirmed_cents, 0)
  );
end;
$$;

-- Restrict RPC execution strictly to service_role (never public, anon, or generic authenticated)
revoke all on function public.register_dante_contribution(text, text, bigint, text, text, boolean, text, timestamptz, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.register_dante_contribution(text, text, bigint, text, text, boolean, text, timestamptz, text, text, text, text, text, text) to service_role;

-- 7. Public Gratitude RPC returning all approved public supporters
create or replace function public.get_dante_public_supporters()
returns table (display_name text)
language sql
security definer
set search_path = ''
stable
as $$
  with ordered_supporters as (
    select distinct on (lower(trim(public_display_name)))
      trim(public_display_name) as display_name,
      occurred_at
    from public.dante_contributions
    where status = 'approved'
      and public_name = true
      and public_display_name is not null
      and trim(public_display_name) <> ''
    order by lower(trim(public_display_name)), occurred_at asc
  )
  select display_name
  from ordered_supporters
  order by occurred_at asc;
$$;

revoke all on function public.get_dante_public_supporters() from public;
grant execute on function public.get_dante_public_supporters() to anon, authenticated, service_role;

-- Legacy alias for get_dante_public_financial_supporters (backward compatibility)
create or replace function public.get_dante_public_financial_supporters()
returns table (display_name text)
language sql
security definer
set search_path = ''
stable
as $$
  select display_name from public.get_dante_public_supporters();
$$;

revoke all on function public.get_dante_public_financial_supporters() from public;
grant execute on function public.get_dante_public_financial_supporters() to anon, authenticated, service_role;
