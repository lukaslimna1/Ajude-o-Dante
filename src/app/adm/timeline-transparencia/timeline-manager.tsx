"use client";

import { useState, useTransition } from "react";
import {
  TimelineEventRecord,
  TimelineEventType,
  UpsertTimelineEventInput,
  upsertTimelineEventAction,
  deleteTimelineEventAction,
  setCurrentStatusAction,
  togglePublishTimelineEventAction,
} from "./actions";

interface TimelineManagerProps {
  initialEvents: TimelineEventRecord[];
}

const typeLabels: Record<TimelineEventType, { label: string; icon: string; color: string }> = {
  update: { label: "Atualização", icon: "📢", color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
  medical: { label: "Boletim Médico", icon: "🩺", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  status: { label: "Status Geral", icon: "🐾", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  campaign: { label: "Campanha", icon: "🎯", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  milestone: { label: "Marco", icon: "💡", color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
};

export default function TimelineManager({ initialEvents }: TimelineManagerProps) {
  const [events, setEvents] = useState<TimelineEventRecord[]>(initialEvents);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TimelineEventRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<UpsertTimelineEventInput>({
    event_date: new Date().toISOString().split("T")[0],
    display_date: "",
    display_time: "",
    title: "",
    summary: "",
    description: "",
    status_label: "",
    event_type: "update",
    is_current_status: false,
    is_published: true,
    sort_order: 0,
  });

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 5000);
    } else {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setFormData({
      event_date: new Date().toISOString().split("T")[0],
      display_date: new Date().toLocaleDateString("pt-BR"),
      display_time: "Hoje",
      title: "",
      summary: "",
      description: "",
      status_label: "",
      event_type: "update",
      is_current_status: false,
      is_published: true,
      sort_order: (events[0]?.sort_order || 0) + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEditModal = (event: TimelineEventRecord) => {
    setEditingEvent(event);
    setFormData({
      id: event.id,
      slug: event.slug,
      event_date: event.event_date,
      display_date: event.display_date,
      display_time: event.display_time || "",
      title: event.title,
      summary: event.summary || "",
      description: event.description,
      status_label: event.status_label || "",
      event_type: event.event_type,
      is_current_status: event.is_current_status,
      is_published: event.is_published,
      sort_order: event.sort_order,
    });
    setModalOpen(true);
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.event_date || !formData.display_date) {
      showNotification("Por favor, preencha os campos obrigatórios (*).", true);
      return;
    }

    startTransition(async () => {
      const res = await upsertTimelineEventAction(formData);
      if (res.success && res.event) {
        showNotification(editingEvent ? "Evento atualizado com sucesso!" : "Novo evento publicado com sucesso!");
        setModalOpen(false);

        // Update local list
        setEvents((prev) => {
          const updatedEvent = res.event!;
          let next = [...prev];
          if (updatedEvent.is_current_status) {
            next = next.map((ev) => ({ ...ev, is_current_status: false }));
          }
          const index = next.findIndex((ev) => ev.id === updatedEvent.id);
          if (index >= 0) {
            next[index] = updatedEvent;
          } else {
            next.unshift(updatedEvent);
          }
          return next;
        });
      } else {
        showNotification(res.error || "Erro ao salvar evento.", true);
      }
    });
  };

  const handleSetCurrentStatus = (id: string) => {
    startTransition(async () => {
      const res = await setCurrentStatusAction(id);
      if (res.success) {
        showNotification("Estado atual do Dante atualizado!");
        setEvents((prev) =>
          prev.map((ev) => ({
            ...ev,
            is_current_status: ev.id === id,
          }))
        );
      } else {
        showNotification(res.error || "Erro ao definir estado atual.", true);
      }
    });
  };

  const handleTogglePublish = (id: string, currentVal: boolean) => {
    startTransition(async () => {
      const res = await togglePublishTimelineEventAction(id, !currentVal);
      if (res.success) {
        showNotification(!currentVal ? "Evento publicado no site!" : "Evento ocultado do site.");
        setEvents((prev) =>
          prev.map((ev) => (ev.id === id ? { ...ev, is_published: !currentVal } : ev))
        );
      } else {
        showNotification(res.error || "Erro ao alternar visibilidade.", true);
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteTimelineEventAction(id);
      if (res.success) {
        showNotification("Evento removido com sucesso.");
        setEvents((prev) => prev.filter((ev) => ev.id !== id));
        setDeleteConfirmId(null);
      } else {
        showNotification(res.error || "Erro ao remover evento.", true);
      }
    });
  };

  const currentStatusEvent = events.find((ev) => ev.is_current_status);

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between animate-in fade-in">
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-xs font-bold underline ml-4">
            Fechar
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between animate-in fade-in">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-xs font-bold underline ml-4">
            Fechar
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Linha do Tempo e Transparência</h1>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              {events.length} Eventos
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Gerencie os relatos diários, laudos médicos e o status atual da recuperação do Dante exibidos na página inicial.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          disabled={isPending}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 transition active:scale-95 flex items-center justify-center gap-2 shrink-0"
        >
          <span>+ Novo Evento na Linha do Tempo</span>
        </button>
      </div>

      {/* Current Status Highlight Banner */}
      {currentStatusEvent && (
        <div className="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-emerald-950/30 border border-emerald-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              STATUS ATUAL EXIBIDO NO TOPO DO SITE
            </span>
            <span className="text-xs text-slate-400 font-mono">
              {currentStatusEvent.display_date} • {currentStatusEvent.display_time}
            </span>
          </div>
          <h2 className="text-base font-bold text-white tracking-tight">{currentStatusEvent.title}</h2>
          {currentStatusEvent.status_label && (
            <p className="text-xs font-semibold text-emerald-400">
              Etiqueta de Destaque: &ldquo;{currentStatusEvent.status_label}&rdquo;
            </p>
          )}
          <p className="text-xs text-slate-300 line-clamp-2">{currentStatusEvent.summary || currentStatusEvent.description}</p>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        {events.map((event) => {
          const typeMeta = typeLabels[event.event_type] || typeLabels.update;
          return (
            <div
              key={event.id}
              className={`p-5 rounded-2xl bg-slate-900/60 border transition hover:border-slate-700 space-y-3 ${
                event.is_current_status ? "border-emerald-500/40 ring-1 ring-emerald-500/20 bg-emerald-950/10" : "border-slate-800"
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${typeMeta.color}`}>
                    <span>{typeMeta.icon}</span>
                    <span>{typeMeta.label}</span>
                  </span>

                  {event.is_current_status && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      ⭐ Estado Atual
                    </span>
                  )}

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      event.is_published
                        ? "bg-teal-500/10 text-teal-300 border-teal-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {event.is_published ? "✓ Publicado" : "Oculto"}
                  </span>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  {event.display_date} {event.display_time && `• ${event.display_time}`}
                </div>
              </div>

              {/* Title & Tag */}
              <div>
                <h3 className="text-sm md:text-base font-bold text-white tracking-tight">{event.title}</h3>
                {event.status_label && (
                  <span className="inline-block mt-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    {event.status_label}
                  </span>
                )}
              </div>

              {/* Summary / Description */}
              <div className="text-xs text-slate-300 leading-relaxed space-y-1">
                {event.summary && <p className="font-medium text-slate-200">{event.summary}</p>}
                <p className="text-slate-400 whitespace-pre-line line-clamp-3">{event.description}</p>
              </div>

              {/* Actions Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {!event.is_current_status && (
                    <button
                      onClick={() => handleSetCurrentStatus(event.id)}
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
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(event)}
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
                    🗑️ Excluir
                  </button>
                </div>
              </div>

              {/* Delete Confirmation Modal */}
              {deleteConfirmId === event.id && (
                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-2 animate-in fade-in">
                  <p className="text-xs font-bold text-rose-200">
                    Tem certeza de que deseja remover este evento permanentemente?
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleDelete(event.id)}
                      disabled={isPending}
                      className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition"
                    >
                      Sim, Excluir
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-slate-900 border border-slate-800 p-6 md:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {editingEvent ? "Editar Evento da Linha do Tempo" : "Novo Evento na Linha do Tempo"}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Preencha os detalhes do relato ou atualização médica do Dante.
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-2 rounded-xl bg-slate-800/80"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Dates & Time Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data do Evento (Filtro) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Data de Exibição *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 29/08/2026"
                    value={formData.display_date}
                    onChange={(e) => setFormData({ ...formData, display_date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Horário / Momento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 16h26 ou À tarde"
                    value={formData.display_time}
                    onChange={(e) => setFormData({ ...formData, display_time: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Event Type & Status Label */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tipo de Evento *
                  </label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value as TimelineEventType })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="update">📢 Atualização / Relato</option>
                    <option value="medical">🩺 Boletim Médico / Laudo</option>
                    <option value="status">🐾 Status Geral</option>
                    <option value="campaign">🎯 Campanha / Apoio</option>
                    <option value="milestone">💡 Marco Importante</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Etiqueta / Tag de Status (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Recuperação · Alta prevista"
                    value={formData.status_label || ""}
                    onChange={(e) => setFormData({ ...formData, status_label: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título do Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Fomos visitar o Dante 💚"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resumo Curto
                </label>
                <input
                  type="text"
                  placeholder="Uma linha resumindo a novidade..."
                  value={formData.summary || ""}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição Completa / Texto do Relato *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Descreva o que aconteceu em detalhes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Checkboxes: is_current_status & is_published */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-slate-800 space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_current_status}
                    onChange={(e) => setFormData({ ...formData, is_current_status: e.target.checked })}
                    className="mt-0.5 rounded border-slate-700 bg-black/40 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      ⭐ Definir como Estado Atual do Dante
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Este evento ficará em destaque no topo da página principal. Ao marcar este, qualquer outro deixará de ser o atual.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_published}
                    onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                    className="mt-0.5 rounded border-slate-700 bg-black/40 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      ✓ Publicado no site
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      Se desmarcado, ficará visível somente para administradores no painel.
                    </span>
                  </div>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
                >
                  {isPending ? "Salvando..." : editingEvent ? "Salvar Alterações" : "Criar Evento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
