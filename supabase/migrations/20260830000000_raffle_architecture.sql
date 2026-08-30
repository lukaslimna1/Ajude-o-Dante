-- Migration: Módulo 2 — Ação entre Amigos / Rifa do Dante (V3 Production-Ready)
-- Bloqueio pessimista real (SELECT FOR UPDATE), seed inicial draft, awaiting_confirmation sem expiração automática, advisory lock de 64 bits, token hashing SHA256 e integridade estrita

-- 1. Tabela Principal da Rifa
create table if not exists public.dante_raffle (
  id text primary key,
  title text not null default 'Ação entre Amigos pelo Dante',
  prize_name text not null default 'Smart TV SEMP TCL 43"',
  prize_model text not null default '43S5300',
  number_price_cents bigint not null default 1500,
  total_numbers integer not null default 100,
  status text not null default 'draft' check (status in ('draft', 'active', 'finished', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. Tabela de Reservas e Pedidos da Rifa
create table if not exists public.dante_raffle_reservations (
  id uuid primary key default gen_random_uuid(),
  raffle_id text not null references public.dante_raffle(id) on delete cascade,
  order_code text not null unique,
  reservation_token_hash text not null,
  customer_name text not null,
  customer_whatsapp text not null,
  status text not null default 'reserved' check (status in ('reserved', 'awaiting_confirmation', 'paid', 'expired', 'cancelled')),
  total_cents bigint not null check (total_cents > 0),
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz null default (now() + interval '30 minutes'),
  proof_sent_at timestamptz null,
  confirmed_at timestamptz null,
  admin_notes text null
);

create index if not exists idx_dante_raffle_reservations_raffle_status
  on public.dante_raffle_reservations (raffle_id, status);

create index if not exists idx_dante_raffle_reservations_token_hash
  on public.dante_raffle_reservations (order_code, reservation_token_hash);

create index if not exists idx_dante_raffle_reservations_wa_active
  on public.dante_raffle_reservations (raffle_id, customer_whatsapp, status, expires_at);

-- 3. Tabela de Grade de Números (1 a 100)
create table if not exists public.dante_raffle_numbers (
  id bigint generated always as identity primary key,
  raffle_id text not null references public.dante_raffle(id) on delete cascade,
  number integer not null check (number between 1 and 100),
  status text not null default 'available' check (status in ('available', 'reserved', 'awaiting_confirmation', 'paid')),
  reservation_id uuid null references public.dante_raffle_reservations(id) on delete set null,
  reserved_until timestamptz null,
  confirmed_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint uq_dante_raffle_numbers_raffle_number unique (raffle_id, number)
);

create index if not exists idx_dante_raffle_numbers_lookup
  on public.dante_raffle_numbers (raffle_id, status, reserved_until);

-- 4. Seed Inicial: Status DRAFT (não abre automaticamente a rifa em produção)
insert into public.dante_raffle (id, title, prize_name, prize_model, number_price_cents, total_numbers, status)
values ('main', 'Ação entre Amigos pelo Dante', 'Smart TV SEMP TCL 43"', '43S5300', 1500, 100, 'draft')
on conflict (id) do nothing;

do $$
declare
  i integer;
begin
  for i in 1..100 loop
    insert into public.dante_raffle_numbers (raffle_id, number, status)
    values ('main', i, 'available')
    on conflict (raffle_id, number) do nothing;
  end loop;
end $$;

-- 5. Configuração de RLS e Grants
alter table public.dante_raffle enable row level security;
alter table public.dante_raffle_reservations enable row level security;
alter table public.dante_raffle_numbers enable row level security;

-- Grants explícitos
revoke all on table public.dante_raffle from anon, authenticated, public;
grant select on table public.dante_raffle to anon, authenticated, service_role;
grant insert, update, delete on table public.dante_raffle to service_role;

revoke all on table public.dante_raffle_reservations from anon, authenticated, public;
grant select, insert, update, delete on table public.dante_raffle_reservations to authenticated, service_role;

revoke all on table public.dante_raffle_numbers from anon, authenticated, public;
grant select, insert, update, delete on table public.dante_raffle_numbers to authenticated, service_role;

-- Políticas de RLS
drop policy if exists "Public read raffle" on public.dante_raffle;
create policy "Public read raffle"
  on public.dante_raffle
  for select
  using (true);

drop policy if exists "Admins manage raffle" on public.dante_raffle;
create policy "Admins manage raffle"
  on public.dante_raffle
  for all
  using (public.is_dante_admin())
  with check (public.is_dante_admin());

drop policy if exists "Admins manage reservations" on public.dante_raffle_reservations;
create policy "Admins manage reservations"
  on public.dante_raffle_reservations
  for all
  using (public.is_dante_admin())
  with check (public.is_dante_admin());

drop policy if exists "Admins manage numbers" on public.dante_raffle_numbers;
create policy "Admins manage numbers"
  on public.dante_raffle_numbers
  for all
  using (public.is_dante_admin())
  with check (public.is_dante_admin());

-- 6. Função de Limpeza Coerente de Reservas Expiradas (Limpa EXCLUSIVAMENTE status = 'reserved' com expires_at < now)
create or replace function public.cleanup_expired_dante_raffle_reservations(p_raffle_id text default 'main')
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_expired_count integer := 0;
begin
  with expired_res as (
    update public.dante_raffle_reservations
    set status = 'expired'
    where raffle_id = p_raffle_id
      and status = 'reserved'
      and expires_at is not null
      and expires_at < now()
    returning id
  ),
  freed_numbers as (
    update public.dante_raffle_numbers n
    set status = 'available',
        reservation_id = null,
        reserved_until = null,
        confirmed_at = null,
        updated_at = now()
    from expired_res r
    where n.reservation_id = r.id
      and n.status = 'reserved'
    returning n.id
  )
  select count(*) into v_expired_count from expired_res;

  return v_expired_count;
end;
$$;

-- Restringe execução direta de cleanup exclusivamente para service_role
revoke all on function public.cleanup_expired_dante_raffle_reservations(text) from public, anon, authenticated;
grant execute on function public.cleanup_expired_dante_raffle_reservations(text) to service_role;

-- 7. RPC: Consulta Pública Sanitizada do Estado dos Números
create or replace function public.get_dante_raffle_public_state(p_raffle_id text default 'main')
returns table (
  number integer,
  visual_status text
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    n.number,
    case
      when n.status = 'paid' then 'paid'
      when n.status = 'awaiting_confirmation' then 'awaiting_confirmation'
      when n.status = 'reserved' and (n.reserved_until is null or n.reserved_until > now()) then 'reserved'
      else 'available'
    end as visual_status
  from public.dante_raffle_numbers n
  where n.raffle_id = p_raffle_id
  order by n.number asc;
$$;

revoke all on function public.get_dante_raffle_public_state(text) from public;
grant execute on function public.get_dante_raffle_public_state(text) to anon, authenticated, service_role;

-- 8. RPC: Reserva Atômica de Números com Bloqueio Pessimista Real (SELECT FOR UPDATE)
create or replace function public.reserve_dante_raffle_numbers(
  p_raffle_id text,
  p_numbers integer[],
  p_customer_name text,
  p_customer_whatsapp text,
  p_order_code text,
  p_reservation_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raffle_status text;
  v_price_cents bigint;
  v_num_count integer;
  v_locked_count integer;
  v_total_cents bigint;
  v_reservation_id uuid;
  v_unavailable_number integer;
  v_sorted_numbers integer[];
  v_active_reservations integer;
  v_sanitized_wa text;
begin
  -- 1. Validações básicas de entrada
  if p_numbers is null or array_length(p_numbers, 1) is null or array_length(p_numbers, 1) = 0 then
    return jsonb_build_object('success', false, 'error', 'Nenhum número foi selecionado.');
  end if;

  v_num_count := array_length(p_numbers, 1);
  if v_num_count > 10 then
    return jsonb_build_object('success', false, 'error', 'O limite máximo por pedido é de 10 números.');
  end if;

  if trim(coalesce(p_customer_name, '')) = '' then
    return jsonb_build_object('success', false, 'error', 'Nome completo é obrigatório.');
  end if;

  v_sanitized_wa := regexp_replace(coalesce(p_customer_whatsapp, ''), '\D', '', 'g');
  if length(v_sanitized_wa) < 10 or length(v_sanitized_wa) > 11 then
    return jsonb_build_object('success', false, 'error', 'Informe um número de WhatsApp válido com DDD.');
  end if;

  -- 2. Serializar requisições do mesmo telefone usando advisory lock de 64 bits
  perform pg_advisory_xact_lock(hashtextextended('raffle_wa:' || v_sanitized_wa, 0));

  -- 3. Limpeza de reservas expiradas
  perform public.cleanup_expired_dante_raffle_reservations(p_raffle_id);

  -- 4. Validar limite de 2 reservas ativas por WhatsApp
  select count(*) into v_active_reservations
  from public.dante_raffle_reservations
  where raffle_id = p_raffle_id
    and customer_whatsapp = v_sanitized_wa
    and status in ('reserved', 'awaiting_confirmation')
    and (expires_at is null or expires_at > now());

  if v_active_reservations >= 2 then
    return jsonb_build_object(
      'success', false,
      'error', 'Você já possui 2 reservas ativas aguardando confirmação. Conclua seus pedidos antes de fazer uma nova reserva.'
    );
  end if;

  -- 5. Obter status e preço unitário da rifa
  select status, number_price_cents into v_raffle_status, v_price_cents
  from public.dante_raffle
  where id = p_raffle_id;

  if v_raffle_status is null then
    return jsonb_build_object('success', false, 'error', 'Ação entre Amigos não encontrada.');
  end if;

  if v_raffle_status = 'draft' then
    return jsonb_build_object('success', false, 'error', 'Ação entre Amigos em preparação. Em breve as reservas serão abertas.');
  end if;

  if v_raffle_status <> 'active' then
    return jsonb_build_object('success', false, 'error', 'Ação entre Amigos não está ativa para reservas.');
  end if;

  v_total_cents := v_price_cents * v_num_count;

  -- 6. Ordenar números para prevenir deadlock e verificar duplicatas
  select array_agg(elem order by elem asc) into v_sorted_numbers
  from (select distinct unnest(p_numbers) as elem) as sub;

  if array_length(v_sorted_numbers, 1) <> v_num_count then
    return jsonb_build_object('success', false, 'error', 'A seleção contém números duplicados.');
  end if;

  -- Validar se todos os números estão no intervalo de 1 a 100
  if exists (select 1 from unnest(v_sorted_numbers) as n where n < 1 or n > 100) then
    return jsonb_build_object('success', false, 'error', 'Um ou mais números selecionados estão fora do intervalo de 1 a 100.');
  end if;

  -- 7. BLOQUEIO PESSIMISTA REAL: Trava as linhas exatas em ordem crescente com FOR UPDATE
  perform 1
  from public.dante_raffle_numbers
  where raffle_id = p_raffle_id
    and number = any(v_sorted_numbers)
  order by number asc
  for update;

  -- 8. Validar se todas as linhas foram encontradas e bloqueadas
  select count(*) into v_locked_count
  from public.dante_raffle_numbers
  where raffle_id = p_raffle_id
    and number = any(v_sorted_numbers);

  if v_locked_count <> v_num_count then
    return jsonb_build_object('success', false, 'error', 'Um ou mais números solicitados são inválidos ou inexistentes.');
  end if;

  -- 9. Validar disponibilidade estrita de todas as linhas bloqueadas
  select number into v_unavailable_number
  from public.dante_raffle_numbers
  where raffle_id = p_raffle_id
    and number = any(v_sorted_numbers)
    and status <> 'available'
  order by number asc
  limit 1;

  if v_unavailable_number is not null then
    return jsonb_build_object(
      'success', false,
      'error', format('O número %s não está mais disponível. Por favor, escolha outro.', lpad(v_unavailable_number::text, 3, '0'))
    );
  end if;

  -- 10. Criar registro de reserva (30 minutos para pagamento)
  insert into public.dante_raffle_reservations (
    raffle_id,
    order_code,
    reservation_token_hash,
    customer_name,
    customer_whatsapp,
    status,
    total_cents,
    quantity,
    expires_at
  )
  values (
    p_raffle_id,
    p_order_code,
    p_reservation_token_hash,
    trim(p_customer_name),
    v_sanitized_wa,
    'reserved',
    v_total_cents,
    v_num_count,
    now() + interval '30 minutes'
  )
  returning id into v_reservation_id;

  -- 11. Atualizar números para 'reserved' vinculados à reserva
  update public.dante_raffle_numbers
  set status = 'reserved',
      reservation_id = v_reservation_id,
      reserved_until = now() + interval '30 minutes',
      updated_at = now()
  where raffle_id = p_raffle_id
    and number = any(v_sorted_numbers);

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'order_code', p_order_code,
    'total_cents', v_total_cents,
    'quantity', v_num_count,
    'numbers', v_sorted_numbers,
    'expires_at', (now() + interval '30 minutes')
  );
end;
$$;

revoke all on function public.reserve_dante_raffle_numbers(text, integer[], text, text, text, text) from public, anon, authenticated;
grant execute on function public.reserve_dante_raffle_numbers(text, integer[], text, text, text, text) to service_role;

-- 9. RPC: Marcar Comprovante Enviado (Idempotente com FOR UPDATE; Awaiting Confirmation NUNCA expira automaticamente)
create or replace function public.mark_dante_raffle_proof_sent(
  p_order_code text,
  p_reservation_token_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.dante_raffle_reservations%rowtype;
begin
  select * into v_res
  from public.dante_raffle_reservations
  where order_code = trim(p_order_code)
    and reservation_token_hash = trim(p_reservation_token_hash)
  for update;

  if v_res.id is null then
    return jsonb_build_object('success', false, 'error', 'Reserva não encontrada ou token inválido.');
  end if;

  -- Se já pago, retorna sucesso idempotente
  if v_res.status = 'paid' then
    return jsonb_build_object('success', true, 'status', 'paid', 'message', 'Pagamento já confirmado.');
  end if;

  -- Se já está aguardando confirmação, retorna idempotente sem alterar datas
  if v_res.status = 'awaiting_confirmation' then
    return jsonb_build_object(
      'success', true,
      'status', 'awaiting_confirmation',
      'message', 'Comprovante já registrado anteriormente.'
    );
  end if;

  -- Se cancelada ou expirada (reserved com prazo vencido)
  if v_res.status in ('cancelled', 'expired') or (v_res.status = 'reserved' and v_res.expires_at is not null and v_res.expires_at < now()) then
    return jsonb_build_object('success', false, 'error', 'Esta reserva expirou ou foi cancelada.');
  end if;

  -- Transição inicial de reserved para awaiting_confirmation (expires_at = null para NÃO expirar automaticamente)
  update public.dante_raffle_reservations
  set status = 'awaiting_confirmation',
      proof_sent_at = coalesce(proof_sent_at, now()),
      expires_at = null
  where id = v_res.id;

  update public.dante_raffle_numbers
  set status = 'awaiting_confirmation',
      reserved_until = null,
      updated_at = now()
  where reservation_id = v_res.id;

  return jsonb_build_object(
    'success', true,
    'status', 'awaiting_confirmation'
  );
end;
$$;

revoke all on function public.mark_dante_raffle_proof_sent(text, text) from public, anon, authenticated;
grant execute on function public.mark_dante_raffle_proof_sent(text, text) to service_role;

-- 10. RPC: Confirmar Pagamento Manualmente (Exclusiva para Administradores com Validação Rígida de Quantidade e Vínculo)
create or replace function public.confirm_dante_raffle_payment(
  p_reservation_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.dante_raffle_reservations%rowtype;
  v_linked_count integer;
begin
  if not public.is_dante_admin() then
    raise exception 'Acesso não autorizado.';
  end if;

  select * into v_res
  from public.dante_raffle_reservations
  where id = p_reservation_id
  for update;

  if v_res.id is null then
    return jsonb_build_object('success', false, 'error', 'Reserva não encontrada.');
  end if;

  -- Idempotente se já estiver paga
  if v_res.status = 'paid' then
    return jsonb_build_object('success', true, 'reservation_id', p_reservation_id, 'status', 'paid');
  end if;

  -- Rejeita se expirada ou cancelada
  if v_res.status in ('expired', 'cancelled') then
    return jsonb_build_object('success', false, 'error', 'Não é possível confirmar pagamento de uma reserva cancelada ou expirada.');
  end if;

  -- Valida se a quantidade de números vinculados confere rigorosamente com a reserva
  select count(*) into v_linked_count
  from public.dante_raffle_numbers
  where reservation_id = p_reservation_id
    and status in ('reserved', 'awaiting_confirmation');

  if v_linked_count <> v_res.quantity then
    return jsonb_build_object('success', false, 'error', 'Inconsistência nos números vinculados à reserva.');
  end if;

  -- Atualiza reserva para paid
  update public.dante_raffle_reservations
  set status = 'paid',
      confirmed_at = now(),
      admin_notes = coalesce(p_notes, admin_notes)
  where id = p_reservation_id;

  -- Atualiza números vinculados para paid
  update public.dante_raffle_numbers
  set status = 'paid',
      confirmed_at = now(),
      reserved_until = null,
      updated_at = now()
  where reservation_id = p_reservation_id;

  return jsonb_build_object('success', true, 'reservation_id', p_reservation_id, 'status', 'paid');
end;
$$;

revoke all on function public.confirm_dante_raffle_payment(uuid, text) from public, anon;
grant execute on function public.confirm_dante_raffle_payment(uuid, text) to authenticated, service_role;

-- 11. RPC: Liberar Números / Cancelar Reserva (Exclusiva para Administradores)
create or replace function public.release_dante_raffle_reservation(
  p_reservation_id uuid,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_res public.dante_raffle_reservations%rowtype;
begin
  if not public.is_dante_admin() then
    raise exception 'Acesso não autorizado.';
  end if;

  select * into v_res
  from public.dante_raffle_reservations
  where id = p_reservation_id
  for update;

  if v_res.id is null then
    return jsonb_build_object('success', false, 'error', 'Reserva não encontrada.');
  end if;

  -- Bloqueio estrito: números pagos NUNCA podem ser liberados
  if v_res.status = 'paid' then
    return jsonb_build_object('success', false, 'error', 'Não é permitido liberar números de uma reserva já confirmada como paga.');
  end if;

  -- Idempotente se já cancelada
  if v_res.status = 'cancelled' then
    return jsonb_build_object('success', true, 'reservation_id', p_reservation_id, 'status', 'cancelled');
  end if;

  -- Atualiza reserva para cancelled
  update public.dante_raffle_reservations
  set status = 'cancelled',
      admin_notes = coalesce(p_notes, admin_notes)
  where id = p_reservation_id;

  -- Libera números de volta para available (apenas os não-pagos)
  update public.dante_raffle_numbers
  set status = 'available',
      reservation_id = null,
      reserved_until = null,
      confirmed_at = null,
      updated_at = now()
  where reservation_id = p_reservation_id
    and status <> 'paid';

  return jsonb_build_object('success', true, 'reservation_id', p_reservation_id, 'status', 'cancelled');
end;
$$;

revoke all on function public.release_dante_raffle_reservation(uuid, text) from public, anon;
grant execute on function public.release_dante_raffle_reservation(uuid, text) to authenticated, service_role;

-- 12. RPC: Alterar Status da Ação (Draft, Active, Finished, Cancelled)
create or replace function public.set_dante_raffle_status(
  p_raffle_id text,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_dante_admin() then
    raise exception 'Acesso não autorizado.';
  end if;

  if p_status not in ('draft', 'active', 'finished', 'cancelled') then
    return jsonb_build_object('success', false, 'error', 'Status inválido.');
  end if;

  update public.dante_raffle
  set status = p_status,
      updated_at = now()
  where id = p_raffle_id;

  return jsonb_build_object('success', true, 'raffle_id', p_raffle_id, 'status', p_status);
end;
$$;

revoke all on function public.set_dante_raffle_status(text, text) from public, anon;
grant execute on function public.set_dante_raffle_status(text, text) to authenticated, service_role;
