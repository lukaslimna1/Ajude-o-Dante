"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { createClient } from "@supabase/supabase-js";

const goalCentsDefault = 350_000;
const pixKey = "14988025296";
const siteUrl = "https://ajudeodante.vercel.app";
const whatsappUrl = "https://wa.me/5514988025296";
const images = [
  { src: "/images/Usar/Fotos/Dante 01  (3).png", alt: "Foto real do Dante recebendo carinho" },
  { src: "/images/Usar/Fotos/Dante 03.png", alt: "Foto real do Dante" },
  { src: "/images/Usar/Fotos/Dante 04.png", alt: "Foto real do Dante" },
  { src: "/images/Usar/Fotos/Dante 05.png", alt: "Foto real do Dante" },
  { src: "/images/Usar/Fotos/Dante no carrinho.jpeg", alt: "Foto real do Dante recebendo cuidados" },
  { src: "/images/Usar/Fotos/Animal House - Fachada.jpeg", alt: "Fachada da Clínica Animal House" },
];

const supporters = [
  ["Rosangela", "Nosso agradecimento"],
  ["Leticia Mota Leite Martins", "Nosso agradecimento"],
  ["Marina N. Lorenzetti Gil", "Nosso agradecimento"],
  ["Iris Cristina de O. O. Alcarde", "Nosso agradecimento"],
  ["Mattos Max Transporte e Turismo", "Nosso agradecimento"],
  ["Renata Ferreguti", "Família TEA Bauru"],
  ["Clínica Animal House", "Cuidado e atendimento"],
  ["Veterinária Isa", "Cuidado e atendimento"],
  ["Veterinário Vinicius", "Cuidado e atendimento"],
  ["Vereador Júlio Cesar", "Nosso agradecimento"],
];

const timelineEvents = [
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
];

type Campaign = { goalCents: number; confirmedCents: number };
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatCents = (value: number) => money.format(value / 100);

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const isPublicKey = Boolean(key && !key.startsWith("sb_secret_") && !key.startsWith("service_role"));
  if (!url || !key || !isPublicKey) return null;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:" ? createClient(parsedUrl.toString(), key) : null;
  } catch {
    return null;
  }
}

