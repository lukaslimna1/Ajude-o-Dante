import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://ajudeodante.vercel.app"),
  title: "Ajude o Dante | Uma nova chance de vida",
  description: "Acompanhe o tratamento do Dante e veja como ajudar com segurança, carinho e transparência.",
  keywords: ["Ajude o Dante", "Dante", "causa animal", "doação para cachorro", "Animal House", "Bauru"],
  category: "non-profit",
  creator: "Família do Dante",
  publisher: "Ajude o Dante",
  robots: { index: true, follow: true },
  alternates: { canonical: "https://ajudeodante.vercel.app" },
  openGraph: {
    title: "Ajude o Dante",
    description: "Uma nova chance de vida para o Dante.",
    url: "https://ajudeodante.vercel.app",
    siteName: "Ajude o Dante",
    locale: "pt_BR",
    type: "website",
    images: [{ url: "/images/Usar/Fotos/Dante 07.png", width: 1536, height: 2048, alt: "Foto real do Dante descansando em uma manta" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Ajude o Dante",
    description: "Uma nova chance de vida para o Dante.",
    images: ["/images/Usar/Fotos/Dante 07.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>{children}</body>
    </html>
  );
}
