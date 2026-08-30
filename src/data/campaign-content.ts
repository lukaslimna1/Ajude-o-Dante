export type FaqItem = {
  question: string;
  answer: string;
};

export const faqItems: FaqItem[] = [
  {
    question: "O que aconteceu com o Dante?",
    answer:
      "Dante tem 7 meses e engoliu pano e materiais que causaram uma obstrução grave no trato gastrointestinal, com uma linha puxando e 'sanfonando' seu intestino. Ele precisou de atendimento emergencial, exames de ultrassom e cirurgia na Clínica Animal House, em Bauru.",
  },
  {
    question: "Como o Dante está agora?",
    answer:
      "A cirurgia foi realizada com sucesso pela equipe veterinária da Clínica Animal House. Dante encontra-se estável e em recuperação pós-cirúrgica, sob monitoramento e cuidados constantes.",
  },
  {
    question: "Onde ele está sendo atendido?",
    answer:
      "Dante está sendo atendido na Clínica Veterinária Animal House, localizada em Bauru/SP, sob os cuidados dos veterinários responsáveis pela equipe clínica.",
  },
  {
    question: "Como posso confirmar que o caso é verdadeiro?",
    answer:
      "A transparência é nossa prioridade absoluta. Todos os exames, fotos e boletins são publicados aqui. Além disso, a própria Clínica Animal House autorizou o contato direto pelo WhatsApp (14) 99122-8991 para confirmação de informações sobre o caso e o tratamento.",
  },
  {
    question: "Como posso ajudar?",
    answer:
      "Você pode ajudar fazendo uma doação direta por Pix (chave celular 14988025296), pelo Mercado Pago com cartão/boleto, comprando um número da Rifa da TV ou compartilhando o link da campanha com amigos e nas redes sociais.",
  },
  {
    question: "Para onde vai o dinheiro arrecadado?",
    answer:
      "Todo o valor arrecadado é destinado aos custos do tratamento e da recuperação do Dante, incluindo exames, cirurgia, internação, medicamentos, alimentação especial e acompanhamento. Após a conclusão do tratamento e a quitação de todas as despesas relacionadas ao caso, se houver saldo remanescente, ele será destinado integralmente para ajudar outras famílias que estejam enfrentando uma emergência veterinária. Essa destinação também será informada no site.",
  },
  {
    question: "Qualquer valor ajuda?",
    answer:
      "Sim! Toda contribuição, por menor que pareça, ajuda a custear doses de medicamentos, insumos e diárias de internação. Se não puder doar financeiramente, o compartilhamento da campanha tem um valor imenso.",
  },
  {
    question: "Como acompanho as atualizações?",
    answer:
      "Esta página é atualizada continuamente na seção Linha do Tempo e Estado Atual assim que novos boletins veterinários são emitidos pela clínica.",
  },
  {
    question: "Vai ter uma rifa?",
    answer:
      "Sim! Estamos organizando uma Ação Solidária com a Rifa de uma TV para arrecadar fundos para o tratamento e a recuperação do Dante. As informações de foto do prêmio, valor e quantidade de números serão divulgadas em breve.",
  },
  {
    question: "Como compro um número da rifa?",
    answer:
      "Você já pode falar diretamente com o Lucas Lima pelo WhatsApp (14) 98802-5296 ou com o Evandro Caluini pelo WhatsApp (14) 99609-9191 para reservar ou garantir seus números da rifa solidária.",
  },
];

export const contacts = {
  lucas: {
    name: "Lucas Lima",
    phone: "(14) 98802-5296",
    whatsappRaw: "5514988025296",
    raffleMessage:
      "Olá! Vim pelo site Ajude o Dante e gostaria de comprar um número da Rifa da TV.",
    floatingMessage:
      "Olá! Vim pelo site Ajude o Dante e gostaria de falar sobre o Dante.",
    getRaffleUrl() {
      return `https://wa.me/${this.whatsappRaw}?text=${encodeURIComponent(
        this.raffleMessage
      )}`;
    },
    getFloatingUrl() {
      return `https://wa.me/${this.whatsappRaw}?text=${encodeURIComponent(
        this.floatingMessage
      )}`;
    },
  },
  evandro: {
    name: "Evandro Caluini",
    phone: "(14) 99609-9191",
    whatsappRaw: "5514996099191",
    raffleMessage:
      "Olá! Vim pelo site Ajude o Dante e gostaria de comprar um número da Rifa da TV.",
    getRaffleUrl() {
      return `https://wa.me/${this.whatsappRaw}?text=${encodeURIComponent(
        this.raffleMessage
      )}`;
    },
  },
  animalHouse: {
    name: "Clínica Animal House",
    phone: "(14) 99122-8991",
    whatsappRaw: "5514991228991",
    verificationMessage:
      "Olá! Vim pelo site Ajude o Dante e gostaria de confirmar algumas informações sobre o caso e o tratamento do Dante.",
    getVerificationUrl() {
      return `https://wa.me/${this.whatsappRaw}?text=${encodeURIComponent(
        this.verificationMessage
      )}`;
    },
  },
};

