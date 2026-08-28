import CampaignPage from "@/components/campaign-page";
import { faqItems } from "@/data/campaign-content";

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
      mainEntity: faqItems.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: { "@type": "Answer", text: item.answer },
      })),
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <CampaignPage />
    </>
  );
}
