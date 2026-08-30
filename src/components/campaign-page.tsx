"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  campaignConfig,
  campaignImages,
  contacts,
  faqItems,
  initialSupporters,
} from "@/data/campaign-content";
import { currentStatusEvent, timelineEvents } from "@/data/dante-timeline";
import FloatingWhatsApp from "@/components/floating-whatsapp";
import RaffleSection from "@/components/raffle-section";
import VisitUpdateSection from "@/components/visit-update-section";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const formatCents = (value: number) => money.format(value / 100);

const donationPresets = ["10", "20", "50", "100"];

function createSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const isPublicKey = Boolean(
    key && !key.startsWith("sb_secret_") && !key.startsWith("service_role")
  );
  if (!url || !key || !isPublicKey) return null;
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === "http:" || parsedUrl.protocol === "https:"
      ? createClient(parsedUrl.toString(), key)
      : null;
  } catch {
    return null;
  }
}

export default function CampaignPage() {
  const reduceMotion = useReducedMotion();
  const [campaign, setCampaign] = useState<{
    goalCents: number;
    confirmedCents: number;
  } | null>(null);
  const [status, setStatus] = useState("Atualizando arrecadação…");
  const [publicFinancialSupporters, setPublicFinancialSupporters] = useState<string[]>([]);
  const [publicNameConsent, setPublicNameConsent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);
  const [selectedImage, setSelectedImage] = useState<
    (typeof campaignImages)[number] | null
  >(null);
  const [donationAmount, setDonationAmount] = useState("50");
  const [mercadoPagoStatus, setMercadoPagoStatus] = useState("");
  const [mercadoPagoLoading, setMercadoPagoLoading] = useState(false);
  const [openTransparencyItem, setOpenTransparencyItem] = useState<
    "documents" | "commitment" | "verification" | null
  >(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineProgress, setTimelineProgress] = useState(0);
  const [activeTimelineId, setActiveTimelineId] = useState(
    timelineEvents[0].id
  );
  const [visitedTimelineIds, setVisitedTimelineIds] = useState<string[]>([]);
  const [expandedTimelineIds, setExpandedTimelineIds] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const supabase = createSupabase();

    async function fetchCampaign() {
      if (!supabase) {
        if (active) setStatus("Configure o Supabase para carregar a arrecadação real.");
        return;
      }
      const { data, error } = await supabase
        .from("dante_campaign")
        .select("goal_cents, confirmed_cents")
        .eq("id", "main")
        .maybeSingle();
      if (active && !error && data) {
        setCampaign({
          goalCents: Number(data.goal_cents),
          confirmedCents: Number(data.confirmed_cents),
        });
        setStatus("Valores confirmados no Supabase");
      } else if (active && error) {
        setStatus("Não foi possível atualizar os valores agora.");
      }
    }

    async function fetchSupporters() {
      if (!supabase) return;
      let res = await supabase.rpc("get_dante_public_supporters");
      if (res.error) {
        // Fallback for transition compatibility
        res = await supabase.rpc("get_dante_public_financial_supporters");
      }
      if (active && !res.error && Array.isArray(res.data)) {
        const names = res.data
          .map((item: { display_name?: string } | string) =>
            typeof item === "string" ? item : item.display_name || ""
          )
          .filter(Boolean);
        setPublicFinancialSupporters(names);
      }
    }

    void fetchCampaign();
    void fetchSupporters();

    // Supabase Realtime Subscription
    const channel = supabase
      ? supabase
          .channel("dante_campaign_realtime")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "dante_campaign", filter: "id=eq.main" },
            (payload) => {
              if (!active) return;
              if (payload.new && typeof payload.new === "object" && "confirmed_cents" in payload.new) {
                const newRow = payload.new as { goal_cents?: number; confirmed_cents?: number };
                setCampaign({
                  goalCents: Number(newRow.goal_cents || campaignConfig.goalCentsDefault),
                  confirmedCents: Number(newRow.confirmed_cents || 0),
                });
                setStatus("Atualizado em tempo real");
                void fetchSupporters();
              }
            }
          )
          .subscribe()
      : null;

    // Polling fallback a cada 30 segundos
    const pollingInterval = window.setInterval(() => {
      void fetchCampaign();
      void fetchSupporters();
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(pollingInterval);
      if (supabase && channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const donationResult = new URLSearchParams(window.location.search).get(
        "donation"
      );
      if (donationResult === "success")
        setMercadoPagoStatus(
          "Retorno recebido. A confirmação financeira será refletida após o webhook."
        );
      if (donationResult === "pending")
        setMercadoPagoStatus(
          "Pagamento pendente. A confirmação será atualizada quando o Mercado Pago concluir a análise."
        );
      if (donationResult === "failure")
        setMercadoPagoStatus(
          "O pagamento não foi concluído. Você pode tentar novamente ou usar o Pix."
        );
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    const items = Array.from(
      timeline.querySelectorAll<HTMLElement>("[data-timeline-id]")
    );
    let frame = 0;
    const updateTimeline = () => {
      frame = 0;
      const rect = timeline.getBoundingClientRect();
      const travel = Math.max(1, rect.height + window.innerHeight * 0.35);
      const progress = Math.max(
        0,
        Math.min(1, (window.innerHeight * 0.78 - rect.top) / travel)
      );
      setTimelineProgress(progress);
      const focusLine = window.innerHeight * 0.42;
      const closest = items.reduce<{ id: string; distance: number } | null>(
        (current, item) => {
          const itemRect = item.getBoundingClientRect();
          const distance = Math.abs(
            itemRect.top + itemRect.height * 0.3 - focusLine
          );
          return !current || distance < current.distance
            ? { id: item.dataset.timelineId || "", distance }
            : current;
        },
        null
      );
      if (closest?.id) setActiveTimelineId(closest.id);
    };
    const requestUpdate = () => {
      if (!frame) frame = window.requestAnimationFrame(updateTimeline);
    };
    const observer = new IntersectionObserver(
      (entries) => {
        const entering = entries
          .filter((entry) => entry.isIntersecting)
          .map((entry) => (entry.target as HTMLElement).dataset.timelineId)
          .filter(Boolean) as string[];
        if (entering.length)
          setVisitedTimelineIds((current) =>
            Array.from(new Set([...current, ...entering]))
          );
      },
      { rootMargin: "-12% 0px -58% 0px", threshold: 0.1 }
    );
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

  const goalCents = campaign?.goalCents ?? campaignConfig.goalCentsDefault;
  const confirmedCents = campaign?.confirmedCents ?? 0;
  const remainingCents = Math.max(0, goalCents - confirmedCents);
  const percentage = Math.max(
    0,
    Math.min(100, goalCents ? (confirmedCents / goalCents) * 100 : 0)
  );
  const remainingText = campaign
    ? formatCents(remainingCents)
    : "valor atualizado";
  const shareText = useMemo(
    () =>
      "Ajude o Dante a continuar o tratamento. Qualquer ajuda ou compartilhamento faz diferença.",
    []
  );

  async function copyPix() {
    try {
      await navigator.clipboard.writeText(campaignConfig.pixKey);
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3500);
    } catch {
      setPixCopied(true);
    }
  }

  async function shareCampaign() {
    const data = {
      title: "Ajude o Dante",
      text: shareText,
      url: campaignConfig.siteUrl,
    };
    if (navigator.share) {
      try {
        await navigator.share(data);
        return;
      } catch {
        /* cancelado pelo usuário */
      }
    }
    await navigator.clipboard?.writeText(campaignConfig.siteUrl);
    alert("Link da campanha copiado para a área de transferência!");
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
        body: JSON.stringify({
          amount,
          publicName: publicNameConsent,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        checkoutUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.checkoutUrl)
        throw new Error(
          result.error || "Não foi possível iniciar o checkout."
        );
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setMercadoPagoStatus(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar o checkout agora."
      );
      setMercadoPagoLoading(false);
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedTimelineIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const nav = (href: string, label: string) => (
    <a href={href} onClick={() => setMenuOpen(false)}>
      {label}
    </a>
  );

  return (
    <main className="site-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <a className="brand" href="#top" aria-label="Ajude o Dante, voltar ao início">
            <span className="brand-mark" aria-hidden="true">🐾</span>
            <span className="brand-text">AJUDE<br />O DANTE</span>
          </a>
          <nav className={menuOpen ? "nav nav-open" : "nav"} aria-label="Navegação principal">
            {nav("#sobre", "Sobre o Dante")}
            {nav("#ajudar", "Como ajudar")}
            {nav("#atualizacoes", "Atualizações")}
            {nav("#transparencia", "Transparência")}
            {nav("#rifa", "Rifa da TV")}
            {nav("#perguntas", "Perguntas")}
          </nav>
          <a className="button button-primary" href="#doar">
            Quero ajudar
          </a>
          <button
            className="menu-button"
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? "×" : "☰"}
          </button>
        </div>
      </header>

      <div id="top" />

      {/* HERO */}
      <section className="hero container">
        <div className="hero-grid">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <p className="eyebrow">
              Ele ainda precisa de você <span aria-hidden="true">🐾</span>
            </p>
            <h1>
              Ajude o <span>Dante</span>
            </h1>
            <p className="hero-lead">
              Internado, em tratamento e lutando por uma nova chance de vida.
            </p>
            <div className="hero-actions">
              <a className="button button-primary" href="#doar">
                ♥ Quero ajudar o Dante
              </a>
              <button className="button button-secondary" onClick={shareCampaign}>
                ↗ Compartilhar campanha
              </button>
            </div>
          </motion.div>

          <motion.div
            className="hero-photo"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7 }}
          >
            <Image
              src="/images/Usar/Fotos/Dante 07.png"
              alt="Foto real do Dante descansando em uma manta"
              fill
              priority
              loading="eager"
              sizes="(max-width: 900px) 100vw, 48vw"
            />
          </motion.div>
        </div>

        <motion.div
          className="campaign-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.6 }}
        >
          <div className="campaign-card-head">
            <h2>Ajude o Dante a se recuperar</h2>
            <span className="campaign-status">
              {campaign ? `${Math.round(percentage)}%` : "Atualizando…"}
            </span>
          </div>
          <div
            className="progress-track"
            role="progressbar"
            aria-label="Progresso da arrecadação"
            aria-valuemin={0}
            aria-valuemax={goalCents / 100}
            aria-valuenow={campaign ? confirmedCents / 100 : 0}
          >
            <motion.div
              className="progress-fill"
              animate={{ width: `${campaign ? percentage : 0}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
          <p className="progress-note">{status}</p>
          <div className="campaign-metrics">
            <div className="metric">
              <span>Arrecadado</span>
              <strong>{campaign ? formatCents(confirmedCents) : "—"}</strong>
            </div>
            <div className="metric">
              <span>Meta</span>
              <strong>{formatCents(goalCents)}</strong>
            </div>
            <div className="metric">
              <span>Faltam</span>
              <strong>{campaign ? formatCents(remainingCents) : "Atualizando…"}</strong>
            </div>
          </div>
          <a className="button button-primary" href="#doar">
            ♥ Quero ajudar o Dante
          </a>
          <p className="secure-note">⌑ Doação segura e transparente</p>
        </motion.div>
      </section>

      {/* NOVA CHAMADA DE ATUALIZAÇÃO • HOJE */}
      <div className="container" style={{ marginTop: "-0.5rem", marginBottom: "2rem" }}>
        <a
          href="#atualizacao-recente"
          className="group block p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/80 via-slate-900/90 to-emerald-950/80 border border-emerald-500/40 hover:border-emerald-400/80 shadow-lg shadow-emerald-950/40 transition-all"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <span className="text-2xl sm:text-3xl p-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 shrink-0">
                🐾
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Nova Atualização • Hoje
                  </span>
                  <span className="text-xs text-slate-400">29 de Agosto</span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition-colors mt-0.5">
                  Dante está se recuperando 💚
                </h3>
                <p className="text-xs sm:text-sm text-slate-300">
                  Fomos visitá-lo hoje e a alta está prevista para segunda-feira.
                </p>
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
              <span>Ver atualização do Dante</span>
              <span>→</span>
            </div>
          </div>
        </a>
      </div>

      {/* SOBRE */}
      <section id="sobre" className="section container">
        <div className="two-column">
          <div className="soft-panel">
            <p className="section-kicker">Sobre o Dante</p>
            <h2>O que aconteceu?</h2>
            <p>
              Dante tem 7 meses e é nosso PET. Ele engoliu pano e outros
              materiais, e os exames mostraram corpos estranhos no estômago e no
              intestino.
            </p>
            <p>
              Uma linha está puxando e “sanfonando” o intestino, obstruindo a
              passagem. Por isso, ele está recebendo atendimento, exames e
              tratamento na Clínica Animal House.
            </p>
          </div>
          <div className="soft-panel">
            <p className="section-kicker">Cuidado em cada etapa</p>
            <h2>Como sua ajuda faz a diferença</h2>
            <div className="care-grid">
              {[
                ["🏥", "Internação", "Cuidados 24h e acompanhamento veterinário."],
                ["⌕", "Exames", "Diagnóstico e decisões mais seguras."],
                ["💊", "Medicamentos", "Tratamento conforme a orientação clínica."],
                ["🍲", "Alimentação", "Força para recuperação e bem-estar."],
                ["♥", "Pós-tratamento", "Recuperação com carinho e segurança."],
                ["↻", "Acompanhamento", "Novas consultas quando necessário."],
              ].map(([icon, title, text], index) => (
                <div key={index} className="care-card">
                  <span className="care-icon" aria-hidden="true">
                    {icon}
                  </span>
                  <div>
                    <strong>{title}</strong>
                    <p>{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ATUALIZAÇÕES / ESTADO ATUAL */}
      <section id="atualizacoes" className="section container">
        <div className="section-heading">
          <p className="section-kicker">Estado atual</p>
          <h2>Como ele está agora?</h2>
          <p className="section-intro">
            Acompanhe a atualização clínica mais recente confirmada pela equipe
            veterinária.
          </p>
        </div>
        <div className="status-grid">
          <div className="status-photo">
            <Image
              src="/images/Usar/Fotos/02.jpeg"
              alt="Dante durante visita de atualização após a cirurgia"
              fill
              sizes="(max-width: 900px) 100vw, 35vw"
            />
          </div>
          <div className="status-card">
            <div className="status-card-header">
              <h3>Animal House</h3>
              {currentStatusEvent.statusLabel && (
                <span className="status-tag status-tag-positive">
                  ● {currentStatusEvent.statusLabel}
                </span>
              )}
            </div>
            <p className="status-date">
              {currentStatusEvent.date.replace(/\/\d{4}$/, "")} ·{" "}
              {currentStatusEvent.time}
            </p>
            <h4>{currentStatusEvent.title}</h4>
            <p className="status-description">
              {currentStatusEvent.description}
            </p>
          </div>
        </div>
      </section>

      {/* SEÇÃO DA VISITA DE HOJE COM GALERIA DE FOTOS E VÍDEO */}
      <VisitUpdateSection />

      {/* LINHA DO TEMPO */}
      <section className="section container">
        <div className="section-heading">
          <p className="section-kicker">Acompanhe a história</p>
          <h2>Linha do tempo</h2>
          <p className="section-intro">
            Os principais momentos da história do Dante, em ordem cronológica.
          </p>
        </div>
        <div
          className="timeline-shell"
          ref={timelineRef}
          style={{ "--timeline-progress": timelineProgress } as CSSProperties}
        >
          <span className="timeline-track" aria-hidden="true" />
          <span className="timeline-progress" aria-hidden="true" />
          <div
            className="timeline"
            role="list"
            aria-label="Cronologia da história do Dante"
          >
            {timelineEvents.map((event, index) => {
              const isActive = activeTimelineId === event.id;
              const isVisited = visitedTimelineIds.includes(event.id);
              const isExpanded = expandedTimelineIds.includes(event.id);
              const hasLongText =
                event.description && event.description !== event.summary;

              return (
                <motion.article
                  className={`timeline-item${
                    isActive ? " timeline-item-active" : ""
                  }${isVisited ? " timeline-item-visited" : ""}${
                    event.type === "status" ? " timeline-item-status" : ""
                  }`}
                  key={event.id}
                  data-timeline-id={event.id}
                  role="listitem"
                  aria-current={isActive ? "step" : undefined}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.24 }}
                  transition={{ delay: index * 0.04, duration: 0.45 }}
                >
                  <span className="timeline-dot" aria-hidden="true" />
                  <div className="timeline-copy">
                    <div className="timeline-meta">
                      <span className="timeline-date">{event.date}</span>
                      <span className="timeline-time">{event.time}</span>
                    </div>
                    <h3>{event.title}</h3>
                    <p className={event.isCurrentStatus ? "timeline-current-summary" : undefined}>
                      {isExpanded || event.isCurrentStatus
                        ? event.description
                        : event.summary}
                    </p>
                    {hasLongText && !event.isCurrentStatus && (
                      <button
                        type="button"
                        className="timeline-more-btn"
                        onClick={() => toggleExpand(event.id)}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? "Mostrar menos ↑" : "Ler relato completo ↓"}
                      </button>
                    )}
                    {event.statusLabel && (
                      <span className="timeline-status-label">
                        ● {event.statusLabel}
                      </span>
                    )}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </div>
      </section>

      {/* FECHAMENTO DA TIMELINE - ALINHAMENTO CORRIGIDO (FOTO 1) */}
      <section className="section container">
        <div className="soft-panel timeline-closure">
          <div className="timeline-closure-header">
            <div className="timeline-closure-badge">
              <span className="timeline-closure-paw">🐾</span>
              <span className="section-kicker">A campanha continua</span>
            </div>
            <h2>Por que ainda precisamos de ajuda?</h2>
          </div>
          
          <div className="timeline-closure-copy">
            <p>
              Mesmo com todas as pessoas que já contribuíram e com a enorme
              ajuda que recebemos, ainda estamos longe de conseguir pagar
              todas as despesas do tratamento do Dante.
            </p>
            <p>
              O custo não envolve apenas o procedimento cirúrgico. Existem
              também os exames já realizados, internação 24h, medicamentos,
              acompanhamento veterinário, alimentação especial durante a
              recuperação e possíveis novos exames.
            </p>
            <p>
              A campanha existe para ajudar a custear todo o tratamento até
              ele voltar saudável para casa. Qualquer valor faz toda a
              diferença.
            </p>
          </div>

          <div className="timeline-closure-actions">
            <a className="button button-primary" href="#doar">
              ♥ Quero ajudar o Dante
            </a>
            <button className="button button-secondary" onClick={shareCampaign}>
              ↗ Espalhe a campanha
            </button>
          </div>
        </div>
      </section>

      {/* GALERIA & VÍDEO */}
      <section className="section container">
        <div className="section-heading">
          <p className="section-kicker">Registros reais</p>
          <h2>Fotos e vídeos</h2>
          <p className="section-intro">
            Acompanhe a rotina do Dante com as fotos e vídeos reais selecionados.
          </p>
        </div>
        <div className="media-grid">
          <div className="gallery">
            {campaignImages.map((image) => (
              <button
                key={image.src}
                onClick={() => setSelectedImage(image)}
                aria-label="Ampliar foto"
                className="gallery-item"
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  fill
                  sizes="(max-width: 560px) 50vw, 25vw"
                />
              </button>
            ))}
          </div>
          <div className="video-card">
            <video
              controls
              playsInline
              preload="metadata"
              poster="/images/Usar/Fotos/Dante 02.png"
            >
              <source
                src="/images/Usar/Video/levando o Dante para Clinica.mp4"
                type="video/mp4"
              />
              Seu navegador não suporta vídeo HTML5.
            </video>
            <div className="video-copy">
              <h3>Levar o Dante para a clínica</h3>
              <p>Vídeo real do atendimento e do cuidado com o Dante.</p>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selectedImage && (
          <motion.div
            className="lightbox"
            role="dialog"
            aria-modal="true"
            aria-label={selectedImage.alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
          >
            <div
              className="lightbox-inner"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                className="lightbox-close"
                onClick={() => setSelectedImage(null)}
                aria-label="Fechar imagem"
              >
                ×
              </button>
              <Image
                src={selectedImage.src}
                alt={selectedImage.alt}
                fill
                sizes="90vw"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GRATIDÃO */}
      <section id="ajudar" className="section container">
        <div className="section-heading">
          <p className="section-kicker">NOSSA GRATIDÃO</p>
          <h2>Quem está ajudando o Dante</h2>
          <p className="section-intro">
            Pessoas, profissionais e apoios que estão fazendo diferença na recuperação do Dante.
          </p>
        </div>

        <div className="supporters-grid">
          {(() => {
            const list: { name: string; note: string; variant: "special" | "clinic" | "default" }[] = [];
            const seenNames = new Set<string>();
            const initialNotesMap = new Map<string, string>();
            for (const [name, note] of initialSupporters) {
              initialNotesMap.set(name.trim().toLowerCase(), note);
            }

            const getVariant = (key: string): "special" | "clinic" | "default" => {
              if (key === "rosangela") return "special";
              if (key.includes("animal house")) return "clinic";
              return "default";
            };

            // 1. Apoiadores automáticos do banco
            for (const name of publicFinancialSupporters) {
              const clean = name.trim();
              const key = clean.toLowerCase();
              if (clean && !seenNames.has(key)) {
                seenNames.add(key);
                const note = initialNotesMap.get(key) || "Nosso agradecimento de coração.";
                list.push({ name: clean, note, variant: getVariant(key) });
              }
            }

            // 2. Apoiadores da lista base (deduplicados)
            for (const [name, note] of initialSupporters) {
              const key = name.trim().toLowerCase();
              if (!seenNames.has(key)) {
                seenNames.add(key);
                list.push({ name, note, variant: getVariant(key) });
              }
            }

            // 3. Ordenação fixa por prioridade:
            // 0: Rosangela (1º)
            // 1: Clínica Animal House (2º)
            // 100: Demais apoiadores (preserva ordem relativa estável)
            const getPriority = (name: string) => {
              const key = name.trim().toLowerCase();
              if (key === "rosangela") return 0;
              if (key.includes("animal house")) return 1;
              return 100;
            };

            const sortedList = [...list].sort((a, b) => getPriority(a.name) - getPriority(b.name));

            return sortedList.map((item, index) => {
              let cardClass = "supporter-card";
              if (item.variant === "special") {
                cardClass += " supporter-card-special";
              } else if (item.variant === "clinic") {
                cardClass += " supporter-card-clinic";
              }

              return (
                <motion.div
                  className={cardClass}
                  key={`supporter-${item.name}`}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4, scale: 1.01 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ delay: index * 0.03, duration: 0.4 }}
                >
                  <span className="supporter-icon" aria-hidden="true">
                    {item.variant === "clinic" ? "🏥" : "🐾"}
                  </span>
                  <div>
                    <strong>{item.name}</strong>
                    <small>{item.note}</small>
                  </div>
                </motion.div>
              );
            });
          })()}
        </div>

        <div className="soft-panel" style={{ marginTop: 24 }}>
          <p className="section-kicker">Não consegue doar?</p>
          <h2>Compartilhar já ajuda muito</h2>
          <p className="section-intro">
            Espalhe a campanha para que mais pessoas conheçam a história do
            Dante.
          </p>
          <button
            className="button button-primary"
            style={{ marginTop: 18 }}
            onClick={shareCampaign}
          >
            ↗ Compartilhar campanha
          </button>
        </div>
      </section>

      {/* TRANSPARÊNCIA E PAGAMENTO (PIX + MERCADO PAGO) */}
      <section id="transparencia" className="section container">
        <div className="two-column">
          {/* PAINEL DE TRANSPARÊNCIA (CENTRAL COM ACCORDION) */}
          <div className="soft-panel transparency-panel">
            <p className="section-kicker">Clareza sempre</p>
            <h2>Transparência</h2>
            <p className="transparency-intro">
              Queremos mostrar com clareza como cada ajuda está sendo utilizada.
              Os comprovantes e atualizações são organizados e publicados aqui
              com total transparência.
            </p>

            <div className="transparency-accordion">
              {/* ITEM 1: COMPROVANTES */}
              <div
                className={`transparency-accordion-item ${
                  openTransparencyItem === "documents"
                    ? "transparency-accordion-item-open"
                    : ""
                }`}
              >
                <button
                  type="button"
                  className="transparency-accordion-trigger"
                  aria-expanded={openTransparencyItem === "documents"}
                  aria-controls="transparency-content-documents"
                  id="transparency-trigger-documents"
                  onClick={() =>
                    setOpenTransparencyItem(
                      openTransparencyItem === "documents" ? null : "documents"
                    )
                  }
                >
                  <div className="transparency-trigger-left">
                    <span className="transparency-trigger-icon" aria-hidden="true">
                      📄
                    </span>
                    <div className="transparency-trigger-text">
                      <strong>Comprovantes e prestação de contas</strong>
                      <span className="transparency-trigger-badge">Em organização</span>
                    </div>
                  </div>
                  <span
                    className={`transparency-chevron ${
                      openTransparencyItem === "documents"
                        ? "transparency-chevron-open"
                        : ""
                    }`}
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {openTransparencyItem === "documents" && (
                    <motion.div
                      id="transparency-content-documents"
                      role="region"
                      aria-labelledby="transparency-trigger-documents"
                      className="transparency-accordion-body"
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="transparency-accordion-content">
                        <span
                          className="status-tag"
                          style={{
                            background: "var(--soft)",
                            color: "var(--orange-dark)",
                            marginBottom: 12,
                            display: "inline-block",
                          }}
                        >
                          Documentos sendo organizados
                        </span>
                        <p>
                          Estamos organizando os comprovantes, despesas e atualizações
                          financeiras do tratamento do Dante. À medida que forem
                          disponibilizados, eles serão publicados aqui para consulta.
                        </p>
                        <div className="transparency-documents-list" aria-hidden="true" />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ITEM 2: NOSSO COMPROMISSO */}
              <div
                className={`transparency-accordion-item ${
                  openTransparencyItem === "commitment"
                    ? "transparency-accordion-item-open"
                    : ""
                }`}
              >
                <button
                  type="button"
                  className="transparency-accordion-trigger"
                  aria-expanded={openTransparencyItem === "commitment"}
                  aria-controls="transparency-content-commitment"
                  id="transparency-trigger-commitment"
                  onClick={() =>
                    setOpenTransparencyItem(
                      openTransparencyItem === "commitment" ? null : "commitment"
                    )
                  }
                >
                  <div className="transparency-trigger-left">
                    <span className="transparency-trigger-icon" aria-hidden="true">
                      🐾
                    </span>
                    <div className="transparency-trigger-text">
                      <strong>Nosso compromisso</strong>
                      <span className="transparency-trigger-subtitle">
                        A ajuda não termina no Dante
                      </span>
                    </div>
                  </div>
                  <span
                    className={`transparency-chevron ${
                      openTransparencyItem === "commitment"
                        ? "transparency-chevron-open"
                        : ""
                    }`}
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {openTransparencyItem === "commitment" && (
                    <motion.div
                      id="transparency-content-commitment"
                      role="region"
                      aria-labelledby="transparency-trigger-commitment"
                      className="transparency-accordion-body"
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="transparency-accordion-content">
                        <div className="transparency-commitment-inner">
                          <h3>A ajuda não termina no Dante</h3>
                          <p>
                            Todo o valor arrecadado será destinado ao tratamento,
                            internação, medicamentos, exames, alimentação especial,
                            recuperação e acompanhamento do Dante.
                          </p>
                          <div className="transparency-commitment-highlight">
                            <p>
                              Após a conclusão do tratamento e a quitação de todas as
                              despesas relacionadas ao caso, se houver saldo
                              remanescente, nós nos comprometemos a destiná-lo
                              integralmente para ajudar outras famílias que estejam
                              enfrentando uma emergência veterinária.
                            </p>
                          </div>
                          <p className="transparency-commitment-quote">
                            “Assim como tantas pessoas estenderam a mão para nós quando
                            mais precisamos, queremos fazer essa ajuda continuar chegando a
                            quem precisar.”
                          </p>
                          <div className="transparency-commitment-note">
                            <span
                              className="transparency-commitment-note-bullet"
                              aria-hidden="true"
                            >
                              ●
                            </span>
                            <span>
                              A destinação de eventual saldo remanescente também será
                              informada aqui, mantendo a mesma transparência da
                              campanha.
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ITEM 3: VERIFICAÇÃO DO CASO */}
              <div
                className={`transparency-accordion-item ${
                  openTransparencyItem === "verification"
                    ? "transparency-accordion-item-open"
                    : ""
                }`}
              >
                <button
                  type="button"
                  className="transparency-accordion-trigger"
                  aria-expanded={openTransparencyItem === "verification"}
                  aria-controls="transparency-content-verification"
                  id="transparency-trigger-verification"
                  onClick={() =>
                    setOpenTransparencyItem(
                      openTransparencyItem === "verification"
                        ? null
                        : "verification"
                    )
                  }
                >
                  <div className="transparency-trigger-left">
                    <span className="transparency-trigger-icon" aria-hidden="true">
                      🏥
                    </span>
                    <div className="transparency-trigger-text">
                      <strong>Verificação do caso</strong>
                      <span className="transparency-trigger-subtitle">
                        Confirme diretamente com a Animal House
                      </span>
                    </div>
                  </div>
                  <span
                    className={`transparency-chevron ${
                      openTransparencyItem === "verification"
                        ? "transparency-chevron-open"
                        : ""
                    }`}
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width="18"
                      height="18"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {openTransparencyItem === "verification" && (
                    <motion.div
                      id="transparency-content-verification"
                      role="region"
                      aria-labelledby="transparency-trigger-verification"
                      className="transparency-accordion-body"
                      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      animate={reduceMotion ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0 }}
                      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div className="transparency-accordion-content">
                        <div className="clinic-verification-inner">
                          <h3>Quer confirmar as informações?</h3>
                          <p>
                            A Clínica Animal House autorizou o contato direto para quem
                            quiser confirmar informações sobre o caso e o tratamento do
                            Dante.
                          </p>
                          <a
                            href={contacts.animalHouse.getVerificationUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button button-secondary clinic-verification-btn"
                          >
                            <span>🏥</span> Confirmar com a Animal House
                          </a>
                          <small className="clinic-phone-note">
                            WhatsApp Oficial: {contacts.animalHouse.phone}
                          </small>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* PAINEL PIX DIRETO + MERCADO PAGO REDESENHADO */}
          <div id="doar" className="pix-box">
            <div className="pix-header">
              <p className="pix-label">PIX DIRETO</p>
              <span className="pix-availability">Disponível agora</span>
            </div>

            {/* QR CODE REAL ISOLADO E LIMPO */}
            <div className="pix-qr-clean-container">
              <div className="pix-qr-clean">
                <Image
                  src="/images/Usar/qr-pix.png"
                  alt="QR Code Pix direto para doação do Dante"
                  width={230}
                  height={230}
                  priority
                  unoptimized
                  className="pix-qr-img"
                />
              </div>
              <p className="pix-qr-instruction">
                Escaneie com o aplicativo do seu banco
              </p>
            </div>

            {/* CHAVE PIX CELULAR FORMATADA COM BOTÃO AO LADO (FOTO 2) */}
            <div className="pix-inline-card">
              <div className="pix-inline-header">
                <span className="pix-badge-celular">Chave Pix · Celular</span>
                {pixCopied && <span className="pix-copied-tag">Copiada ✓</span>}
              </div>
              <div className="pix-inline-row">
                <div className="pix-inline-number">
                  <strong>(14) 98802-5296</strong>
                </div>
                <button
                  type="button"
                  className={`pix-inline-btn ${pixCopied ? "pix-inline-btn-copied" : ""}`}
                  onClick={copyPix}
                  aria-label="Copiar chave Pix celular"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{pixCopied ? "Copiado" : "Copiar"}</span>
                </button>
              </div>
              <p className="pix-owner-inline">Titular: {campaignConfig.pixOwner}</p>
            </div>

            {/* DIVISOR ELEGANTE */}
            <div className="pix-mp-divider" aria-hidden="true" />

            {/* BLOCO MERCADO PAGO */}
            <div className="mp-checkout">
              <div className="mp-heading">
                <div>
                  <p className="pix-label">PAGUE PELO MERCADO PAGO</p>
                  <p className="mp-description">
                    Escolha um valor e continue para o checkout seguro.
                  </p>
                </div>
              </div>

              {/* BADGES DISCRETOS */}
              <div className="mp-methods-badges" aria-label="Formas aceitas">
                <span className="mp-badge">◈ Pix</span>
                <span className="mp-badge">▣ Cartão</span>
                <span className="mp-badge">≡ Boleto</span>
              </div>

              {/* PRESETS DE VALOR */}
              <div className="donation-preset-group">
                <span className="preset-label">Valores sugeridos:</span>
                <div className="preset-buttons">
                  {donationPresets.map((val) => (
                    <button
                      key={val}
                      type="button"
                      className={`preset-btn ${
                        donationAmount === val ? "preset-btn-active" : ""
                      }`}
                      onClick={() => setDonationAmount(val)}
                    >
                      R$ {val}
                    </button>
                  ))}
                </div>
              </div>

              {/* INPUT CUSTOMIZADO */}
              <div className="mp-row">
                <label htmlFor="donation-amount">Ou digite outro valor</label>
                <div className="mp-input-wrap">
                  <span>R$</span>
                  <input
                    id="donation-amount"
                    value={donationAmount}
                    onChange={(event) => setDonationAmount(event.target.value)}
                    inputMode="decimal"
                    aria-label="Valor da doação em reais"
                    placeholder="50"
                  />
                </div>
              </div>

              {/* OPÇÃO DE CONSENTIMENTO DE GRATIDÃO */}
              <div className="mp-consent-group">
                <label className="mp-consent-label" htmlFor="mp-consent">
                  <input
                    id="mp-consent"
                    type="checkbox"
                    checked={publicNameConsent}
                    onChange={(e) => setPublicNameConsent(e.target.checked)}
                    className="mp-consent-checkbox"
                  />
                  <span>Quero aparecer nos agradecimentos com meu primeiro nome</span>
                </label>
                <p className="mp-consent-note">
                  Se você marcar esta opção, mostraremos apenas seu primeiro nome na seção Gratidão.
                </p>
              </div>

              {/* BOTÃO PRINCIPAL COM ÍCONE DE CADEADO */}
              <button
                type="button"
                className="button button-mp"
                onClick={startMercadoPagoCheckout}
                disabled={mercadoPagoLoading}
              >
                <svg
                  className="mp-lock-svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                {mercadoPagoLoading
                  ? "Abrindo checkout…"
                  : "Continuar no Mercado Pago"}
              </button>

              <p className="mp-security-note">
                Checkout processado com segurança pelo Mercado Pago
              </p>

              {mercadoPagoStatus && (
                <p className="secure-note mp-status" aria-live="polite">
                  {mercadoPagoStatus}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* RIFA SOLIDÁRIA + FAQ */}
      <section className="section container">
        <div className="donate-grid">
          {/* RIFA DA TV */}
          <RaffleSection />

          {/* PERGUNTAS FREQUENTES (10 ITENS) */}
          <div id="perguntas" className="soft-panel faq-panel">
            <p className="section-kicker">Dúvidas</p>
            <h2>Perguntas frequentes</h2>
            <div className="faq-list">
              {faqItems.map((item, idx) => (
                <details key={item.question} className="faq-item">
                  <summary className="faq-summary">
                    <span className="faq-number">
                      {(idx + 1).toString().padStart(2, "0")}
                    </span>
                    <span className="faq-question-text">{item.question}</span>
                    <span className="faq-toggle-icon" aria-hidden="true">+</span>
                  </summary>
                  <p className="faq-answer-text">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL COM MAIOR RESPIRO E MARCA DE PEGADA NÍTIDA (FOTO 4) */}
      <section className="section container">
        <div className="final-cta">
          <div className="final-cta-watermark" aria-hidden="true">
            <span className="paw-1">🐾</span>
            <span className="paw-2">🐾</span>
            <span className="paw-3">🐾</span>
          </div>
          <div className="final-cta-content">
            <p className="section-kicker" style={{ color: "#ffc29d" }}>
              Toda ajuda conta
            </p>
            <h2>Ajude o Dante a continuar lutando.</h2>
            <p>
              Um gesto de apoio pode significar mais cuidado, mais tempo e uma nova
              chance de vida.
            </p>
            <div className="final-cta-btn-wrap">
              <a className="button button-primary" href="#doar">
                ♥ Quero ajudar o Dante
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER BONITINHO, LIMPO E FIXO NO FINAL (FOTO 3) */}
      <footer className="site-footer">
        <div className="container site-footer-inner">
          <div className="footer-brand">
            <span className="footer-paw" aria-hidden="true">🐾</span>
            <strong>Ajude o Dante</strong>
            <span className="footer-dot">·</span>
            <span>Campanha independente em Bauru/SP</span>
          </div>

          <div className="footer-links">
            <a
              href={contacts.lucas.getFloatingUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="footer-link"
            >
              Falar no WhatsApp
            </a>
            <span className="footer-dot">·</span>
            <button
              type="button"
              className="footer-link footer-btn"
              onClick={shareCampaign}
            >
              Compartilhar campanha
            </button>
            <span className="footer-dot">·</span>
            <a href="#top" className="footer-link">
              Voltar ao início ↑
            </a>
          </div>

          <p className="footer-note">
            Todos os recursos são destinados ao tratamento e recuperação do Dante.
          </p>
        </div>
      </footer>

      {/* BOTÃO FLUTUANTE WHATSAPP */}
      <FloatingWhatsApp />

      {/* BARRA FIXA MOBILE */}
      <div className="mobile-cta">
        <div>
          <small>Campanha do Dante</small>
          <strong>Faltam {remainingText}</strong>
        </div>
        <a className="button button-primary" href="#doar">
          AJUDAR
        </a>
      </div>
    </main>
  );
}
