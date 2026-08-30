-- ==============================================================================
-- Migration 4: Adicionar campo location à dante_timeline_events
-- e trigger para auto-gerar display_date a partir de event_date
-- ==============================================================================

-- 1. Adicionar coluna location
alter table public.dante_timeline_events
  add column if not exists location text null;

-- 2. Migrar o evento da visita com local real
update public.dante_timeline_events
set location = 'Clínica Animal House'
where slug = '2026-08-29-visita-dante';

-- 3. Função auxiliar para gerar display_date em pt-BR a partir de event_date
--    Usada pelo trigger quando display_date não é informado manualmente.
create or replace function public.auto_display_date()
returns trigger
language plpgsql
as $$
begin
  -- Se display_date não foi fornecido ou está vazio, gerar a partir de event_date
  if new.display_date is null or trim(new.display_date) = '' then
    new.display_date := to_char(new.event_date, 'DD/MM/YYYY');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_auto_display_date on public.dante_timeline_events;
create trigger trg_auto_display_date
before insert or update of event_date, display_date
on public.dante_timeline_events
for each row
execute function public.auto_display_date();
