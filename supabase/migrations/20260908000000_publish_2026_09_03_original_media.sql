-- Publica as mídias originais da atualização de 03/09/2026.
-- Os arquivos são mantidos no public/ sem compressão, resize ou transcodificação.

do $$
declare
  v_event_id uuid := '8b04dbca-8dcd-4b44-869e-4fa9f734eba3';
begin
  if exists (
    select 1
    from public.dante_timeline_events
    where id = v_event_id
      and is_published = true
  ) then
    insert into public.dante_timeline_media
      (event_id, media_type, url, alt_text, caption, poster_url, is_primary, sort_order)
    select v_event_id, 'image', '/images/Usar/Fotos/2026-09-03-dante-recuperacao-roupa-original.jpg',
      'Dante com roupa cirúrgica durante a recuperação em casa.',
      'Dante em casa durante a recuperação no dia 3 de setembro.', null, true, 1
    where not exists (
      select 1 from public.dante_timeline_media
      where event_id = v_event_id
        and url = '/images/Usar/Fotos/2026-09-03-dante-recuperacao-roupa-original.jpg'
    );

    insert into public.dante_timeline_media
      (event_id, media_type, url, alt_text, caption, poster_url, is_primary, sort_order)
    select v_event_id, 'image', '/images/Usar/Fotos/2026-09-03-dante-avaliacao-boca-original.jpg',
      'Avaliação da boca e gengiva do Dante.',
      'Registro da avaliação da boca e gengiva do Dante no dia 3 de setembro.', null, false, 2
    where not exists (
      select 1 from public.dante_timeline_media
      where event_id = v_event_id
        and url = '/images/Usar/Fotos/2026-09-03-dante-avaliacao-boca-original.jpg'
    );

    insert into public.dante_timeline_media
      (event_id, media_type, url, alt_text, caption, poster_url, is_primary, sort_order)
    select v_event_id, 'image', '/images/Usar/Fotos/2026-09-03-dante-pontos-externos-abertos-01-original.jpg',
      'Pontos externos abertos do Dante, primeiro registro.',
      'Imagem da recuperação pós-operatória mostrando a abertura dos pontos externos.', null, false, 3
    where not exists (
      select 1 from public.dante_timeline_media
      where event_id = v_event_id
        and url = '/images/Usar/Fotos/2026-09-03-dante-pontos-externos-abertos-01-original.jpg'
    );

    insert into public.dante_timeline_media
      (event_id, media_type, url, alt_text, caption, poster_url, is_primary, sort_order)
    select v_event_id, 'image', '/images/Usar/Fotos/2026-09-03-dante-pontos-externos-abertos-02-original.jpg',
      'Pontos externos abertos do Dante, segundo registro.',
      'Outro ângulo da recuperação pós-operatória com abertura dos pontos externos.', null, false, 4
    where not exists (
      select 1 from public.dante_timeline_media
      where event_id = v_event_id
        and url = '/images/Usar/Fotos/2026-09-03-dante-pontos-externos-abertos-02-original.jpg'
    );

    insert into public.dante_timeline_media
      (event_id, media_type, url, alt_text, caption, poster_url, is_primary, sort_order)
    select v_event_id, 'video', '/images/Usar/Video/2026-09-03-dante-recuperacao-original.mp4',
      'Vídeo do Dante em recuperação no dia 3 de setembro.',
      'Vídeo real do Dante em recuperação no dia 3 de setembro.',
      '/images/Usar/Fotos/2026-09-03-dante-recuperacao-roupa-original.jpg', false, 5
    where not exists (
      select 1 from public.dante_timeline_media
      where event_id = v_event_id
        and url = '/images/Usar/Video/2026-09-03-dante-recuperacao-original.mp4'
    );
  end if;
end;
$$;
