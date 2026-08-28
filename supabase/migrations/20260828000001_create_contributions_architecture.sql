-- Migration: Create contributions ledger, recalculation triggers, and public gratitude function

-- 1. Create table dante_contributions
create table if not exists public.dante_contributions (
  id uuid primary key default gen_random_uuid(),
  donor_name text null,
  public_display_name text null,
  public_name boolean not null default false,
  amount_cents bigint not null check (amount_cents > 0),
  source text not null check (source in ('mercado_pago', 'pix_direct', 'cash', 'clinic_direct', 'manual')),
  provider text null,
  status text not null check (status in ('pending', 'approved', 'cancelled', 'refunded', 'rejected', 'charged_back')),
  occurred_at timestamptz not null default now(),
  pix_end_to_end_id text null,
  transaction_id text null,
  institution text null,
  provider_payment_id text null,
  dedupe_key text not null unique,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Create partial unique indexes for idempotency
create unique index if not exists idx_dante_contributions_provider_payment 
  on public.dante_contributions (provider, provider_payment_id) 
  where provider_payment_id is not null;

create unique index if not exists idx_dante_contributions_pix_e2e 
  on public.dante_contributions (pix_end_to_end_id) 
  where pix_end_to_end_id is not null;

create index if not exists idx_dante_contributions_status 
  on public.dante_contributions (status);

-- 3. Enable RLS (Strictly closed for public/anon)
alter table public.dante_contributions enable row level security;

-- 4. Function & Trigger to recalculate confirmed_cents on dante_campaign
create or replace function public.recalculate_dante_campaign_total()
returns trigger
language plpgsql
security definer
as $$
begin
  update public.dante_campaign
  set confirmed_cents = (
    select coalesce(sum(amount_cents), 0)
    from public.dante_contributions
    where status = 'approved'
  ),
  updated_at = now()
  where id = 'main';

  return null;
end;
$$;

drop trigger if exists trg_recalculate_dante_campaign_total on public.dante_contributions;
create trigger trg_recalculate_dante_campaign_total
after insert or update or delete or truncate on public.dante_contributions
for each statement
execute function public.recalculate_dante_campaign_total();

-- 5. Administrative RPC to register/upsert contributions idempotently
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

  -- Upsert contribution based on dedupe_key
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

-- Restrict RPC execution to service_role only
revoke all on function public.register_dante_contribution from public, anon;
grant execute on function public.register_dante_contribution to service_role;

-- 6. Public Gratitude Function (Returns only distinct public display names)
create or replace function public.get_dante_public_financial_supporters()
returns table (display_name text)
language sql
security definer
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

grant execute on function public.get_dante_public_financial_supporters to anon, authenticated, service_role;

-- 7. Ensure dante_campaign is in supabase_realtime publication
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'dante_campaign'
  ) then
    alter publication supabase_realtime add table public.dante_campaign;
  end if;
end;
$$;
