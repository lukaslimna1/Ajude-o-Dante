import CampaignPage from "@/components/campaign-page";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://ajudeodante.vercel.app/#website",
      url: "https://ajudeodante.vercel.app",
      name: "Ajude o Dante",
      inLanguage: "pt-BR",
    },
    {
      "@type": "WebPage",
      "@id": "https://ajudeodante.vercel.app/#webpage",
      url: "https://ajudeodante.vercel.app",
      name: "Ajude o Dante | Uma nova chance de vida",
      description: "Acompanhe o tratamento do Dante e veja como ajudar com segurança, carinho e transparência.",
      isPartOf: { "@id": "https://ajudeodante.vercel.app/#website" },
      about: { "@type": "Thing", name: "Campanha de tratamento veterinário do Dante" },
      inLanguage: "pt-BR",
    },
    {
      "@type": "FAQPage",
      mainEntity: [
        ["Qualquer valor pode ajudar?", "Sim. Cada contribuição e cada compartilhamento ajudam o Dante a continuar o tratamento."],
        ["Para onde vai o dinheiro?", "Para despesas do tratamento, como internação, exames, medicamentos, alimentação e recuperação."],
        ["Como acompanho as atualizações?", "Esta página será atualizada conforme tivermos novas informações confirmadas."],
        ["Posso compartilhar a campanha?", "Sim. Compartilhar a campanha é uma forma muito importante de ajudar."],
        ["Como faço para avisar que já doei?", "Use o formulário ao lado ou fale diretamente com o Lucas pelo WhatsApp."],
      ].map(([name, text]) => ({ "@type": "Question", name, acceptedAnswer: { "@type": "Answer", text } })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <CampaignPage />
    </>
  );
}
