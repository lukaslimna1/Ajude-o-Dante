-- Migration: Módulo 2 — Venda e Reserva Manual pelo Administrador
-- Adiciona rastreamento de origem (site vs admin_manual) e método de pagamento, e RPC atômica de lançamento administrativo

-- 1. Colunas incrementais com defaults seguros
alter table public.dante_raffle_reservations
  add column if not exists entry_source text not null default 'site'
    check (entry_source in ('site', 'admin_manual'));

alter table public.dante_raffle_reservations
  add column if not exists payment_method text null
    check (payment_method in ('pix', 'cash', 'transfer', 'other'));

create index if not exists idx_dante_raffle_reservations_entry_source
  on public.dante_raffle_reservations (raffle_id, entry_source);

-- 2. RPC Administrativa Atômica para Venda/Reserva Manual
create or replace function public.admin_create_dante_raffle_entry(
  p_raffle_id text,
  p_numbers integer[],
  p_customer_name text,
  p_customer_whatsapp text,
  p_payment_status text, -- 'paid' ou 'reserved'
  p_payment_method text default null, -- 'pix', 'cash', 'transfer', 'other'
  p_reservation_mode text default 'without_expiration', -- '30_minutes' ou 'without_expiration'
  p_order_code text default null,
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raffle public.dante_raffle%rowtype;
  v_sorted_numbers integer[];
  v_total_cents bigint;
  v_quantity integer;
  v_order_code text;
  v_token_hash text;
  v_reservation_id uuid;
  v_locked_count integer;
  v_conflicting_number integer;
  v_expires_at timestamptz;
  v_reserved_until timestamptz;
  v_confirmed_at timestamptz;
  v_num integer;
begin
  -- 1. Verificação estrita de autorização de Administrador
  if not public.is_dante_admin() then
    raise exception 'Acesso não autorizado.';
  end if;

  -- 2. Validação da Rifa
  select * into v_raffle
  from public.dante_raffle
  where id = p_raffle_id
  for share;

  if v_raffle.id is null then
    return jsonb_build_object('success', false, 'error', 'Ação entre amigos não encontrada.');
  end if;

  if v_raffle.status <> 'active' then
    return jsonb_build_object('success', false, 'error', 'Ação entre amigos não está ativa no momento.');
  end if;

  -- 3. Validação dos parâmetros básicos
  if coalesce(trim(p_customer_name), '') = '' then
    return jsonb_build_object('success', false, 'error', 'O nome do participante é obrigatório.');
  end if;

  if p_payment_status not in ('paid', 'reserved') then
    return jsonb_build_object('success', false, 'error', 'Status de pagamento inválido.');
  end if;

  if p_payment_method is not null and p_payment_method not in ('pix', 'cash', 'transfer', 'other') then
    return jsonb_build_object('success', false, 'error', 'Forma de pagamento inválida.');
  end if;

  if p_reservation_mode not in ('30_minutes', 'without_expiration') then
    return jsonb_build_object('success', false, 'error', 'Modo de reserva inválido.');
  end if;

  -- 4. Validação e ordenação do array de números
  if p_numbers is null or array_length(p_numbers, 1) is null or array_length(p_numbers, 1) < 1 then
    return jsonb_build_object('success', false, 'error', 'Selecione ao menos um número.');
  end if;

  v_quantity := array_length(p_numbers, 1);
  if v_quantity > 10 then
    return jsonb_build_object('success', false, 'error', 'O limite é de no máximo 10 números por lançamento.');
  end if;

  -- Ordena os números para prevenir deadlocks
  select array_agg(elem order by elem asc) into v_sorted_numbers
  from unnest(p_numbers) as elem;

  -- Valida range (1 a total_numbers) e ausência de duplicatas
  for i in 1..v_quantity loop
    v_num := v_sorted_numbers[i];
    if v_num < 1 or v_num > v_raffle.total_numbers then
      return jsonb_build_object('success', false, 'error', format('Número inválido: %s. Escolha entre 1 e %s.', v_num, v_raffle.total_numbers));
    end if;

    if i > 1 and v_num = v_sorted_numbers[i - 1] then
      return jsonb_build_object('success', false, 'error', format('O número %s foi selecionado mais de uma vez.', v_num));
    end if;
  end loop;

  -- 5. Bloqueio Pessimista Real (SELECT FOR UPDATE)
  perform 1
  from public.dante_raffle_numbers
  where raffle_id = p_raffle_id
    and number = any(v_sorted_numbers)
  order by number asc
  for update;

  get diagnostics v_locked_count = row_count;
  if v_locked_count <> v_quantity then
    return jsonb_build_object('success', false, 'error', 'Um ou mais números solicitados não existem na grade.');
  end if;

  -- Validação de Disponibilidade Exclusiva
  select number into v_conflicting_number
  from public.dante_raffle_numbers
  where raffle_id = p_raffle_id
    and number = any(v_sorted_numbers)
    and (
      status in ('paid', 'awaiting_confirmation')
      or (status = 'reserved' and (reserved_until is null or reserved_until > now()))
    )
  limit 1;

  if v_conflicting_number is not null then
    return jsonb_build_object(
      'success', false,
      'error', format('O número %s não está mais disponível para lançamento.', lpad(v_conflicting_number::text, 3, '0'))
    );
  end if;

  -- 6. Definição de Prazos e Status
  v_total_cents := v_quantity * v_raffle.number_price_cents;
  v_reservation_id := gen_random_uuid();
  v_order_code := coalesce(p_order_code, 'DANTE-M' || upper(substr(md5(random()::text), 1, 4)));
  v_token_hash := encode(digest('admin_manual_' || v_reservation_id::text, 'sha256'), 'hex');

  if p_payment_status = 'paid' then
    v_expires_at := null;
    v_reserved_until := null;
    v_confirmed_at := now();
  else
    if p_reservation_mode = '30_minutes' then
      v_expires_at := now() + interval '30 minutes';
      v_reserved_until := now() + interval '30 minutes';
    else
      v_expires_at := null;
      v_reserved_until := null;
    end if;
    v_confirmed_at := null;
  end if;

  -- 7. Inserção na Tabela de Reservas
  insert into public.dante_raffle_reservations (
    id,
    raffle_id,
    order_code,
    reservation_token_hash,
    customer_name,
    customer_whatsapp,
    status,
    total_cents,
    quantity,
    created_at,
    expires_at,
    proof_sent_at,
    confirmed_at,
    admin_notes,
    entry_source,
    payment_method
  ) values (
    v_reservation_id,
    p_raffle_id,
    v_order_code,
    v_token_hash,
    trim(p_customer_name),
    coalesce(trim(p_customer_whatsapp), ''),
    p_payment_status,
    v_total_cents,
    v_quantity,
    now(),
    v_expires_at,
    null,
    v_confirmed_at,
    p_notes,
    'admin_manual',
    p_payment_method
  );

  -- 8. Atualização Atômica dos Números na Grade
  update public.dante_raffle_numbers
  set status = p_payment_status,
      reservation_id = v_reservation_id,
      reserved_until = v_reserved_until,
      confirmed_at = v_confirmed_at,
      updated_at = now()
  where raffle_id = p_raffle_id
    and number = any(v_sorted_numbers);

  return jsonb_build_object(
    'success', true,
    'reservation_id', v_reservation_id,
    'order_code', v_order_code,
    'status', p_payment_status,
    'numbers', v_sorted_numbers,
    'total_cents', v_total_cents,
    'entry_source', 'admin_manual',
    'payment_method', p_payment_method
  );
end;
$$;

revoke all on function public.admin_create_dante_raffle_entry(text, integer[], text, text, text, text, text, text, text) from public, anon;
grant execute on function public.admin_create_dante_raffle_entry(text, integer[], text, text, text, text, text, text, text) to authenticated, service_role;
