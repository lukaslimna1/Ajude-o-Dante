export type TimelineEvent = {
  id: string;
  date: string;
  time: string;
  title: string;
  summary: string;
  description: string;
  type?: "status";
  isCurrentStatus?: boolean;
  statusLabel?: string;
};

export const timelineEvents: TimelineEvent[] = [
  {
    id: "primeiro-sinal",
    date: "26/08 → 27/08",
    time: "Entre 00h30 e 01h",
    title: "O primeiro sinal de que algo estava errado",
    summary: "Dante ficou mais recluso e isolado na casinha.",
    description: "Como ainda não havia outros sintomas evidentes, continuamos observando seu comportamento durante a madrugada e pela manhã.",
  },
  {
    id: "voltou-a-brincar",
    date: "27/08",
    time: "Por volta das 10h",
    title: "Ele voltou a brincar normalmente",
    summary: "Na manhã seguinte, Dante parecia estar normal novamente.",
    description: "Isso nos tranquilizou naquele momento e fez parecer que o comportamento diferente da madrugada poderia ter sido apenas algo passageiro. Infelizmente, poucas horas depois, tudo mudou.",
  },
  {
    id: "mudanca-assustadora",
    date: "27/08",
    time: "Por volta das 17h",
    title: "Uma mudança assustadora em poucas horas",
    summary: "No fim da tarde, ele mudou: andava estranho e emagreceu rápido.",
    description: "Foi nesse momento que também percebemos uma mudança física muito preocupante. Dante, que até então era um cachorro com aparência saudável e até um pouco gordinho, havia emagrecido de maneira extremamente rápida. Seus ossos passaram a ficar claramente visíveis sob a pele. A mudança aconteceu em menos de 24 horas. Foi aí que entendemos que não poderíamos mais esperar.",
  },
  {
    id: "animal-house",
    date: "27/08",
    time: "Entre 19h e 20h",
    title: "Levamos Dante à Clínica Animal House",
    summary: "Levamos Dante à Animal House, em Bauru, para investigação.",
    description: "Lá foram realizados exame clínico, exame de sangue e ultrassonografia abdominal. O exame clínico e o exame de sangue não apresentaram alterações que explicassem a gravidade do comportamento dele. Mas o ultrassom trouxe a notícia que mudou completamente o cenário.",
  },
  {
    id: "ultrassom",
    date: "27/08",
    time: "À noite",
    title: "O ultrassom revelou a gravidade",
    summary: "O ultrassom encontrou corpos estranhos e uma linha no intestino.",
    description: "Esse material estava puxando e pregueando partes do intestino, provocando o efeito de intestino “sanfonado”. Dante estava diante de uma obstrução gastrointestinal que precisava de tratamento urgente. Aquilo que algumas horas antes parecia apenas um comportamento estranho havia se transformado em uma situação com risco real para sua saúde.",
  },
  {
    id: "corrida-tratamento",
    date: "27/08",
    time: "Noite e madrugada",
    title: "Começou outra corrida: conseguir pagar o tratamento",
    summary: "Exames custaram cerca de R$ 600; o procedimento poderia passar de R$ 3.000.",
    description: "E esse ainda não seria o custo total. Depois do procedimento ainda existiriam despesas com internação, medicamentos, novos exames, alimentação especial, acompanhamento veterinário e toda a recuperação do Dante. Foi então que começou uma segunda corrida. Além de lutar contra o tempo para cuidar dele, precisávamos encontrar uma maneira de conseguir pagar pelo tratamento. Começamos a pedir ajuda a amigos, conhecidos, redes sociais e pessoas dispostas a colaborar.",
  },
  {
    id: "ajuda-rosangela",
    date: "28/08",
    time: "07h30",
    title: "Uma ajuda que mudou o rumo da história",
    summary: "Rosangela se comprometeu a pagar 50% do tratamento.",
    description: "Foi uma ajuda enorme justamente no momento em que mais precisávamos. Até então, tínhamos um tratamento urgente pela frente e não sabíamos como conseguiríamos arcar com tudo. A ajuda dela permitiu que déssemos um passo decisivo no tratamento de Dante. Por isso, para nós, Rosangela se tornou o anjo do Dante.",
  },
  {
    id: "retorno-clinica",
    date: "28/08",
    time: "Por volta das 08h",
    title: "Dante volta às pressas para a Animal House",
    summary: "Dante voltou à Animal House para iniciar o atendimento.",
    description: "A partir dali, o foco passou a ser garantir que ele recebesse o tratamento necessário e tivesse acompanhamento durante todo o processo. Mas o tratamento não termina em um único procedimento. Ainda existem despesas com internação, medicamentos, exames, acompanhamento, alimentação e recuperação.",
  },
  {
    id: "corrente-ajuda",
    date: "28/08",
    time: "Ao longo do dia",
    title: "Uma corrente começou a se formar",
    summary: "Doações e compartilhamentos formaram uma corrente de ajuda.",
    description: "Cada contribuição começou a diminuir um pouco o peso das despesas e, principalmente, mostrou que Dante não estava mais enfrentando essa luta apenas com a nossa família. Uma verdadeira corrente começou a se formar ao redor dele.",
  },
  {
    id: "2026-08-28-1626-cirurgia-sucesso",
    date: "28/08/2026",
    time: "16h26",
    title: "Cirurgia realizada com sucesso",
    summary: "A Clínica Animal House informou que a cirurgia foi realizada com sucesso. Dante está estável e em recuperação.",
    description: "A Clínica Animal House informou que o procedimento cirúrgico do Dante foi realizado com sucesso.\n\nDante está bem, estável e em recuperação, permanecendo sob acompanhamento da equipe veterinária.\n\nNeste momento, seguimos aguardando sua evolução no pós-operatório e novas informações da clínica.",
    type: "status",
    isCurrentStatus: false,
    statusLabel: "Cirurgia concluída com sucesso",
  },
  {
    id: "2026-08-29-visita-dante",
    date: "29/08/2026",
    time: "Hoje",
    title: "Fomos visitar o Dante 💚",
    summary: "Hoje conseguimos passar um tempo com o Dante e acompanhar de perto sua recuperação depois da cirurgia. Alta prevista para segunda-feira.",
    description: "Hoje conseguimos passar um tempo com o Dante e acompanhar de perto sua recuperação depois da cirurgia. Ele segue recebendo os cuidados necessários e, neste momento, a alta está prevista para segunda-feira.\n\nRegistramos essa visita em fotos e vídeo para que todo mundo que está ajudando também possa acompanhar de perto a recuperação dele.\n\nA cirurgia passou, mas nossa campanha ainda não terminou. Ainda temos despesas do tratamento, internação, medicamentos, alimentação diferenciada e os cuidados que ele vai precisar depois de voltar para casa.\n\nToda ajuda continua fazendo diferença para o Dante. 💚🐾",
    type: "status",
    isCurrentStatus: true,
    statusLabel: "Recuperação · Alta prevista para segunda-feira",
  },
];

export const currentStatusEvent =
  timelineEvents.find((event) => event.isCurrentStatus) ??
  timelineEvents[timelineEvents.length - 1];