export default function CampaignPage() {
  const reduceMotion = useReducedMotion();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [status, setStatus] = useState("Carregando dados da campanha…");
  const [menuOpen, setMenuOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [donorStatus, setDonorStatus] = useState("");
  const [selectedImage, setSelectedImage] = useState<(typeof images)[number] | null>(null);
  const [donationAmount, setDonationAmount] = useState("50");
  const [mercadoPagoStatus, setMercadoPagoStatus] = useState("");
  const [mercadoPagoLoading, setMercadoPagoLoading] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const [activeTimelineId, setActiveTimelineId] = useState(timelineEvents[0].id);
  const [visitedTimelineIds, setVisitedTimelineIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    async function loadProgress() {
      const supabase = createSupabase();
      if (!supabase) {
        if (active) setStatus("Configure o Supabase para carregar a arrecadação real.");
        return;
      }
      const { data, error } = await supabase.from("dante_campaign").select("goal_cents, confirmed_cents").eq("id", "main").maybeSingle();
      if (active && !error && data) {
        setCampaign({ goalCents: Number(data.goal_cents), confirmedCents: Number(data.confirmed_cents) });
        setStatus("Valores confirmados no Supabase");
      } else if (active) setStatus("Arrecadação sendo atualizada.");
    }
    void loadProgress();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const donationResult = new URLSearchParams(window.location.search).get("donation");
      if (donationResult === "success") setMercadoPagoStatus("Retorno recebido. A confirmação financeira será refletida após o webhook.");
      if (donationResult === "pending") setMercadoPagoStatus("Pagamento pendente. A confirmação será atualizada quando o Mercado Pago concluir a análise.");
      if (donationResult === "failure") setMercadoPagoStatus("O pagamento não foi concluído. Você pode tentar novamente ou usar o Pix.");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const items = Array.from(timeline.querySelectorAll<HTMLElement>("[data-timeline-id]"));
    let frame = 0;
    const updateTimeline = () => {
      frame = 0;
      const rect = timeline.getBoundingClientRect();
      const travel = Math.max(1, rect.height + window.innerHeight * 0.35);
      const progress = Math.max(0, Math.min(1, (window.innerHeight * 0.78 - rect.top) / travel));
      setTimelineProgress(progress);
      const focusLine = window.innerHeight * 0.42;
      const closest = items.reduce<{ id: string; distance: number } | null>((current, item) => {
        const itemRect = item.getBoundingClientRect();
        const distance = Math.abs(itemRect.top + itemRect.height * 0.3 - focusLine);
        return !current || distance < current.distance ? { id: item.dataset.timelineId || "", distance } : current;
      }, null);
      if (closest?.id) setActiveTimelineId(closest.id);
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateTimeline);
    };
    const observer = new IntersectionObserver((entries) => {
      const entering = entries.filter((entry) => entry.isIntersecting).map((entry) => (entry.target as HTMLElement).dataset.timelineId).filter(Boolean) as string[];
      if (entering.length) setVisitedTimelineIds((current) => Array.from(new Set([...current, ...entering])));
    }, { rootMargin: "-12% 0px -58% 0px", threshold: 0.1 });
    items.forEach((item) => observer.observe(item));
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    requestUpdate();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const goalCents = campaign?.goalCents ?? goalCentsDefault;
  const confirmedCents = campaign?.confirmedCents ?? 0;
  const remainingCents = Math.max(0, goalCents - confirmedCents);
  const percentage = Math.max(0, Math.min(100, goalCents ? (confirmedCents / goalCents) * 100 : 0));
  const remainingText = campaign ? formatCents(remainingCents) : "valor atualizado";
  const shareText = useMemo(() => "Ajude o Dante a continuar o tratamento. Qualquer ajuda ou compartilhamento faz diferença.", []);

  async function copyPix() {
    try { await navigator.clipboard.writeText(pixKey); setFeedback("Chave Pix copiada. Obrigado por ajudar o Dante!"); }
    catch { setFeedback(`Chave Pix: ${pixKey}`); }
  }

  async function shareCampaign() {
    const data = { title: "Ajude o Dante", text: shareText, url: siteUrl };
    if (navigator.share) {
      try { await navigator.share(data); return; } catch { /* cancelado pelo usuário */ }
    }
    await navigator.clipboard?.writeText(siteUrl);
    setFeedback("Link da campanha copiado!");
  }

  async function startMercadoPagoCheckout() {
    const amount = Number(donationAmount.replace(",", "."));
    if (!Number.isFinite(amount) || amount < 0.01 || amount > 3500) {
      setMercadoPagoStatus("Informe um valor entre R$ 0,01 e R$ 3.500,00.");
      return;
    }
    setMercadoPagoLoading(true);
    setMercadoPagoStatus("Abrindo checkout seguro…");
    try {
      const response = await fetch("/api/mercadopago/preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
      });
      const result = await response.json().catch(() => ({})) as { checkoutUrl?: string; error?: string };
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error || "Não foi possível iniciar o checkout.");
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setMercadoPagoStatus(error instanceof Error ? error.message : "Não foi possível iniciar o checkout agora.");
      setMercadoPagoLoading(false);
    }
  }

  async function submitDonorSignal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const supabase = createSupabase();
    if (!supabase) { setDonorStatus("Configure o Supabase para registrar seu aviso de doação."); return; }
    const amount = String(form.get("amount") || "").replace(",", ".");
    const numericAmount = amount ? Number(amount) : null;
    if (numericAmount !== null && (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > 3500)) { setDonorStatus("Confira o valor informado."); return; }
    setDonorStatus("Enviando…");
    const { error } = await supabase.from("dante_donor_signals").insert({
      donor_name: String(form.get("name") || "").trim() || null,
      contact: String(form.get("contact") || "").trim() || null,
      amount_cents: numericAmount === null ? null : Math.round(numericAmount * 100),
      message: String(form.get("message") || "").trim() || null,
      consent_to_contact: form.get("consent") === "on",
    });
    if (error) { setDonorStatus("Não conseguimos registrar agora. Você também pode avisar pelo WhatsApp."); return; }
    event.currentTarget.reset();
    setDonorStatus("Aviso recebido. Muito obrigado por ajudar o Dante!");
  }

  const nav = (href: string, label: string) => <a href={href} onClick={() => setMenuOpen(false)}>{label}</a>;

  return (
    <main className="site-shell">
      <header className="topbar"><div className="container topbar-inner">
        <a className="brand" href="#top" aria-label="Ajude o Dante, voltar ao início"><span className="brand-mark" aria-hidden="true">🐾</span><span className="brand-text">AJUDE<br />O DANTE</span></a>
        <nav className={menuOpen ? "nav nav-open" : "nav"} aria-label="Navegação principal">{nav("#sobre", "Sobre o Dante")}{nav("#ajudar", "Como ajudar")}{nav("#atualizacoes", "Atualizações")}{nav("#transparencia", "Transparência")}{nav("#perguntas", "Perguntas")}</nav>
        <a className="button button-primary" href="#doar">Quero ajudar</a>
        <button className="menu-button" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "×" : "☰"}</button>
      </div></header>

      <div id="top" />
      <section className="hero container"><div className="hero-grid">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}><p className="eyebrow">Ele ainda precisa de você <span aria-hidden="true">♥</span></p><h1>Ajude o <span>Dante</span></h1><p className="hero-lead">Internado, em tratamento e lutando por uma nova chance de vida.</p><div className="hero-actions"><a className="button button-primary" href="#doar">♥ Quero ajudar o Dante</a><button className="button button-secondary" onClick={shareCampaign}>↗ Compartilhar campanha</button></div></motion.div>
        <motion.div className="hero-photo" initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .7 }}><Image src="/images/Usar/Fotos/Dante 07.png" alt="Foto real do Dante descansando em uma manta" fill priority loading="eager" sizes="(max-width: 900px) 100vw, 48vw" /></motion.div>
      </div>
      <motion.div className="campaign-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .15, duration: .6 }}><div className="campaign-card-head"><h2>Ajude o Dante a se recuperar</h2><span className="campaign-status">{Math.round(percentage)}%</span></div><div className="progress-track" role="progressbar" aria-label="Progresso da arrecadação" aria-valuemin={0} aria-valuemax={goalCents / 100} aria-valuenow={confirmedCents / 100}><motion.div className="progress-fill" animate={{ width: `${percentage}%` }} transition={{ duration: .8 }} /></div><p className="progress-note">{status}</p><div className="campaign-metrics"><div className="metric"><span>Arrecadado</span><strong>{campaign ? formatCents(confirmedCents) : "—"}</strong></div><div className="metric"><span>Meta</span><strong>{formatCents(goalCents)}</strong></div><div className="metric"><span>Faltam</span><strong>{remainingText}</strong></div></div><a className="button button-primary" href="#doar">♥ Quero ajudar o Dante</a><p className="secure-note">⌑ Doação segura e transparente</p></motion.div></section>

      <section id="sobre" className="section container"><div className="two-column"><div className="soft-panel"><p className="section-kicker">Sobre o Dante</p><h2>O que aconteceu?</h2><p>Dante tem 7 meses e é nosso PET. Ele engoliu pano e outros materiais, e os exames mostraram corpos estranhos no estômago e no intestino.</p><p>Uma linha está puxando e “sanfonando” o intestino, obstruindo a passagem. Por isso, ele está recebendo atendimento, exames e tratamento na Clínica Animal House.</p></div><div className="soft-panel"><p className="section-kicker">Cuidado em cada etapa</p><h2>Como sua ajuda faz a diferença</h2><div className="care-grid">{[["🏥", "Internação", "Cuidados 24h e acompanhamento veterinário."], ["⌕", "Exames", "Diagnóstico e decisões mais seguras."], ["💊", "Medicamentos", "Tratamento conforme a orientação clínica."], ["🍲", "Alimentação", "Força para recuperação e bem-estar."], ["♥", "Pós-tratamento", "Recuperação com carinho e segurança."], ["↻", "Acompanhamento", "Novas consultas quando necessário."]].map(([icon, title, text], index) => <motion.div className="care-card" key={title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .25 }} transition={{ delay: index * .04, duration: .4 }}><div className="fact-icon" aria-hidden="true">{icon}</div><h3>{title}</h3><p>{text}</p></motion.div>)}</div></div></div></section>

      <section id="atualizacoes" className="section container"><div className="section-heading"><p className="section-kicker">Estado atual</p><h2>Como ele está agora?</h2><p className="section-intro">Dante está em tratamento e acompanhamento veterinário. Este espaço ficará pronto para receber novos boletins.</p></div><div className="status-grid"><div className="status-photo"><Image src="/images/Usar/Fotos/Dante 06.png" alt="Foto real do Dante recebendo cuidados" fill sizes="(max-width: 900px) 100vw, 35vw" /></div><div className="status-card"><h3>Animal House</h3><p>A equipe da clínica está acompanhando o Dante durante o tratamento. Cada atualização será compartilhada com clareza e responsabilidade.</p><span className="status-tag">● Em tratamento / acompanhamento</span></div></div></section>

      <section className="section container">
        <div className="section-heading">
          <p className="section-kicker">Acompanhe a história</p>
          <h2>Linha do tempo</h2>
          <p className="section-intro">Os principais momentos da história do Dante, em ordem.</p>
        </div>
        <div className="timeline-shell" ref={timelineRef} style={{ "--timeline-progress": timelineProgress } as CSSProperties}>
          <span className="timeline-track" aria-hidden="true" />
          <span className="timeline-progress" aria-hidden="true" />
          <div className="timeline" role="list" aria-label="Cronologia da história do Dante">
            {timelineEvents.map((event, index) => {
              const isActive = activeTimelineId === event.id;
              const isVisited = visitedTimelineIds.includes(event.id);

              return (
                <motion.article
                  className={`timeline-item${isActive ? " timeline-item-active" : ""}${isVisited ? " timeline-item-visited" : ""}`}
                  key={event.id}
                  data-timeline-id={event.id}
                  role="listitem"
                  aria-current={isActive ? "step" : undefined}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: .24 }}
                  transition={{ delay: index * .045, duration: .45 }}
                >
                  <span className="timeline-dot" aria-hidden="true" />
                  <div className="timeline-copy">
                    <div className="timeline-meta">
                      <span className="timeline-date">{event.date}</span>
                      <span className="timeline-time">{event.time}</span>
                    </div>
                    <h3>{event.title}</h3>
                    <p>{event.summary}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="soft-panel timeline-closure">
          <div className="timeline-closure-icon" aria-hidden="true">♥</div>
          <div className="timeline-closure-content">
            <p className="section-kicker">A campanha continua</p>
            <h2>Por que ainda precisamos de ajuda?</h2>
            <div className="timeline-closure-copy">
              <p>Mesmo com todas as pessoas que já contribuíram e com a enorme ajuda que recebemos, ainda estamos longe de conseguir pagar todas as despesas do tratamento do Dante.</p>
              <p>O custo não envolve apenas o procedimento. Existem também os exames já realizados, internação, medicamentos, acompanhamento veterinário, alimentação durante a recuperação e possíveis novos exames.</p>
              <p>A campanha existe para ajudar a custear todo o tratamento, incluindo internação, medicamentos, exames, alimentação e recuperação. Qualquer valor faz diferença e representa uma chance de ele voltar para casa saudável.</p>
            </div>
          </div>
          <div className="timeline-closure-actions hero-actions">
            <button className="button button-secondary" onClick={shareCampaign}>↗ Espalhe a campanha</button>
            <a className="button button-primary" href="#doar">♥ Quero ajudar o Dante</a>
          </div>
        </div>
      </section>

      <section className="section container"><div className="section-heading"><p className="section-kicker">Registros reais</p><h2>Fotos e vídeos</h2><p className="section-intro">Acompanhe a rotina do Dante com as fotos selecionadas para esta versão.</p></div><div className="media-grid"><div className="gallery">{images.map((image) => <button key={image.src} onClick={() => setSelectedImage(image)} aria-label="Ampliar foto"><Image src={image.src} alt={image.alt} fill sizes="(max-width: 560px) 50vw, 25vw" /></button>)}</div><div className="video-card"><video controls playsInline preload="metadata" poster="/images/Usar/Fotos/Dante 02.png"><source src="/images/Usar/Video/levando o Dante para Clinica.mp4" type="video/mp4" />Seu navegador não suporta vídeo HTML5.</video><div className="video-copy"><h3>Levar o Dante para a clínica</h3><p>Vídeo real do atendimento e do cuidado com o Dante.</p></div></div></div></section>
      <AnimatePresence>{selectedImage && <motion.div className="lightbox" role="dialog" aria-modal="true" aria-label={selectedImage.alt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedImage(null)}><div className="lightbox-inner" onClick={(event) => event.stopPropagation()}><button className="lightbox-close" onClick={() => setSelectedImage(null)} aria-label="Fechar imagem">×</button><Image src={selectedImage.src} alt={selectedImage.alt} fill sizes="90vw" /></div></motion.div>}</AnimatePresence>

      <section id="ajudar" className="section container"><div className="section-heading"><p className="section-kicker">Gratidão</p><h2>Quem já ajudou o Dante</h2><p className="section-intro">Cada nome representa um gesto de carinho, apoio e confiança. Muito obrigado por fazer parte dessa história.</p></div><div className="supporters-grid">{supporters.map(([name, note], index) => <motion.div className="supporter-card" key={name} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} whileHover={{ y: -5, scale: 1.015 }} viewport={{ once: true, amount: .2 }} transition={{ delay: index * .04, duration: .4 }}><span className="supporter-icon" aria-hidden="true">♥</span><div><strong>{name}</strong><small>{note}</small></div></motion.div>)}</div><div className="gratitude-note"><span aria-hidden="true">🐾</span><div><strong>Obrigado por ajudar o Dante</strong><p>Se você também ajudou e ainda não está aqui, avise pelo formulário. Vamos manter esta lista viva com respeito e carinho.</p></div></div><div className="soft-panel" style={{ marginTop: 24 }}><p className="section-kicker">Não consegue doar?</p><h2>Compartilhar já ajuda muito</h2><p className="section-intro">Espalhe a campanha para que mais pessoas conheçam a história do Dante.</p><button className="button button-primary" style={{ marginTop: 18 }} onClick={shareCampaign}>↗ Compartilhar campanha</button></div></section>

      <section id="transparencia" className="section container">
        <div className="two-column">
          <div className="soft-panel">
            <p className="section-kicker">Clareza sempre</p>
            <h2>Transparência</h2>
            <p>Queremos mostrar com clareza como cada ajuda está sendo utilizada. Os comprovantes e atualizações serão organizados aqui conforme forem disponibilizados.</p>
            <span className="status-tag" style={{ background: "var(--soft)", color: "var(--orange-dark)" }}>Documentos sendo organizados</span>
          </div>

          <div id="doar" className="pix-box">
            <div className="pix-header">
              <p className="pix-label">Pix direto</p>
              <span className="pix-availability">Disponível agora</span>
            </div>

            <div className="pix-qr">
              <Image
                className="pix-qr-source"
                src="/images/Usar/qr-pix-direto.png"
                alt="QR Code Pix direto para ajudar o Dante"
                width={360}
                height={780}
                unoptimized
              />
            </div>

            <div className="pix-key-area">
              <p className="pix-label pix-key-label">Ou copie a chave Pix</p>
              <div className="pix-key">{pixKey}</div>
              <p className="pix-owner">Titular: Lucas Mateus Soares de Lima</p>
              <button className="button button-primary" onClick={copyPix}><span aria-hidden="true">▣</span> Copiar chave Pix</button>
              <p className="secure-note pix-feedback" aria-live="polite">{feedback}</p>
            </div>

            <div className="mp-checkout">
              <div className="mp-heading">
                <div>
                  <p className="pix-label">Checkout seguro</p>
                  <h3>Mercado Pago</h3>
                </div>
                <span className="mp-shield" aria-hidden="true">⌑</span>
              </div>
              <p className="mp-description">Escolha o valor e conclua a doação no ambiente seguro do Mercado Pago.</p>
              <ul className="mp-methods" aria-label="Formas de pagamento que podem estar disponíveis no checkout">
                <li><span className="mp-method-icon" aria-hidden="true">◈</span><span>Pix</span></li>
                <li><span className="mp-method-icon" aria-hidden="true">▣</span><span>Cartão</span></li>
                <li><span className="mp-method-icon" aria-hidden="true">≡</span><span>Boleto</span></li>
              </ul>
              <p className="mp-methods-note">Pix, cartão e boleto aparecem conforme as opções disponíveis no checkout.</p>
              <div className="mp-row">
                <label htmlFor="donation-amount">Valor da doação</label>
                <div className="mp-input-wrap"><span>R$</span><input id="donation-amount" value={donationAmount} onChange={(event) => setDonationAmount(event.target.value)} inputMode="decimal" aria-label="Valor da doação em reais" /></div>
              </div>
              <button className="button button-mp" onClick={startMercadoPagoCheckout} disabled={mercadoPagoLoading}><span aria-hidden="true">↗</span> {mercadoPagoLoading ? "Abrindo checkout…" : "Continuar no Mercado Pago"}</button>
              <p className="secure-note mp-status" aria-live="polite">{mercadoPagoStatus}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section container"><div className="donate-grid"><div className="soft-panel"><p className="section-kicker">Já doou?</p><h2>Avise a gente</h2><p className="section-intro">Seu aviso ajuda a organizar os agradecimentos. Não é necessário informar dados sensíveis.</p><form className="donor-form" onSubmit={submitDonorSignal}><label>Nome (opcional)<input name="name" maxLength={120} placeholder="Como podemos agradecer?" /></label><label>Contato (opcional)<input name="contact" maxLength={180} placeholder="WhatsApp, Instagram ou e-mail" /></label><label>Valor doado (opcional)<input name="amount" inputMode="decimal" placeholder="R$ 0,00" /></label><label>Mensagem<textarea name="message" maxLength={500} placeholder="Deixe uma mensagem para o Dante" /></label><label className="check-row"><input name="consent" type="checkbox" /> <span>Autorizo contato para confirmação, se necessário.</span></label><button className="button button-primary" type="submit">♥ Avisar que doei</button><p className="form-status" aria-live="polite">{donorStatus}</p></form></div><div id="perguntas" className="soft-panel"><p className="section-kicker">Dúvidas</p><h2>Perguntas frequentes</h2><div className="faq-list"><details><summary>Qualquer valor pode ajudar?</summary><p>Sim. Cada contribuição e cada compartilhamento ajudam o Dante a continuar o tratamento.</p></details><details><summary>Para onde vai o dinheiro?</summary><p>Para despesas do tratamento, como internação, exames, medicamentos, alimentação e recuperação.</p></details><details><summary>Como acompanho as atualizações?</summary><p>Esta página será atualizada conforme tivermos novas informações confirmadas.</p></details><details><summary>Posso compartilhar a campanha?</summary><p>Sim. Compartilhar a campanha é uma forma muito importante de ajudar.</p></details><details><summary>Como faço para avisar que já doei?</summary><p>Use o formulário ao lado ou fale diretamente com o Lucas pelo WhatsApp.</p></details></div></div></div></section>

      <section className="section container"><div className="final-cta"><p className="section-kicker" style={{ color: "#ffc29d" }}>Toda ajuda conta</p><h2>Ajude o Dante a continuar lutando.</h2><p>Um gesto pequeno pode significar mais cuidado, mais tempo e uma nova chance.</p><a className="button button-primary" href="#doar">♥ Quero ajudar o Dante</a></div></section>
      <footer className="site-footer container"><p>Ajude o Dante · Campanha independente em Bauru/SP.</p><p>Contato: <a href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp do Lucas</a> · <button className="button button-soft" style={{ minHeight: 35, padding: "0 12px", fontSize: 12 }} onClick={shareCampaign}>Compartilhar</button></p></footer>
      <div className="mobile-cta"><div><small>Campanha do Dante</small><strong>Faltam {remainingText}</strong></div><a className="button button-primary" href="#doar">AJUDAR</a></div>
    </main>
  );
}
