"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  TimelineEventRecord,
  TimelineMediaRecord,
  UpsertTimelineEventInput,
  UpsertMediaInput,
  upsertTimelineEventAction,
  deleteTimelineEventAction,
  setCurrentStatusAction,
  togglePublishTimelineEventAction,
  reorderTimelineEventAction,
  upsertMediaAction,
  deleteMediaAction,
} from "../timeline-transparencia/actions";

interface UpdatesManagerProps {
  initialEvents: TimelineEventRecord[];
}

const categoryLabels: Record<string, { label: string; icon: string; color: string }> = {
  update:    { label: "Atualização", icon: "📢", color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  medical:   { label: "Boletim Médico", icon: "🩺", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  status:    { label: "Status", icon: "🐾", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  campaign:  { label: "Campanha", icon: "🎯", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  milestone: { label: "Marco", icon: "💡", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
};

function makeDefaultForm(): UpsertTimelineEventInput {
  return {
    event_date: new Date().toISOString().split("T")[0],
    display_date: "",
    display_time: "",
    location: "",
    title: "",
    summary: "",
    description: "",
    status_label: "",
    event_type: "update",
    is_current_status: false,
    is_published: true,
    sort_order: 0,
  };
}

export default function UpdatesManager({ initialEvents }: UpdatesManagerProps) {
  const [events, setEvents] = useState<TimelineEventRecord[]>(initialEvents);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEventRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [formData, setFormData] = useState<UpsertTimelineEventInput>(makeDefaultForm());

  // Media modal
  const [mediaModalEventId, setMediaModalEventId] = useState<string | null>(null);
  const [mediaForm, setMediaForm] = useState<UpsertMediaInput>({
    event_id: "",
    media_type: "image",
    url: "",
    alt_text: "",
    caption: "",
    poster_url: "",
    is_primary: false,
    sort_order: 0,
  });
  const [editingMediaId, setEditingMediaId] = useState<string | null>(null);

  function notify(msg: string, isError = false) {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 6000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  }

  // ── Event modal open ──────────────────────────────────
  function openCreate() {
    setEditingEvent(null);
    setShowAdvanced(false);
    setFormData({
      ...makeDefaultForm(),
      sort_order: (events[0]?.sort_order ?? 0) + 1,
    });
    setModalOpen(true);
  }

  function openEdit(ev: TimelineEventRecord) {
    setEditingEvent(ev);
    setShowAdvanced(false);
    setFormData({
      id: ev.id,
      slug: ev.slug,
      event_date: ev.event_date,
      display_date: ev.display_date,
      display_time: ev.display_time || "",
      location: ev.location || "",
      title: ev.title,
      summary: ev.summary || "",
      description: ev.description,
      status_label: ev.status_label || "",
      event_type: ev.event_type,
      is_current_status: ev.is_current_status,
      is_published: ev.is_published,
      sort_order: ev.sort_order,
    });
    setModalOpen(true);
  }

  // ── Submit event ──────────────────────────────────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.title.trim() || !formData.event_date) {
      notify("Título e Data são obrigatórios.", true);
      return;
    }
    startTransition(async () => {
      const res = await upsertTimelineEventAction(formData);
      if (res.success && res.event) {
        notify(editingEvent ? "Atualização salva!" : "Nova atualização publicada!");
        setModalOpen(false);
        setEvents((prev) => {
          const updated = res.event!;
          let next = [...prev];
          if (updated.is_current_status) {
            next = next.map((ev) => ({ ...ev, is_current_status: false }));
          }
          const idx = next.findIndex((ev) => ev.id === updated.id);
          if (idx >= 0) {
            next[idx] = { ...next[idx], ...updated };
          } else {
            next.unshift(updated);
          }
          return next;
        });
      } else {
        notify(res.error || "Erro ao salvar.", true);
      }
    });
  }

  // ── Set current status ────────────────────────────────
  function handleSetCurrent(id: string) {
    startTransition(async () => {
      const res = await setCurrentStatusAction(id);
      if (res.success) {
        notify("Estado atual do Dante atualizado!");
        setEvents((prev) =>
          prev.map((ev) => ({ ...ev, is_current_status: ev.id === id }))
        );
      } else {
        notify(res.error || "Erro.", true);
      }
    });
  }

  // ── Toggle publish ────────────────────────────────────
  function handleTogglePublish(id: string, current: boolean) {
    startTransition(async () => {
      const res = await togglePublishTimelineEventAction(id, !current);
      if (res.success) {
        notify(!current ? "Atualização publicada!" : "Atualização ocultada.");
        setEvents((prev) =>
          prev.map((ev) => (ev.id === id ? { ...ev, is_published: !current } : ev))
        );
      } else {
        notify(res.error || "Erro.", true);
      }
    });
  }

  // ── Delete ────────────────────────────────────────────
  function handleDelete(id: string) {
    startTransition(async () => {
      const res = await deleteTimelineEventAction(id);
      if (res.success) {
        notify("Atualização excluída.");
        setEvents((prev) => prev.filter((ev) => ev.id !== id));
        setDeleteConfirmId(null);
      } else {
        notify(res.error || "Erro ao excluir.", true);
      }
    });
  }

  // ── Reorder ───────────────────────────────────────────
  function handleReorder(id: string, dir: "up" | "down") {
    startTransition(async () => {
      const res = await reorderTimelineEventAction(id, dir);
      if (res.success) {
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === id
              ? { ...ev, sort_order: dir === "up" ? ev.sort_order + 1 : ev.sort_order - 1 }
              : ev
          )
        );
      } else {
        notify(res.error || "Erro ao reordenar.", true);
      }
    });
  }

  // ── Media modal ───────────────────────────────────────
  function openMediaModal(eventId: string, media?: TimelineMediaRecord) {
    setMediaModalEventId(eventId);
    setEditingMediaId(media?.id ?? null);
    setMediaForm({
      event_id: eventId,
      media_type: media?.media_type ?? "image",
      url: media?.url ?? "",
      alt_text: media?.alt_text ?? "",
      caption: media?.caption ?? "",
      poster_url: media?.poster_url ?? "",
      is_primary: media?.is_primary ?? false,
      sort_order: media?.sort_order ?? 0,
    });
  }

  function handleMediaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mediaForm.url.trim()) {
      notify("URL da mídia é obrigatória.", true);
      return;
    }
    startTransition(async () => {
      const input: UpsertMediaInput = { ...mediaForm };
      if (editingMediaId) input.id = editingMediaId;
      const res = await upsertMediaAction(input);
      if (res.success && res.media) {
        notify("Mídia salva!");
        setMediaModalEventId(null);
        setEvents((prev) =>
          prev.map((ev) => {
            if (ev.id !== mediaForm.event_id) return ev;
            const existingMedia = ev.media || [];
            let newMedia: TimelineMediaRecord[];
            if (res.media!.is_primary) {
              newMedia = existingMedia.map((m) => ({ ...m, is_primary: false }));
            } else {
              newMedia = [...existingMedia];
            }
            const idx = newMedia.findIndex((m) => m.id === res.media!.id);
            if (idx >= 0) {
              newMedia[idx] = res.media!;
            } else {
              newMedia.push(res.media!);
            }
            return { ...ev, media: newMedia };
          })
        );
      } else {
        notify(res.error || "Erro ao salvar mídia.", true);
      }
    });
  }

  function handleDeleteMedia(mediaId: string, eventId: string) {
    startTransition(async () => {
      const res = await deleteMediaAction(mediaId);
      if (res.success) {
        notify("Mídia removida.");
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === eventId
              ? { ...ev, media: (ev.media || []).filter((m) => m.id !== mediaId) }
              : ev
          )
        );
      } else {
        notify(res.error || "Erro ao remover mídia.", true);
      }
    });
  }

  const currentStatusEvent = events.find((ev) => ev.is_current_status);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between">
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-xs underline ml-4">Fechar</button>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-xs underline ml-4">Fechar</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Atualizações do Dante</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {events.length}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie as atualizações da recuperação do Dante exibidas na página pública.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={isPending}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center gap-2 shrink-0"
        >
          + Nova Atualização
        </button>
      </div>

      {/* Estado Atual Banner */}
      {currentStatusEvent && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/30 border border-emerald-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ATUALIZAÇÃO ATUAL — EXIBIDA NO TOPO DO SITE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {currentStatusEvent.display_date} {currentStatusEvent.display_time && `• ${currentStatusEvent.display_time}`}
            </span>
          </div>
          <h2 className="text-base font-bold text-white">{currentStatusEvent.title}</h2>
          {currentStatusEvent.status_label && (
            <p className="text-xs font-semibold text-emerald-400">
              Etiqueta: &ldquo;{currentStatusEvent.status_label}&rdquo;
            </p>
          )}
          <p className="text-xs text-slate-300 line-clamp-2">
            {currentStatusEvent.summary || currentStatusEvent.description}
          </p>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        {events.map((event) => {
          const catMeta = categoryLabels[event.event_type] || categoryLabels.update;
          const images = (event.media || []).filter((m) => m.media_type === "image").sort((a, b) => a.sort_order - b.sort_order);
          const videos = (event.media || []).filter((m) => m.media_type === "video").sort((a, b) => a.sort_order - b.sort_order);
          const primaryImg = images.find((m) => m.is_primary) || images[0];

          return (
            <div
              key={event.id}
              className={`p-5 rounded-2xl border transition space-y-3 ${
                event.is_current_status
                  ? "border-emerald-500/40 ring-1 ring-emerald-500/20 bg-emerald-950/10"
                  : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
              }`}
            >
              {/* Card header row */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${catMeta.color}`}>
                    {catMeta.icon} {catMeta.label}
                  </span>
                  {event.is_current_status && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ⭐ Atual
                    </span>
                  )}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                    event.is_published
                      ? "bg-teal-500/10 text-teal-300 border-teal-500/30"
                      : "bg-slate-800 text-slate-400 border-slate-700"
                  }`}>
                    {event.is_published ? "✓ Publicado" : "Rascunho / Oculto"}
                  </span>
                  {(event.media?.length ?? 0) > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                      🖼 {event.media!.length} mídia{event.media!.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 font-mono">
                  {event.display_date}{event.display_time && ` • ${event.display_time}`}
                  {event.location && <span className="ml-1 text-slate-500">· {event.location}</span>}
                </div>
              </div>

              {/* Title + status_label + summary */}
              <div>
                <h3 className="text-sm md:text-base font-bold text-white">{event.title}</h3>
                {event.status_label && (
                  <span className="inline-block mt-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {event.status_label}
                  </span>
                )}
                {event.summary && (
                  <p className="text-xs text-slate-300 mt-1 line-clamp-2">{event.summary}</p>
                )}
              </div>

              {/* Media preview strip */}
              {(images.length > 0 || videos.length > 0) && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {primaryImg && (
                    <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-emerald-500/40 ring-1 ring-emerald-500/20">
                      <Image src={primaryImg.url} alt={primaryImg.alt_text} fill sizes="64px" className="object-cover" />
                      <span className="absolute bottom-0 left-0 right-0 text-[8px] text-center text-emerald-300 bg-black/60 leading-4">Principal</span>
                    </div>
                  )}
                  {images.filter((m) => !m.is_primary).map((img) => (
                    <div key={img.id} className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-white/10">
                      <Image src={img.url} alt={img.alt_text} fill sizes="48px" className="object-cover" />
                    </div>
                  ))}
                  {videos.map((vid) => (
                    <div key={vid.id} className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 border border-sky-500/30 flex items-center justify-center bg-black/60">
                      {vid.poster_url ? (
                        <Image src={vid.poster_url} alt="poster" fill sizes="64px" className="object-cover opacity-50" />
                      ) : null}
                      <span className="z-10 text-lg">▶</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {!event.is_current_status && (
                    <button
                      onClick={() => handleSetCurrent(event.id)}
                      disabled={isPending}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition disabled:opacity-50"
                    >
                      ⭐ Definir como Atual
                    </button>
                  )}
                  <button
                    onClick={() => handleTogglePublish(event.id, event.is_published)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                  >
                    {event.is_published ? "Ocultar" : "Publicar"}
                  </button>
                  <button
                    onClick={() => handleReorder(event.id, "up")}
                    disabled={isPending}
                    title="Mover para cima (aumentar prioridade)"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs border border-slate-700 transition"
                  >↑</button>
                  <button
                    onClick={() => handleReorder(event.id, "down")}
                    disabled={isPending}
                    title="Mover para baixo (diminuir prioridade)"
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs border border-slate-700 transition"
                  >↓</button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openMediaModal(event.id)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 text-xs font-semibold border border-violet-500/30 transition"
                  >
                    🖼 Mídias
                  </button>
                  <button
                    onClick={() => openEdit(event)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 text-xs font-semibold border border-sky-500/30 transition"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => setDeleteConfirmId(event.id)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 transition"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {/* Inline media list */}
              {mediaModalEventId === event.id && (
                <div className="mt-3 p-4 rounded-2xl bg-slate-950/80 border border-violet-500/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-white">Fotos e Vídeos</h4>
                    <button onClick={() => setMediaModalEventId(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
                  </div>

                  {/* Existing media */}
                  {(event.media || []).length > 0 && (
                    <div className="space-y-2">
                      {(event.media || []).sort((a, b) => a.sort_order - b.sort_order).map((m) => (
                        <div key={m.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                          <div className="relative w-12 h-10 rounded-lg overflow-hidden shrink-0 bg-black/60 flex items-center justify-center">
                            {m.media_type === "image" ? (
                              <Image src={m.url} alt={m.alt_text} fill sizes="48px" className="object-cover" />
                            ) : (
                              <span className="text-base">▶</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-white truncate">{m.url.split("/").pop()}</p>
                            <p className="text-[10px] text-slate-400">
                              {m.media_type === "image" ? "Foto" : "Vídeo"}
                              {m.is_primary && " · Principal"}
                              {m.alt_text && ` · ${m.alt_text}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => openMediaModal(event.id, m)}
                              className="px-2 py-1 rounded-lg bg-sky-500/10 text-sky-300 text-[10px] border border-sky-500/30"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDeleteMedia(m.id, event.id)}
                              disabled={isPending}
                              className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-300 text-[10px] border border-rose-500/30"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Media form */}
                  <form onSubmit={handleMediaSubmit} className="space-y-3 pt-2 border-t border-slate-800">
                    <h5 className="text-xs font-bold text-slate-200">
                      {editingMediaId ? "Editar mídia" : "Adicionar mídia"}
                    </h5>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Tipo</label>
                        <select
                          value={mediaForm.media_type}
                          onChange={(e) => setMediaForm({ ...mediaForm, media_type: e.target.value as "image" | "video" })}
                          className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-slate-700 text-xs text-white"
                        >
                          <option value="image">📷 Foto</option>
                          <option value="video">🎥 Vídeo</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Ordem</label>
                        <input
                          type="number"
                          value={mediaForm.sort_order}
                          onChange={(e) => setMediaForm({ ...mediaForm, sort_order: Number(e.target.value) })}
                          className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-slate-700 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Caminho / URL *</label>
                      <input
                        type="text"
                        required
                        placeholder="/images/Usar/Fotos/02.jpeg"
                        value={mediaForm.url}
                        onChange={(e) => setMediaForm({ ...mediaForm, url: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500"
                      />
                    </div>
                    {mediaForm.url && mediaForm.media_type === "image" && (
                      <div className="relative w-24 h-16 rounded-lg overflow-hidden border border-white/10">
                        <Image src={mediaForm.url} alt="preview" fill sizes="96px" className="object-cover" />
                      </div>
                    )}
                    {mediaForm.media_type === "video" && (
                      <div>
                        <label className="block text-[10px] font-semibold text-slate-400 mb-1">Poster (imagem de capa)</label>
                        <input
                          type="text"
                          placeholder="/images/Usar/Fotos/02.jpeg"
                          value={mediaForm.poster_url || ""}
                          onChange={(e) => setMediaForm({ ...mediaForm, poster_url: e.target.value })}
                          className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500"
                        />
                        {mediaForm.url && (
                          <video src={mediaForm.url} poster={mediaForm.poster_url || undefined} controls playsInline preload="metadata" className="mt-2 w-full max-h-28 rounded-lg bg-black" />
                        )}
                      </div>
                    )}
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Texto alternativo</label>
                      <input
                        type="text"
                        placeholder="Descrição da imagem para acessibilidade"
                        value={mediaForm.alt_text}
                        onChange={(e) => setMediaForm({ ...mediaForm, alt_text: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Legenda (opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex.: Carinho e afeto"
                        value={mediaForm.caption || ""}
                        onChange={(e) => setMediaForm({ ...mediaForm, caption: e.target.value })}
                        className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500"
                      />
                    </div>
                    {mediaForm.media_type === "image" && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mediaForm.is_primary}
                          onChange={(e) => setMediaForm({ ...mediaForm, is_primary: e.target.checked })}
                          className="rounded border-slate-700 bg-black/40 text-emerald-500"
                        />
                        <span className="text-xs text-white">Definir como foto principal</span>
                      </label>
                    )}
                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold text-xs disabled:opacity-50"
                      >
                        {isPending ? "Salvando..." : editingMediaId ? "Salvar Alterações" : "Adicionar Mídia"}
                      </button>
                      {editingMediaId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMediaId(null);
                            setMediaForm({ ...mediaForm, id: undefined, url: "", alt_text: "", caption: "", poster_url: "", is_primary: false });
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
                        >
                          Nova mídia
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              )}

              {/* Delete confirm */}
              {deleteConfirmId === event.id && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2">
                  <p className="text-xs font-bold text-rose-200">
                    Excluir permanentemente &ldquo;{event.title}&rdquo;?
                    {event.is_current_status && (
                      <span className="block text-rose-400 mt-1">
                        ⚠️ Esta é a atualização atual. Defina outra como atual antes de excluir.
                      </span>
                    )}
                  </p>
                  {!event.is_current_status && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(event.id)}
                        disabled={isPending}
                        className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                      >
                        Sim, Excluir
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                  {event.is_current_status && (
                    <button onClick={() => setDeleteConfirmId(null)} className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs">Cancelar</button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {editingEvent ? "Editar Atualização" : "Nova Atualização"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Preencha os dados da atualização do Dante.
                </p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-white text-lg p-2 rounded-xl bg-slate-800/80">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* ── INFORMAÇÕES PRINCIPAIS ── */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">Informações Principais</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Data da atualização *</label>
                    <input
                      type="date"
                      required
                      value={formData.event_date}
                      onChange={(e) => setFormData({ ...formData, event_date: e.target.value, display_date: "" })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Momento / Horário</label>
                    <input
                      type="text"
                      placeholder="Ex.: 16h26 ou Hoje"
                      value={formData.display_time}
                      onChange={(e) => setFormData({ ...formData, display_time: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Local</label>
                    <input
                      type="text"
                      placeholder="Ex.: Clínica Animal House"
                      value={formData.location || ""}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Título *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex.: Fomos visitar o Dante 💚"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Resumo</label>
                  <input
                    type="text"
                    placeholder="Uma linha resumindo a novidade…"
                    value={formData.summary || ""}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* ── CONTEÚDO ── */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">Conteúdo</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Relato completo *</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="Descreva o que aconteceu em detalhes. Separe parágrafos com linha em branco."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* ── DESTAQUE ── */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">Destaque</p>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Etiqueta em destaque (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex.: Recuperação · Alta prevista para segunda-feira"
                    value={formData.status_label || ""}
                    onChange={(e) => setFormData({ ...formData, status_label: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Texto curto exibido junto da atualização. Ex.: Recuperação • Alta prevista para segunda-feira.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-slate-800 space-y-3 mt-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_current_status}
                      onChange={(e) => setFormData({ ...formData, is_current_status: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 bg-black/40 text-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">⭐ Definir como atualização atual</span>
                      <span className="text-[11px] text-slate-400">Este evento ficará em destaque no topo da página. Apenas atualizações publicadas podem ser o atual.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* ── PUBLICAÇÃO ── */}
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-3">Publicação</p>
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-slate-800">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.is_published}
                      onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                      className="mt-0.5 rounded border-slate-700 bg-black/40 text-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">✓ Publicado no site</span>
                      <span className="text-[11px] text-slate-400">Se desmarcado, fica visível apenas no painel ADM (rascunho).</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* ── OPÇÕES AVANÇADAS ── */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-xs text-slate-400 hover:text-slate-300 underline"
                >
                  {showAdvanced ? "▲ Ocultar opções avançadas" : "▼ Opções avançadas"}
                </button>

                {showAdvanced && (
                  <div className="mt-3 space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-slate-800">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Categoria interna
                        </label>
                        <select
                          value={formData.event_type}
                          onChange={(e) => setFormData({ ...formData, event_type: e.target.value as "update" | "medical" | "status" | "campaign" | "milestone" })}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white"
                        >
                          <option value="update">📢 Atualização / Relato</option>
                          <option value="medical">🩺 Boletim Médico / Laudo</option>
                          <option value="status">🐾 Status Geral</option>
                          <option value="campaign">🎯 Campanha / Apoio</option>
                          <option value="milestone">💡 Marco Importante</option>
                        </select>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Usada apenas para organização visual. Não altera o conteúdo.
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">Ordem</label>
                        <input
                          type="number"
                          value={formData.sort_order}
                          onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                          className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Personalizar texto da data</label>
                      <input
                        type="text"
                        placeholder={`Automático: ${formData.event_date ? new Date(formData.event_date + "T12:00:00").toLocaleDateString("pt-BR") : "dd/mm/aaaa"}`}
                        value={formData.display_date}
                        onChange={(e) => setFormData({ ...formData, display_date: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500"
                      />
                      <p className="text-[10px] text-slate-500 mt-1">Deixe vazio para gerar automaticamente a partir da data.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">Slug</label>
                      <input
                        type="text"
                        placeholder="gerado-automaticamente"
                        value={formData.slug || ""}
                        onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : editingEvent ? "Salvar Alterações" : "Criar Atualização"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
