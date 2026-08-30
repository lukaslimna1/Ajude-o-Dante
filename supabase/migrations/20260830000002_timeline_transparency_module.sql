-- ==============================================================================
-- Módulo 3: Timeline e Transparência
-- Tabela de Eventos da Linha do Tempo e Prestação de Contas do Dante
-- ==============================================================================

create table if not exists public.dante_timeline_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  event_date date not null,
  display_date text not null,
  display_time text not null default '',
  title text not null,
  summary text not null default '',
  description text not null default '',
  status_label text null,
  event_type text not null default 'update' check (event_type in ('update', 'medical', 'status', 'campaign', 'milestone')),
  is_current_status boolean not null default false,
  is_published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger para garantir que apenas um registro possua is_current_status = true
create or replace function public.handle_dante_timeline_current_status()
returns trigger
language plpgsql
security definer
as $$
begin
  if new.is_current_status = true then
    update public.dante_timeline_events
    set is_current_status = false,
        updated_at = now()
    where id <> new.id
      and is_current_status = true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dante_timeline_current_status on public.dante_timeline_events;
create trigger trg_dante_timeline_current_status
before insert or update of is_current_status
on public.dante_timeline_events
for each row
when (new.is_current_status = true)
execute function public.handle_dante_timeline_current_status();

-- RLS
alter table public.dante_timeline_events enable row level security;

drop policy if exists "Public can view published timeline events" on public.dante_timeline_events;
create policy "Public can view published timeline events"
  on public.dante_timeline_events
  for select
  using (is_published = true);

drop policy if exists "Admins have full access to timeline events" on public.dante_timeline_events;
create policy "Admins have full access to timeline events"
  on public.dante_timeline_events
  for all
  using (public.is_dante_admin());

-- ==============================================================================
-- SEED DE TODOS OS EVENTOS HISTÓRICOS REAIS (PRESERVANDO 100% DA TIMELINE)
-- ==============================================================================

