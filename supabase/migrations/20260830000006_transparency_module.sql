-- ==============================================================================
-- Migration 6: Módulo Transparência
-- Tabelas: dante_expenses, dante_transparency_documents, dante_transparency_config
-- RLS: mesmo padrão — anon nunca chama is_dante_admin()
-- ==============================================================================

-- ─────────────────────────────────────────
-- 1. DESPESAS
-- ─────────────────────────────────────────
create table if not exists public.dante_expenses (
  id             uuid primary key default gen_random_uuid(),
  expense_date   date not null,
  title          text not null,
  description    text null,
  category       text not null check (category in (
    'Consulta','Exame','Cirurgia','Internação','Medicamento',
    'Alimentação','Transporte','Pós-operatório','Outro'
  )),
  amount_cents   bigint not null default 0,
  payment_status text not null default 'paid' check (payment_status in ('paid','pending')),
  document_url   text null,
  is_public      boolean not null default true,
  sort_order     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create or replace function public.handle_dante_expenses_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists trg_dante_expenses_updated_at on public.dante_expenses;
create trigger trg_dante_expenses_updated_at
before update on public.dante_expenses
for each row execute function public.handle_dante_expenses_updated_at();

alter table public.dante_expenses enable row level security;

drop policy if exists "Public can view public expenses" on public.dante_expenses;
create policy "Public can view public expenses"
  on public.dante_expenses for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "Admins have full access to expenses" on public.dante_expenses;
create policy "Admins have full access to expenses"
  on public.dante_expenses for all
  to authenticated
  using (public.is_dante_admin())
  with check (public.is_dante_admin());

-- ─────────────────────────────────────────
-- 2. DOCUMENTOS DE TRANSPARÊNCIA
-- ─────────────────────────────────────────
create table if not exists public.dante_transparency_documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text null,
  category      text not null check (category in (
    'Exame','Laudo','Clínica','Cirurgia','Recibo','Comprovante','Outro'
  )),
  file_url      text null,
  document_date date null,
  is_public     boolean not null default true,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create or replace function public.handle_dante_docs_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists trg_dante_docs_updated_at on public.dante_transparency_documents;
create trigger trg_dante_docs_updated_at
before update on public.dante_transparency_documents
for each row execute function public.handle_dante_docs_updated_at();

alter table public.dante_transparency_documents enable row level security;

drop policy if exists "Public can view public documents" on public.dante_transparency_documents;
create policy "Public can view public documents"
  on public.dante_transparency_documents for select
  to anon, authenticated
  using (is_public = true);

drop policy if exists "Admins have full access to documents" on public.dante_transparency_documents;
create policy "Admins have full access to documents"
  on public.dante_transparency_documents for all
  to authenticated
  using (public.is_dante_admin())
  with check (public.is_dante_admin());

-- ─────────────────────────────────────────
-- 3. CONFIGURAÇÃO DA TRANSPARÊNCIA
--    (Nosso Compromisso + Verificação do Caso)
-- ─────────────────────────────────────────
create table if not exists public.dante_transparency_config (
  key         text primary key,   -- 'compromisso' | 'verificacao'
  title       text not null,
  subtitle    text null,
  body_text   text not null,
  highlight   text null,
  note        text null,
  -- campos extras para verificação
  phone       text null,
  button_text text null,
  is_published boolean not null default true,
  updated_at  timestamptz not null default now()
);

alter table public.dante_transparency_config enable row level security;

drop policy if exists "Public can read published config" on public.dante_transparency_config;
create policy "Public can read published config"
  on public.dante_transparency_config for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "Admins have full access to config" on public.dante_transparency_config;
create policy "Admins have full access to config"
  on public.dante_transparency_config for all
  to authenticated
  using (public.is_dante_admin())
  with check (public.is_dante_admin());

-- SEED: preservar os textos hardcoded atuais como ponto de partida
insert into public.dante_transparency_config (key, title, subtitle, body_text, highlight, note, phone, button_text, is_published)
values
(
  'compromisso',
  'A ajuda não termina no Dante',
  null,
  'Todo o valor arrecadado será destinado ao tratamento, internação, medicamentos, exames, alimentação especial, recuperação e acompanhamento do Dante.',
  'Após a conclusão do tratamento e a quitação de todas as despesas relacionadas ao caso, se houver saldo remanescente, nós nos comprometemos a destiná-lo integralmente para ajudar outras famílias que estejam enfrentando uma emergência veterinária.',
  'A destinação de eventual saldo remanescente também será informada aqui, mantendo a mesma transparência da campanha.',
  null,
  null,
  true
),
(
  'verificacao',
  'Quer confirmar as informações?',
  'Confirme diretamente com a Animal House',
  'A Clínica Animal House autorizou o contato direto para quem quiser confirmar informações sobre o caso e o tratamento do Dante.',
  null,
  null,
  '5514991228991',
  'Confirmar com a Animal House',
  true
)
on conflict (key) do nothing;
