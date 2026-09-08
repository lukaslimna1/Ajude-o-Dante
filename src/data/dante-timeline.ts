export type TimelineEvent = {
  id: string;
  date: string;
  time: string;
  location?: string;
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
    time: "Durante o dia",
    location: "Clínica Animal House",
    title: "Fomos visitar o Dante 💚",
    summary: "Conseguimos passar um tempo com o Dante e acompanhar de perto sua recuperação depois da cirurgia. Naquele momento, a alta ainda estava prevista para segunda-feira.",
    description: "Conseguimos passar um tempo com o Dante e acompanhar de perto sua recuperação depois da cirurgia. Ele seguia recebendo os cuidados necessários e, naquele momento, a alta estava prevista para segunda-feira.\n\nRegistramos a visita em fotos e vídeo para que todo mundo que estava ajudando também pudesse acompanhar de perto a recuperação dele.\n\nA cirurgia havia passado, mas a campanha ainda não tinha terminado. Ainda existiam despesas do tratamento, internação, medicamentos, alimentação diferenciada e os cuidados necessários depois da volta para casa.",
    type: "status",
    isCurrentStatus: false,
    statusLabel: "Recuperação · Alta prevista para segunda-feira",
  },
  {
    id: "dante-nao-teve-alta-5592",
    date: "31/08/2026",
    time: "19h",
    location: "Clínica Animal House",
    title: "Dante não teve alta",
    summary: "Dante apresentou episódios de vômito e o ultrassom mostrou processos inflamatórios.",
    description: "Dante apresentou episódios de vômito e, por isso, foi realizado um novo ultrassom. O exame mostrou processos inflamatórios e a equipe decidiu mantê-lo em observação até que estivesse bem para voltar para casa.",
    isCurrentStatus: false,
    statusLabel: "Sem alta prevista",
  },
  {
    id: "alta-do-dante-7266",
    date: "01/09/2026",
    time: "17h10",
    location: "Animal House",
    title: "Alta do Dante",
    summary: "Dante teve alta e fomos buscá-lo para continuar a recuperação em casa.",
    description: "Dante teve alta e fomos buscá-lo para continuar a recuperação em casa. Ainda era necessário comprar medicamentos e manter todos os cuidados do pós-operatório.\n\nTambém continuavam existindo valores do tratamento a serem pagos, por isso as doações e a ação entre amigos continuavam sendo muito importantes para ajudar na recuperação dele.",
    isCurrentStatus: false,
    statusLabel: "Alta do Dante",
  },
  {
    id: "2026-09-03-crise-dor-cuidados-redobrados",
    date: "03/09/2026",
    time: "Madrugada, manhã e tarde",
    location: "Veterinário e casa",
    title: "Crise de dor, nova avaliação e cuidados redobrados",
    summary: "Na madrugada, Dante teve uma crise intensa de dor ao evacuar e precisou voltar ao veterinário. Os exames mostraram que internamente a recuperação seguia bem, mas os pontos externos da cirurgia haviam se aberto.",
    description: "Por volta de 1h da madrugada, Dante tentou evacuar e apresentou uma crise muito forte de dor. Ele começou a tremer, ficou extremamente desconfortável e exausto.\n\nÀs 7h da manhã, levamos Dante novamente ao veterinário para uma nova avaliação. Foi realizado outro ultrassom e recebemos uma notícia importante: os pontos internos estavam preservados e a parte interna da cirurgia estava bem.\n\nAo longo do dia, porém, foi constatado que parte dos pontos externos havia se aberto. Segundo a orientação veterinária, naquele momento não seria possível realizar uma nova sutura externa.\n\nDante recebeu alta e voltou para casa, mas agora com uma recuperação que exige ainda mais atenção. Os cuidados com a ferida passaram a ser redobrados, com limpeza e aplicação frequente dos medicamentos tópicos orientados pela equipe veterinária, incluindo Rifocina, além do novo tratamento tópico indicado para auxiliar a recuperação da ferida.\n\nMesmo estando em casa e com a parte interna da cirurgia evoluindo bem, o tratamento ainda não terminou. Seguimos acompanhando Dante de perto, cuidando da ferida e observando qualquer alteração durante sua recuperação.",
    type: "status",
    isCurrentStatus: true,
    statusLabel: "Recuperação em casa · cuidados redobrados",
  },
];

export const currentStatusEvent =
  timelineEvents.find((event) => event.isCurrentStatus) ??
  timelineEvents[timelineEvents.length - 1];
