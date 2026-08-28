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
      "Todo o valor é integralmente destinado aos custos do tratamento do Dante: exames laboratoriais e de imagem, procedimento cirúrgico, diárias de internação 24h, medicamentos, alimentação especial e consultas de acompanhamento pós-operatório.",
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

export const legacyFinancialSupporters: [string, string][] = [
  ["Rosangela", "Nosso agradecimento especial"],
  ["Leticia Mota Leite Martins", "Nosso agradecimento"],
  ["Marina N. Lorenzetti Gil", "Nosso agradecimento"],
  ["Iris Cristina de O. O. Alcarde", "Nosso agradecimento"],
  ["Mattos Max Transporte e Turismo", "Nosso agradecimento"],
];

export const otherSupporters: [string, string][] = [
  ["Renata Ferreguti", "Família TEA Bauru"],
  ["Clínica Animal House", "Cuidado e atendimento"],
  ["Veterinária Isa", "Cuidado e atendimento"],
  ["Veterinário Vinicius", "Cuidado e atendimento"],
  ["Vereador Júlio Cesar", "Nosso agradecimento"],
];

export const supporters: [string, string][] = [
  ...legacyFinancialSupporters,
  ...otherSupporters,
];

export const campaignImages = [
  { src: "/images/Usar/Fotos/Dante 01  (3).png", alt: "Foto real do Dante recebendo carinho" },
  { src: "/images/Usar/Fotos/Dante 03.png", alt: "Foto real do Dante" },
  { src: "/images/Usar/Fotos/Dante 04.png", alt: "Foto real do Dante" },
  { src: "/images/Usar/Fotos/Dante 05.png", alt: "Foto real do Dante" },
  { src: "/images/Usar/Fotos/Dante no carrinho.jpeg", alt: "Foto real do Dante recebendo cuidados" },
  { src: "/images/Usar/Fotos/Animal House - Fachada.jpeg", alt: "Fachada da Clínica Animal House" },
];
