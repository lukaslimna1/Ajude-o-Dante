"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { danteLatestVisit } from "@/data/campaign-content";
import type { TimelineEvent } from "@/data/dante-timeline";

export interface TimelineMediaItem {
  id: string;
  media_type: "image" | "video";
  url: string;
  alt_text: string;
  caption: string | null;
  poster_url: string | null;
  is_primary: boolean;
  sort_order: number;
}

interface VisitUpdateSectionProps {
  /** Evento com is_current_status=true vindo do Supabase (opcional). Se fornecido, substitui o texto hardcoded. */
  currentEvent?: TimelineEvent | null;
  /** Mídias associadas ao evento atual vindas do Supabase (opcional). Se fornecido, substitui as mídias hardcoded. */
  media?: TimelineMediaItem[] | null;
}

export default function VisitUpdateSection({ currentEvent, media }: VisitUpdateSectionProps = {}) {
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

  // Mídias dinâmicas ou fallback para danteLatestVisit
  const dynamicPhotos = (media || [])
    .filter((m) => m.media_type === "image")
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((m, idx) => ({
      id: m.id,
      src: m.url,
      alt: m.alt_text || "Dante durante atualização",
      label: m.caption || `Foto ${idx + 1}`,
    }));

  const dynamicVideoItem = (media || []).find((m) => m.media_type === "video");
  const dynamicVideo = dynamicVideoItem
    ? {
        src: dynamicVideoItem.url,
        poster: dynamicVideoItem.poster_url || "/images/Usar/Fotos/02.jpeg",
        description:
          dynamicVideoItem.caption ||
          dynamicVideoItem.alt_text ||
          "Registro real do Dante recebendo cuidados e carinho na clínica.",
      }
    : danteLatestVisit.video;

  const photos = dynamicPhotos.length > 0 ? dynamicPhotos : danteLatestVisit.photos;
  const currentPhoto = photos[Math.min(activePhotoIndex, photos.length - 1)] || photos[0];
  const video = dynamicVideo;

  // Texto dinâmico: usa o evento do Supabase quando disponível, senão usa dados hardcoded
  const displayTitle = currentEvent?.title ?? danteLatestVisit.title;
  const displaySubheading = currentEvent?.summary ?? danteLatestVisit.subheading;
  const displayParagraphs: string[] = currentEvent?.description
    ? currentEvent.description.split("\n\n").map((p) => p.trim()).filter(Boolean)
    : danteLatestVisit.paragraphs;
  const displayBadge = currentEvent?.statusLabel ?? danteLatestVisit.badge;
  const displayDate = currentEvent?.date
    ? currentEvent.date.replace(/\/\d{4}$/, "")
    : "29 de Agosto";
  const displayLocation = currentEvent?.location || "Clínica Animal House";

  return (
    <section id="atualizacoes" className="section container">
      <div id="atualizacao-recente" />
      {/* UPDATE CONTAINER CARD */}
      <div className="soft-panel relative overflow-hidden border border-emerald-500/30 bg-gradient-to-b from-slate-900/90 to-slate-950/95 shadow-2xl rounded-3xl p-5 sm:p-8 md:p-10">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {displayBadge}
            </span>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {displayDate} · {displayLocation}
          </span>
        </div>

        {/* Title & Introduction */}
        <div className="max-w-3xl mb-8">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
            {displayTitle}
          </h2>
          <p className="text-sm sm:text-base text-emerald-300/90 font-medium mt-2">
            {displaySubheading}
          </p>
        </div>

        {/* MEDIA GRID: PHOTO GALLERY + VIDEO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start mb-8">
          {/* LEFT: INTERACTIVE PHOTO GALLERY (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            {/* Main Active Photo Frame */}
            {currentPhoto && (
              <div
                onClick={() => setLightboxImage(currentPhoto)}
                className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black/80 border border-white/15 cursor-pointer group shadow-xl"
              >
                <Image
                  src={currentPhoto.src}
                  alt={currentPhoto.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-contain sm:object-cover group-hover:scale-105 transition-transform duration-500"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-md">
                    🔍 Clique para ampliar foto
                  </span>
                </div>
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-medium text-slate-200">
                  {currentPhoto.label} ({activePhotoIndex + 1}/{photos.length})
                </div>
              </div>
            )}

            {/* Thumbnails Row */}
            {photos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-thin">
                {photos.map((photo, idx) => (
                  <button
                    key={photo.id || idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      activePhotoIndex === idx
                        ? "border-emerald-400 shadow-lg shadow-emerald-500/20 scale-105"
                        : "border-white/10 opacity-70 hover:opacity-100 hover:border-white/30"
                    }`}
                    aria-label={`Ver foto ${photo.label}`}
                  >
                    <Image
                      src={photo.src}
                      alt={photo.alt}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: HTML5 VIDEO PLAYER (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            <div className="relative w-full rounded-2xl overflow-hidden bg-black/80 border border-white/15 shadow-xl">
              <div className="p-3 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <span>🎥</span> Vídeo da Visita
                </span>
                <span className="text-[10px] text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  REGISTRO REAL
                </span>
              </div>
              <div className="aspect-[9/16] sm:aspect-video lg:aspect-[9/14] max-h-[460px] w-full flex items-center justify-center bg-black">
                <video
                  controls
                  playsInline
                  preload="metadata"
                  poster={video.poster}
                  className="w-full h-full object-contain"
                >
                  <source src={video.src} type="video/mp4" />
                  Seu navegador não suporta reprodução de vídeo HTML5.
                </video>
              </div>
            </div>
            {video.description && (
              <p className="text-xs text-slate-400 leading-relaxed px-1">
                {video.description}
              </p>
            )}
          </div>
        </div>

        {/* TEXT CONTENT / REPORT */}
        <div className="space-y-4 max-w-4xl text-slate-300 text-sm sm:text-base leading-relaxed mb-8 pt-4 border-t border-white/10">
          {displayParagraphs.map((par, i) => (
            <p key={i}>{par}</p>
          ))}
        </div>

        {/* CALL TO ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-white/10">
          <a href="#doar" className="button button-primary" style={{ padding: "0.75rem 1.5rem" }}>
            ♥ Ajudar o Dante (Pix / Cartão)
          </a>
          <Link
            href="/acao-entre-amigos"
            className="button button-secondary"
            style={{ padding: "0.75rem 1.5rem" }}
          >
            🎟️ Conhecer a Rifa da TV (R$ 15)
          </Link>
          <a
            href="#transparencia"
            className="button button-secondary"
            style={{ padding: "0.75rem 1.5rem" }}
          >
            📋 Ver Transparência
          </a>
        </div>
      </div>

      {/* LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            className="lightbox fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label={lightboxImage.alt}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setLightboxImage(null)}
          >
            <div
              className="lightbox-inner max-w-4xl w-full max-h-[85vh] relative flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative w-full aspect-[4/3] max-h-[75vh]">
                <Image
                  src={lightboxImage.src}
                  alt={lightboxImage.alt}
                  fill
                  sizes="100vw"
                  className="object-contain"
                />
              </div>
              <p className="text-white text-xs sm:text-sm mt-3 text-center bg-black/60 px-4 py-2 rounded-xl backdrop-blur-md">
                {lightboxImage.alt}
              </p>
              <button
                type="button"
                className="lightbox-close absolute -top-10 right-0 text-white text-2xl font-bold bg-white/10 hover:bg-white/20 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                onClick={() => setLightboxImage(null)}
                aria-label="Fechar ampliação"
              >
                ×
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