insert into public.dante_timeline_events (
  slug,
  event_date,
  display_date,
  display_time,
  title,
  summary,
  description,
  status_label,
  event_type,
  is_current_status,
  is_published,
  sort_order
) values
(
  'primeiro-sinal',
  '2026-08-26',
  '26/08 → 27/08',
  'Entre 00h30 e 01h',
  'O primeiro sinal de que algo estava errado',
  'Dante ficou mais recluso e isolado na casinha.',
  'Como ainda não havia outros sintomas evidentes, continuamos observando seu comportamento durante a madrugada e pela manhã.',
  null,
  'update',
  false,
  true,
  1
),
(
  'voltou-a-brincar',
  '2026-08-27',
  '27/08',
  'Por volta das 10h',
  'Ele voltou a brincar normalmente',
  'Na manhã seguinte, Dante parecia estar normal novamente.',
  'Isso nos tranquilizou naquele momento e fez parecer que o comportamento diferente da madrugada poderia ter sido apenas algo passageiro. Infelizmente, poucas horas depois, tudo mudou.',
  null,
  'update',
  false,
  true,
  2
),
(
  'mudanca-assustadora',
  '2026-08-27',
  '27/08',
  'Por volta das 17h',
  'Uma mudança assustadora em poucas horas',
  'No fim da tarde, ele mudou: andava estranho e emagreceu rápido.',
  'Foi nesse momento que também percebemos uma mudança física muito preocupante. Dante, que até então era um cachorro com aparência saudável e até um pouco gordinho, havia emagrecido de maneira extremamente rápida. Seus ossos passaram a ficar claramente visíveis sob a pele. A mudança aconteceu em menos de 24 horas. Foi aí que entendemos que não poderíamos mais esperar.',
  null,
  'update',
  false,
  true,
  3
),
(
  'animal-house',
  '2026-08-27',
  '27/08',
  'Entre 19h e 20h',
  'Levamos Dante à Clínica Animal House',
  'Levamos Dante à Animal House, em Bauru, para investigação.',
  'Lá foram realizados exame clínico, exame de sangue e ultrassonografia abdominal. O exame clínico e o exame de sangue não apresentaram alterações que explicassem a gravidade do comportamento dele. Mas o ultrassom trouxe a notícia que mudou completamente o cenário.',
  null,
  'medical',
  false,
  true,
  4
),
(
  'ultrassom',
  '2026-08-27',
  '27/08',
  'À noite',
  'O ultrassom revelou a gravidade',
  'O ultrassom encontrou corpos estranhos e uma linha no intestino.',
  'Esse material estava puxando e pregueando partes do intestino, provocando o efeito de intestino “sanfonado”. Dante estava diante de uma obstrução gastrointestinal que precisava de tratamento urgente. Aquilo que algumas horas antes parecia apenas um comportamento estranho havia se transformado em uma situação com risco real para sua saúde.',
  null,
  'medical',
  false,
  true,
  5
),
(
  'corrida-tratamento',
  '2026-08-27',
  '27/08',
  'Noite e madrugada',
  'Começou outra corrida: conseguir pagar o tratamento',
  'Exames custaram cerca de R$ 600; o procedimento poderia passar de R$ 3.000.',
  'E esse ainda não seria o custo total. Depois do procedimento ainda existiriam despesas com internação, medicamentos, novos exames, alimentação especial, acompanhamento veterinário e toda a recuperação do Dante. Foi então que começou uma segunda corrida. Além de lutar contra o tempo para cuidar dele, precisávamos encontrar uma maneira de conseguir pagar pelo tratamento. Começamos a pedir ajuda a amigos, conhecidos, redes sociais e pessoas dispostas a colaborar.',
  null,
  'campaign',
  false,
  true,
  6
),
(
  'ajuda-rosangela',
  '2026-08-28',
  '28/08',
  '07h30',
  'Uma ajuda que mudou o rumo da história',
  'Rosangela se comprometeu a pagar 50% do tratamento.',
  'Foi uma ajuda enorme justamente no momento em que mais precisávamos. Até então, tínhamos um tratamento urgente pela frente e não sabíamos como conseguiríamos arcar com tudo. A ajuda dela permitiu que déssemos um passo decisivo no tratamento de Dante. Por isso, para nós, Rosangela se tornou o anjo do Dante.',
  null,
  'milestone',
  false,
  true,
  7
),
(
  'retorno-clinica',
  '2026-08-28',
  '28/08',
  'Por volta das 08h',
  'Dante volta às pressas para a Animal House',
  'Dante voltou à Animal House para iniciar o atendimento.',
  'A partir dali, o foco passou a ser garantir que ele recebesse o tratamento necessário e tivesse acompanhamento durante todo o processo. Mas o tratamento não termina em um único procedimento. Ainda existem despesas com internação, medicamentos, exames, acompanhamento, alimentação e recuperação.',
  null,
  'medical',
  false,
  true,
  8
),
(
  'corrente-ajuda',
  '2026-08-28',
  '28/08',
  'Ao longo do dia',
  'Uma corrente começou a se formar',
  'Doações e compartilhamentos formaram uma corrente de ajuda.',
  'Cada contribuição começou a diminuir um pouco o peso das despesas e, principalmente, mostrou que Dante não estava mais enfrentando essa luta apenas com a nossa família. Uma verdadeira corrente começou a se formar ao redor dele.',
  null,
  'campaign',
  false,
  true,
  9
),
(
  '2026-08-28-1626-cirurgia-sucesso',
  '2026-08-28',
  '28/08/2026',
  '16h26',
  'Cirurgia realizada com sucesso',
  'A Clínica Animal House informou que a cirurgia foi realizada com sucesso. Dante está estável e em recuperação.',
  'A Clínica Animal House informou que o procedimento cirúrgico do Dante foi realizado com sucesso.

Dante está bem, estável e em recuperação, permanecendo sob acompanhamento da equipe veterinária.

Neste momento, seguimos aguardando sua evolução no pós-operatório e novas informações da clínica.',
  'Cirurgia concluída com sucesso',
  'status',
  false,
  true,
  10
),
(
  '2026-08-29-visita-dante',
  '2026-08-29',
  '29/08/2026',
  'Hoje',
  'Fomos visitar o Dante 💚',
  'Hoje conseguimos passar um tempo com o Dante e acompanhar de perto sua recuperação depois da cirurgia. Alta prevista para segunda-feira.',
  'Hoje conseguimos passar um tempo com o Dante e acompanhar de perto sua recuperação depois da cirurgia. Ele segue recebendo os cuidados necessários e, neste momento, a alta está prevista para segunda-feira.

Registramos essa visita em fotos e vídeo para que todo mundo que está ajudando também possa acompanhar de perto a recuperação dele.

A cirurgia passou, mas nossa campanha ainda não terminou. Ainda temos despesas do tratamento, internação, medicamentos, alimentação diferenciada e os cuidados que ele vai precisar depois de voltar para casa.

Toda ajuda continua fazendo diferença para o Dante. 💚🐾',
  'Recuperação · Alta prevista para segunda-feira',
  'status',
  true,
  true,
  11
)
on conflict (slug) do nothing;
