-- ==============================================================================
-- Migration 5: Tabela de mídia por evento da Timeline
-- RLS: anon/authenticated lê apenas mídias de eventos publicados
--      admin CRUD via is_dante_admin() restrito a authenticated
-- ==============================================================================

create table if not exists public.dante_timeline_media (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.dante_timeline_events(id) on delete cascade,
  media_type  text not null check (media_type in ('image', 'video')),
  url         text not null,
  alt_text    text not null default '',
  caption     text null,
  poster_url  text null,       -- apenas para vídeos
  is_primary  boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Garantir somente uma imagem principal por evento
-- índice parcial: só 1 linha com is_primary=true por event_id
create unique index if not exists uniq_dante_media_primary_per_event
  on public.dante_timeline_media (event_id)
  where is_primary = true;

-- Trigger: atualizar updated_at automaticamente
create or replace function public.handle_dante_media_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_dante_media_updated_at on public.dante_timeline_media;
create trigger trg_dante_media_updated_at
before update on public.dante_timeline_media
for each row execute function public.handle_dante_media_updated_at();

-- RLS
alter table public.dante_timeline_media enable row level security;

-- SELECT público: anon e authenticated podem ver mídias de eventos publicados
-- NUNCA chamar is_dante_admin() aqui — evita permission denied para anon
drop policy if exists "Public can view media of published events" on public.dante_timeline_media;
create policy "Public can view media of published events"
  on public.dante_timeline_media
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.dante_timeline_events e
      where e.id = dante_timeline_media.event_id
        and e.is_published = true
    )
  );

-- Admin CRUD: restrito a authenticated que são admins
drop policy if exists "Admins have full access to timeline media" on public.dante_timeline_media;
create policy "Admins have full access to timeline media"
  on public.dante_timeline_media
  for all
  to authenticated
  using (public.is_dante_admin())
  with check (public.is_dante_admin());

-- ==============================================================================
-- SEED: mídias reais da visita de 29/08/2026
-- ==============================================================================

do $$
declare
  v_event_id uuid;
begin
  select id into v_event_id
  from public.dante_timeline_events
  where slug = '2026-08-29-visita-dante'
  limit 1;

  if v_event_id is not null then
    insert into public.dante_timeline_media
      (event_id, media_type, url, alt_text, caption, is_primary, sort_order)
    values
      (v_event_id, 'image', '/images/Usar/Fotos/02.jpeg',
       'Dante durante visita de atualização após a cirurgia', 'Foto principal', true,  1),
      (v_event_id, 'image', '/images/Usar/Fotos/03.jpeg',
       'Dante recebendo carinho durante visita na clínica',   'Carinho e afeto', false, 2),
      (v_event_id, 'image', '/images/Usar/Fotos/04.jpeg',
       'Dante em repouso e recuperação',                       'Repouso',         false, 3),
      (v_event_id, 'image', '/images/Usar/Fotos/05.jpeg',
       'Dante deitado confortavelmente durante o pós-operatório', 'Pós-operatório', false, 4),
      (v_event_id, 'image', '/images/Usar/Fotos/01.jpeg',
       'Registro espontâneo do Dante durante a visita',        'Registro espontâneo', false, 5),
      (v_event_id, 'video', '/images/Usar/Video/Dante - Visita.mp4',
       'Vídeo da visita ao Dante durante a recuperação',
       'Registro real do Dante recebendo cuidados e carinho na clínica.',
       false, 6)
    on conflict do nothing;

    -- Atualizar o poster_url do vídeo
    update public.dante_timeline_media
    set poster_url = '/images/Usar/Fotos/02.jpeg'
    where event_id = v_event_id
      and media_type = 'video';
  end if;
end;
$$;
