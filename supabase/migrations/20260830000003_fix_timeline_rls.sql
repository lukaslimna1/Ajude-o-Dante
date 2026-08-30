-- ==============================================================================
-- Fix crítico: RLS da tabela dante_timeline_events
--
-- Problema: a policy "Admins have full access to timeline events" aplicava-se
-- a todos os roles, incluindo anon. Quando o visitante da página pública
-- chamava fetchTimeline(), a engine do RLS tentava executar is_dante_admin()
-- para o role anon → "permission denied for function is_dante_admin" →
-- a query falhava silenciosamente e o site usava o fallback hardcoded.
--
-- Solução: restringir a policy admin ao role authenticated (TO authenticated).
-- A policy pública (somente leitura de eventos publicados) cobre o anon.
-- ==============================================================================

-- Recriar a policy admin restrita ao role authenticated
drop policy if exists "Admins have full access to timeline events" on public.dante_timeline_events;

create policy "Admins have full access to timeline events"
  on public.dante_timeline_events
  for all
  to authenticated
  using (public.is_dante_admin())
  with check (public.is_dante_admin());
