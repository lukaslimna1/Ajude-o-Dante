"use client";

import { useState, useTransition, useMemo } from "react";
import {
  RaffleAdminMetrics,
  AdminReservationItem,
  confirmRafflePayment,
  releaseRaffleReservation,
  updateRaffleStatus,
  fetchRaffleAdminData,
} from "./actions";

interface RaffleManagerProps {
  initialMetrics: RaffleAdminMetrics;
  initialReservations: AdminReservationItem[];
}

export default function RaffleManager({
  initialMetrics,
  initialReservations,
}: RaffleManagerProps) {
  const [metrics, setMetrics] = useState<RaffleAdminMetrics>(initialMetrics);
  const [reservations, setReservations] = useState<AdminReservationItem[]>(initialReservations);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRes, setSelectedRes] = useState<AdminReservationItem | null>(null);
  const [actionType, setActionType] = useState<"confirm" | "release" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  const refreshData = () => {
    startTransition(async () => {
      const res = await fetchRaffleAdminData();
      if (res.success) {
        setMetrics(res.metrics);
        setReservations(res.reservations);
      } else {
        setFeedback({ type: "error", text: res.error || "Erro ao atualizar dados." });
      }
    });
  };

  const filteredReservations = useMemo(() => {
    return reservations.filter((r) => {
      const matchesStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "awaiting"
          ? r.status === "awaiting_confirmation"
          : r.status === filterStatus;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.order_code.toLowerCase().includes(q) ||
        r.customer_name.toLowerCase().includes(q) ||
        r.customer_whatsapp.includes(q) ||
        r.numbers.some((n) => n.toString().padStart(3, "0").includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [reservations, filterStatus, searchQuery]);

  const handleConfirmAction = () => {
    if (!selectedRes || !actionType) return;

    startTransition(async () => {
      let result;
      if (actionType === "confirm") {
        result = await confirmRafflePayment(selectedRes.id, adminNotes);
      } else {
        result = await releaseRaffleReservation(selectedRes.id, adminNotes);
      }

      if (result.success) {
        setFeedback({
          type: "success",
          text:
            actionType === "confirm"
              ? `Pagamento do pedido ${selectedRes.order_code} confirmado com sucesso!`
              : `Números do pedido ${selectedRes.order_code} liberados de volta para venda.`,
        });
        setSelectedRes(null);
        setActionType(null);
        setAdminNotes("");
        refreshData();
      } else {
        setFeedback({
          type: "error",
          text: result.error || "Não foi possível concluir a ação.",
        });
      }
    });
  };

  const getWhatsappUrl = (r: AdminReservationItem) => {
    const rawPhone = r.customer_whatsapp.replace(/\D/g, "");
    const fullPhone = rawPhone.startsWith("55") ? rawPhone : `55${rawPhone}`;
    const numbersList = r.numbers.map((n) => n.toString().padStart(3, "0")).join(", ");
    const text = `Olá ${r.customer_name}! Estou conferindo a sua participação na Ação entre Amigos pelo Dante (Pedido: ${r.order_code} • Números: ${numbersList}).`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  const formatCents = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatPhone = (phone: string) => {
    const d = phone.replace(/\D/g, "");
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return { label: "Pago / Confirmado", bg: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30" };
      case "awaiting_confirmation":
        return { label: "Aguardando Confirmação", bg: "bg-amber-500/10 text-amber-300 border-amber-500/30" };
      case "reserved":
        return { label: "Reservado (Temp)", bg: "bg-blue-500/10 text-blue-300 border-blue-500/30" };
      case "cancelled":
        return { label: "Cancelado / Liberado", bg: "bg-slate-500/10 text-slate-400 border-slate-500/30" };
      case "expired":
        return { label: "Expirado", bg: "bg-rose-500/10 text-rose-300 border-rose-500/30" };
      default:
        return { label: status, bg: "bg-slate-500/10 text-slate-400 border-slate-500/30" };
    }
  };

  const handleStatusChange = (newStatus: "draft" | "active" | "finished" | "cancelled") => {
    startTransition(async () => {
      const res = await updateRaffleStatus(newStatus);
      if (res.success) {
        setMetrics((prev) => ({ ...prev, raffleStatus: newStatus }));
        setFeedback({
          type: "success",
          text: `Status da Ação entre Amigos alterado para "${newStatus.toUpperCase()}".`,
        });
      } else {
        setFeedback({
          type: "error",
          text: res.error || "Erro ao alterar status da ação.",
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Raffle Status Controller Banner */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400 font-medium">Status da Ação entre Amigos:</span>
          <div className="flex items-center gap-2 mt-1">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                metrics.raffleStatus === "active"
                  ? "bg-emerald-400 animate-pulse"
                  : metrics.raffleStatus === "draft"
                  ? "bg-amber-400"
                  : "bg-slate-500"
              }`}
            />
            <span className="text-sm font-bold text-white uppercase tracking-wider">
              {metrics.raffleStatus === "active"
                ? "Ativa (Aberta para compras)"
                : metrics.raffleStatus === "draft"
                ? "Rascunho (Em preparação)"
                : metrics.raffleStatus === "finished"
                ? "Encerrada"
                : "Cancelada"}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(["draft", "active", "finished", "cancelled"] as const).map((st) => (
            <button
              key={st}
              onClick={() => handleStatusChange(st)}
              disabled={isPending || metrics.raffleStatus === st}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                metrics.raffleStatus === st
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold"
                  : "bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10"
              } disabled:opacity-60`}
            >
              {st === "draft"
                ? "Rascunho"
                : st === "active"
                ? "Ativar Ação"
                : st === "finished"
                ? "Encerrar"
                : "Cancelar"}
            </button>
          ))}
        </div>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-sm animate-in fade-in duration-300 ${
            feedback.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/10 border-rose-500/30 text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold underline ml-4 hover:opacity-80"
          >
            Fechar
          </button>
        </div>
      )}

      {/* KPI Cards Header */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between col-span-2 md:col-span-1">
          <span className="text-xs font-medium text-slate-400">Arrecadado (Rifa)</span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white tracking-tight">
              {formatCents(metrics.confirmedCents)}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Meta da Rifa: {formatCents(metrics.maxRevenueCents)}
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
          <span className="text-xs font-medium text-emerald-400">Números Pagos</span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-400 tracking-tight">
              {metrics.paidNumbersCount}{" "}
              <span className="text-xs text-slate-500 font-normal">/ 100</span>
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {((metrics.paidNumbersCount / 100) * 100).toFixed(0)}% vendidos
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
          <span className="text-xs font-medium text-amber-400">Aguardando</span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-300 tracking-tight">
              {metrics.awaitingCount}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Comprovante enviado</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
          <span className="text-xs font-medium text-blue-400">Reservados</span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-blue-300 tracking-tight">
              {metrics.reservedCount}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Aguardando Pix</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400">Disponíveis</span>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-300 tracking-tight">
              {metrics.availableCount}
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">Livres para compra</p>
          </div>
        </div>
      </div>

      {/* Action Bar & Filters */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: "all", label: "Todos" },
            { id: "awaiting", label: "Aguardando" },
            { id: "paid", label: "Pagos" },
            { id: "reserved", label: "Reservados" },
            { id: "cancelled", label: "Cancelados" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterStatus === tab.id
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-white/5 text-slate-400 hover:text-white border border-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar pedido, nome, número..."
              className="w-full pl-3 pr-8 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          <button
            onClick={refreshData}
            disabled={isPending}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition text-xs flex items-center gap-1 border border-white/10"
            title="Recarregar"
          >
            <svg
              className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Reservations List */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/5 overflow-hidden">
        {filteredReservations.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Nenhum pedido ou reserva encontrado para os filtros selecionados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/5 text-slate-400 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="py-3.5 px-4">Pedido</th>
                  <th className="py-3.5 px-4">Participante</th>
                  <th className="py-3.5 px-4">Números</th>
                  <th className="py-3.5 px-4">Valor</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Horário</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                {filteredReservations.map((r) => {
                  const badge = getStatusBadge(r.status);
                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {r.order_code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-white">{r.customer_name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {formatPhone(r.customer_whatsapp)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {r.numbers.map((n) => (
                            <span
                              key={n}
                              className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[10px] font-bold"
                            >
                              {n.toString().padStart(3, "0")}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {formatCents(r.total_cents)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.bg}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                        <div>
                          {new Date(r.created_at).toLocaleDateString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        {r.status === "reserved" && (
                          <div className="text-blue-400 text-[10px]">
                            Expira:{" "}
                            {new Date(r.expires_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Direct Link */}
                          <a
                            href={getWhatsappUrl(r)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition text-xs"
                            title="Abrir conversa no WhatsApp"
                          >
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.067-2.023-.483-1.696-.703-2.775-2.434-2.86-2.546-.084-.112-.684-.912-.684-1.739 0-.828.432-1.233.586-1.391.154-.157.337-.197.45-.197.113 0 .225.001.324.006.104.005.244-.04.382.291.144.347.491 1.2.534 1.288.043.088.072.19.014.303-.058.113-.088.184-.174.285-.087.102-.183.228-.261.306-.088.087-.179.182-.077.357.102.174.453.748.972 1.211.669.596 1.233.78 1.408.868.174.087.277.073.379-.044.103-.117.437-.51.554-.685.116-.175.234-.146.393-.088.16.059 1.01.476 1.183.563.174.088.29.131.334.204.043.073.043.424-.101.829z" />
                            </svg>
                          </a>

                          {/* Confirm Payment Action */}
                          {r.status !== "paid" && (
                            <button
                              onClick={() => {
                                setSelectedRes(r);
                                setActionType("confirm");
                              }}
                              className="px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-medium transition"
                            >
                              Confirmar
                            </button>
                          )}

                          {/* Release Numbers Action */}
                          {r.status !== "paid" && r.status !== "cancelled" && (
                            <button
                              onClick={() => {
                                setSelectedRes(r);
                                setActionType("release");
                              }}
                              className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-medium transition"
                            >
                              Liberar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedRes && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              {actionType === "confirm" ? (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                  Confirmar Pagamento da Rifa
                </>
              ) : (
                <>
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                  Liberar Números da Reserva
                </>
              )}
            </h3>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-400">Pedido:</span>
                <span className="font-mono font-bold text-white">{selectedRes.order_code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Participante:</span>
                <span className="text-white font-medium">{selectedRes.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Números:</span>
                <span className="text-amber-300 font-mono font-bold">
                  {selectedRes.numbers.map((n) => n.toString().padStart(3, "0")).join(", ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Valor Total:</span>
                <span className="text-white font-bold">{formatCents(selectedRes.total_cents)}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              {actionType === "confirm"
                ? "Esta ação marcará a reserva como PAGA e bloqueará definitivamente os números para sorteio."
                : "Esta ação cancelará a reserva e liberará os números imediatamente de volta para compra pública."}
            </p>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Observações internas (opcional):
              </label>
              <input
                type="text"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ex: Comprovante conferido via WhatsApp"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setSelectedRes(null);
                  setActionType(null);
                  setAdminNotes("");
                }}
                disabled={isPending}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isPending}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  actionType === "confirm"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold"
                    : "bg-rose-500 hover:bg-rose-400 text-white font-bold"
                }`}
              >
                {isPending ? (
                  "Processando..."
                ) : actionType === "confirm" ? (
                  "Confirmar Pagamento"
                ) : (
                  "Liberar Números"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