export const raffleInfo = {
  title: "AÇÃO SOLIDÁRIA",
  heading: "Rifa da TV",
  badge: "Em preparação",
  description: [
    "Estamos preparando uma rifa solidária de uma TV para ajudar nas despesas do tratamento e da recuperação do Dante.",
    "Em breve esta área receberá a foto do prêmio, o valor de cada número, a quantidade disponível e todas as informações da rifa.",
    "Se você já quiser comprar ou reservar um número, fale diretamente com um dos responsáveis:",
  ],
};

export const campaignConfig = {
  pixKey: "14988025296",
  pixOwner: "Lucas Mateus Soares de Lima",
  goalCentsDefault: 350_000,
  siteUrl: "https://ajudeodante.vercel.app",
};

export const initialSupporters: [string, string][] = [
  ["Rosangela", "Não temos palavras para agradecer esse gesto."],
  ["Leticia Mota", "Nosso agradecimento de coração."],
  ["Marina Lorenzetti", "Nosso agradecimento de coração."],
  ["Iris Cristina", "Nosso agradecimento de coração."],
  ["Mattos Max Transporte e Turismo", "Nosso agradecimento de coração."],
  ["Guilherme", "Nosso agradecimento de coração."],
  ["Gislaine", "Nosso agradecimento de coração."],
  ["Cheng", "Nosso agradecimento de coração."],
  ["Luis Carlos", "Nosso agradecimento de coração."],
  ["Veronica", "Nosso agradecimento de coração."],
  ["Giovanna", "Nosso agradecimento de coração."],
  ["Renata Ferriguti", "Apoio e mobilização."],
  ["Clínica Animal House", "Cuidado, atendimento e apoio ao Dante."],
  ["Veterinária Isa", "Cuidado e atendimento."],
  ["Veterinário Vinicius", "Cuidado e atendimento."],
  ["Vereador Júlio Cesar", "Nosso agradecimento de coração."],
];

export const legacyFinancialSupporters: [string, string][] = initialSupporters;
export const otherSupporters: [string, string][] = [];
export const supporters: [string, string][] = initialSupporters;

export const campaignImages = [
  { src: "/images/Usar/Fotos/02.jpeg", alt: "Dante durante visita de atualização após a cirurgia" },
  { src: "/images/Usar/Fotos/03.jpeg", alt: "Dante recebendo carinho durante visita na clínica" },
  { src: "/images/Usar/Fotos/04.jpeg", alt: "Dante em repouso e recuperação" },
  { src: "/images/Usar/Fotos/05.jpeg", alt: "Dante deitado confortavelmente durante o pós-operatório" },
  { src: "/images/Usar/Fotos/01.jpeg", alt: "Registro espontâneo do Dante durante a visita" },
  { src: "/images/Usar/Fotos/Dante 01  (3).png", alt: "Foto real do Dante recebendo carinho" },
  { src: "/images/Usar/Fotos/Dante no carrinho.jpeg", alt: "Foto real do Dante recebendo cuidados" },
  { src: "/images/Usar/Fotos/Animal House - Fachada.jpeg", alt: "Fachada da Clínica Animal House" },
];

export const danteLatestVisit = {
  badge: "NOVA ATUALIZAÇÃO • HOJE",
  heading: "Dante está se recuperando 💚",
  subheading: "Fomos visitá-lo hoje e a alta está prevista para segunda-feira.",
  title: "Fomos visitar o Dante 💚",
  paragraphs: [
    "Hoje conseguimos passar um tempo com o Dante e acompanhar de perto sua recuperação depois da cirurgia. Ele segue recebendo os cuidados necessários e, neste momento, a alta está prevista para segunda-feira.",
    "Registramos essa visita em fotos e vídeo para que todo mundo que está ajudando também possa acompanhar de perto a recuperação dele.",
    "A cirurgia passou, mas nossa campanha ainda não terminou. Ainda temos despesas do tratamento, internação, medicamentos, alimentação diferenciada e os cuidados que ele vai precisar depois de voltar para casa.",
    "Toda ajuda continua fazendo diferença para o Dante. 💚🐾",
  ],
  primaryPhoto: {
    src: "/images/Usar/Fotos/02.jpeg",
    alt: "Dante durante visita de atualização após a cirurgia",
  },
  photos: [
    {
      id: "02",
      src: "/images/Usar/Fotos/02.jpeg",
      alt: "Dante durante visita de atualização após a cirurgia",
      label: "Foto principal",
    },
    {
      id: "03",
      src: "/images/Usar/Fotos/03.jpeg",
      alt: "Dante recebendo carinho durante visita na clínica",
      label: "Carinho e afeto",
    },
    {
      id: "04",
      src: "/images/Usar/Fotos/04.jpeg",
      alt: "Dante em repouso e recuperação",
      label: "Repouso",
    },
    {
      id: "05",
      src: "/images/Usar/Fotos/05.jpeg",
      alt: "Dante deitado confortavelmente durante o pós-operatório",
      label: "Pós-operatório",
    },
    {
      id: "01",
      src: "/images/Usar/Fotos/01.jpeg",
      alt: "Registro espontâneo do Dante durante a visita",
      label: "Registro espontâneo",
    },
  ],
  video: {
    src: "/images/Usar/Video/Dante - Visita.mp4",
    poster: "/images/Usar/Fotos/02.jpeg",
    title: "Vídeo da visita ao Dante durante a recuperação",
    description: "Registro real do Dante recebendo cuidados e carinho hoje na clínica.",
  },
};
