"use client";

import { useState, useTransition, useMemo } from "react";
import {
  RaffleAdminMetrics,
  AdminReservationItem,
  AdminNumberGridItem,
  confirmRafflePayment,
  releaseRaffleReservation,
  updateRaffleStatus,
  fetchRaffleAdminData,
  adminCreateManualRaffleEntry,
} from "./actions";

interface RaffleManagerProps {
  initialMetrics: RaffleAdminMetrics;
  initialReservations: AdminReservationItem[];
  initialNumbers?: AdminNumberGridItem[];
}

export default function RaffleManager({
  initialMetrics,
  initialReservations,
  initialNumbers = [],
}: RaffleManagerProps) {
  const [metrics, setMetrics] = useState<RaffleAdminMetrics>(initialMetrics);
  const [reservations, setReservations] = useState<AdminReservationItem[]>(initialReservations);
  const [numbersList, setNumbersList] = useState<AdminNumberGridItem[]>(initialNumbers);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRes, setSelectedRes] = useState<AdminReservationItem | null>(null);
  const [actionType, setActionType] = useState<"confirm" | "release" | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  // State for Manual Entry Modal
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualWhatsapp, setManualWhatsapp] = useState("");
  const [manualStatus, setManualStatus] = useState<"paid" | "reserved">("paid");
  const [manualPaymentMethod, setManualPaymentMethod] = useState<"pix" | "cash" | "transfer" | "other">("pix");
  const [manualResMode, setManualResMode] = useState<"without_expiration" | "30_minutes">("without_expiration");
  const [manualSelectedNumbers, setManualSelectedNumbers] = useState<number[]>([]);
  const [manualNotes, setManualNotes] = useState("");
  const [manualFormError, setManualFormError] = useState<string | null>(null);

  const refreshData = () => {
    startTransition(async () => {
      const res = await fetchRaffleAdminData();
      if (res.success) {
        setMetrics(res.metrics);
        setReservations(res.reservations);
        setNumbersList(res.numbers);
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

  const handleCreateManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    setManualFormError(null);

    if (!manualName.trim()) {
      setManualFormError("Informe o nome do participante.");
      return;
    }

    if (manualSelectedNumbers.length === 0) {
      setManualFormError("Selecione pelo menos 1 número disponível na grade.");
      return;
    }

    if (manualSelectedNumbers.length > 10) {
      setManualFormError("O limite é de no máximo 10 números por lançamento.");
      return;
    }

    startTransition(async () => {
      const res = await adminCreateManualRaffleEntry({
        numbers: manualSelectedNumbers,
        customerName: manualName.trim(),
        customerWhatsapp: manualWhatsapp.trim(),
        paymentStatus: manualStatus,
        paymentMethod: manualStatus === "paid" ? manualPaymentMethod : undefined,
        reservationMode: manualStatus === "reserved" ? manualResMode : undefined,
        notes: manualNotes.trim() || undefined,
      });

      if (res.success) {
        setFeedback({
          type: "success",
          text: `Lançamento manual registrado com sucesso! Pedido: ${res.order_code || "OK"}.`,
        });
        setIsManualModalOpen(false);
        setManualName("");
        setManualWhatsapp("");
        setManualSelectedNumbers([]);
        setManualNotes("");
        setManualStatus("paid");
        setManualPaymentMethod("pix");
        setManualResMode("without_expiration");
        refreshData();
      } else {
        setManualFormError(res.error || "Erro ao registrar lançamento.");
      }
    });
  };

  const toggleManualNumber = (num: number, isAvailable: boolean) => {
    if (!isAvailable) return;
    setManualSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      }
      if (prev.length >= 10) {
        setManualFormError("Limite máximo de 10 números atingido.");
        return prev;
      }
      setManualFormError(null);
      return [...prev, num].sort((a, b) => a - b);
    });
  };

  const getWhatsappUrl = (r: AdminReservationItem) => {
    const rawPhone = r.customer_whatsapp.replace(/\D/g, "");
    if (!rawPhone) return "";
    const fullPhone = rawPhone.startsWith("55") ? rawPhone : `55${rawPhone}`;
    const numbersList = r.numbers.map((n) => n.toString().padStart(3, "0")).join(", ");
    const text = `Olá ${r.customer_name}! Estou conferindo a sua participação na Ação entre Amigos pelo Dante (Pedido: ${r.order_code} • Números: ${numbersList}).`;
    return `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
  };

  const formatCents = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const formatPhone = (phone: string) => {
    if (!phone) return "—";
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

  const getPaymentMethodLabel = (method?: string | null) => {
    switch (method) {
      case "pix":
        return "Pix direto";
      case "cash":
        return "Dinheiro";
      case "transfer":
        return "Transferência";
      case "other":
        return "Outro";
      default:
        return null;
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
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Action: + Nova Venda Manual */}
          <button
            onClick={() => {
              setManualFormError(null);
              setIsManualModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-lg shadow-emerald-500/20 transition active:scale-[0.98]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            + Nova Venda Manual
          </button>

          <div className="h-6 w-px bg-white/10 hidden sm:block mx-1" />

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-1">
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
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition text-xs flex items-center gap-1 border border-white/10"
            title="Recarregar dados"
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
                  <th className="py-3.5 px-4">Pedido / Origem</th>
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
                  const isManual = r.entry_source === "admin_manual";
                  const pMethod = getPaymentMethodLabel(r.payment_method);

                  return (
                    <tr key={r.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-3.5 px-4">
                        <div className="font-mono font-bold text-white">{r.order_code}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${
                              isManual
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                : "bg-sky-500/20 text-sky-300 border-sky-500/40"
                            }`}
                          >
                            {isManual ? "Manual" : "Site"}
                          </span>
                          {pMethod && (
                            <span className="text-[10px] text-slate-400">
                              • {pMethod}
                            </span>
                          )}
                        </div>
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
                        {r.status === "reserved" && r.expires_at && (
                          <div className="text-blue-400 text-[10px]">
                            Expira:{" "}
                            {new Date(r.expires_at).toLocaleTimeString("pt-BR", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </div>
                        )}
                        {r.status === "reserved" && !r.expires_at && (
                          <div className="text-purple-400 text-[10px]">
                            Sem expiração
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* WhatsApp Direct Link */}
                          {r.customer_whatsapp && getWhatsappUrl(r) && (
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
                          )}

                          {/* Confirm Payment Action */}
                          {r.status !== "paid" && r.status !== "cancelled" && (
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

                          {/* Release Reservation Action (Only for non-paid) */}
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

      {/* MODAL: Nova Venda / Reserva Manual */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-emerald-500/30 shadow-2xl shadow-emerald-950/50 overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-lg">
                  🎟️
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Lançamento Manual de Venda / Reserva
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cadastre compras recebidas por fora (Pix direto, dinheiro, etc.)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsManualModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center text-xs transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleCreateManualEntry} className="flex-1 overflow-y-auto p-6 space-y-5">
              {manualFormError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                  {manualFormError}
                </div>
              )}

              {/* Status Toggle Cards */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  Tipo de Lançamento *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setManualStatus("paid")}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      manualStatus === "paid"
                        ? "bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-950/50"
                        : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white">✓ JÁ PAGO</span>
                      {manualStatus === "paid" && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Participante já realizou o pagamento. Os números são marcados imediatamente como pagos.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setManualStatus("reserved")}
                    className={`p-3.5 rounded-2xl border text-left transition-all ${
                      manualStatus === "reserved"
                        ? "bg-amber-950/60 border-amber-500 text-amber-300 shadow-md shadow-amber-950/50"
                        : "bg-white/[0.02] border-white/10 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm text-white">⏳ APENAS RESERVAR</span>
                      {manualStatus === "reserved" && (
                        <span className="w-2 h-2 rounded-full bg-amber-400" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Bloqueia os números para o participante enquanto aguarda o recebimento.
                    </p>
                  </button>
                </div>
              </div>

              {/* Conditional Options */}
              {manualStatus === "paid" ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Forma de Pagamento
                  </label>
                    {[
                      { id: "pix" as const, label: "Pix direto" },
                      { id: "cash" as const, label: "Dinheiro" },
                      { id: "transfer" as const, label: "Transferência" },
                      { id: "other" as const, label: "Outro" },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setManualPaymentMethod(opt.id)}
                        className={`py-2 px-3 rounded-xl border text-xs font-medium transition ${
                          manualPaymentMethod === opt.id
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold"
                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Modo de Expiração da Reserva
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setManualResMode("without_expiration")}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium text-left transition ${
                        manualResMode === "without_expiration"
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div>Sem expiração</div>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Bloqueado até você confirmar ou liberar
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setManualResMode("30_minutes")}
                      className={`py-2 px-3 rounded-xl border text-xs font-medium text-left transition ${
                        manualResMode === "30_minutes"
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold"
                          : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      <div>Expira em 30 minutos</div>
                      <span className="text-[10px] text-slate-500 font-normal">
                        Liberado automaticamente após 30m
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Participant Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nome do Participante *
                  </label>
                  <input
                    type="text"
                    required
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    WhatsApp (opcional)
                  </label>
                  <input
                    type="text"
                    value={manualWhatsapp}
                    onChange={(e) => setManualWhatsapp(e.target.value)}
                    placeholder="Ex: 14998802529"
                    className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 font-mono"
                  />
                </div>
              </div>

              {/* Grade de Escolha de Números */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-300">
                    Selecione os Números da Grade (001–100) *
                  </label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {manualSelectedNumbers.length} / 10 selecionados
                  </span>
                </div>

                {/* Grade dos 100 números */}
                <div className="p-3 rounded-2xl bg-black/50 border border-white/10 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-10 gap-1.5">
                    {numbersList.map((item) => {
                      const isSelected = manualSelectedNumbers.includes(item.number);
                      const isAvailable = item.status === "available";

                      return (
                        <button
                          key={item.number}
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => toggleManualNumber(item.number, isAvailable)}
                          className={`h-8 rounded-lg font-mono text-[11px] font-bold transition flex items-center justify-center ${
                            isSelected
                              ? "bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/40 ring-2 ring-emerald-300 scale-105"
                              : isAvailable
                              ? "bg-white/5 hover:bg-white/15 text-white border border-white/10 hover:border-emerald-500/50"
                              : item.status === "paid"
                              ? "bg-emerald-950/40 text-emerald-700/50 border border-emerald-900/30 cursor-not-allowed opacity-40"
                              : "bg-blue-950/40 text-blue-700/50 border border-blue-900/30 cursor-not-allowed opacity-40"
                          }`}
                          title={`Número ${item.number.toString().padStart(3, "0")} — ${item.status}`}
                        >
                          {item.number.toString().padStart(3, "0")}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Numbers Bar */}
                {manualSelectedNumbers.length > 0 && (
                  <div className="mt-2.5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-emerald-400 font-semibold mr-1">
                        Escolhidos:
                      </span>
                      {manualSelectedNumbers.map((n) => (
                        <span
                          key={n}
                          onClick={() => toggleManualNumber(n, true)}
                          className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-mono text-xs font-bold cursor-pointer hover:bg-rose-400 transition"
                          title="Clique para remover"
                        >
                          {n.toString().padStart(3, "0")} ✕
                        </span>
                      ))}
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 font-medium">Valor Total:</span>
                      <div className="text-base font-bold text-white font-mono">
                        {formatCents(manualSelectedNumbers.length * 1500)}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações Internas (opcional)
                </label>
                <textarea
                  rows={2}
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  placeholder="Ex: Pagou em mãos no dia 29/08; escolheu número pelo WhatsApp."
                  className="w-full px-3.5 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 resize-none"
                />
              </div>

              {/* Form Actions Footer */}
              <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending || manualSelectedNumbers.length === 0}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
                    manualStatus === "paid"
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-500/20"
                      : "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-amber-500/20"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isPending
                    ? "Registrando..."
                    : manualStatus === "paid"
                    ? `Confirmar Venda Paga (${formatCents(manualSelectedNumbers.length * 1500)})`
                    : `Confirmar Reserva (${formatCents(manualSelectedNumbers.length * 1500)})`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Existing Confirmation / Release Modal */}
      {selectedRes && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-2xl space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">
                {actionType === "confirm"
                  ? "Confirmar Pagamento do Pedido"
                  : "Liberar Números da Reserva"}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                {actionType === "confirm"
                  ? `Confirma o recebimento de ${formatCents(selectedRes.total_cents)} para ${selectedRes.customer_name}?`
                  : `Tem certeza que deseja cancelar a reserva e liberar os números ${selectedRes.numbers.map((n) => n.toString().padStart(3, "0")).join(", ")} de volta para venda?`}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs space-y-1">
              <div><span className="text-slate-500">Pedido:</span> <span className="font-mono font-bold text-white">{selectedRes.order_code}</span></div>
              <div><span className="text-slate-500">Participante:</span> <span className="text-white">{selectedRes.customer_name}</span></div>
              <div><span className="text-slate-500">Números:</span> <span className="font-mono text-amber-300 font-bold">{selectedRes.numbers.map((n) => n.toString().padStart(3, "0")).join(", ")}</span></div>
              <div><span className="text-slate-500">Valor:</span> <span className="text-emerald-400 font-bold">{formatCents(selectedRes.total_cents)}</span></div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Observações Internas (opcional):</label>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ex: Comprovante verificado pelo WhatsApp."
                rows={2}
                className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50 resize-none"
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
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={isPending}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  actionType === "confirm"
                    ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"
                    : "bg-rose-500 hover:bg-rose-400 text-white shadow-lg shadow-rose-500/20"
                }`}
              >
                {isPending
                  ? "Processando..."
                  : actionType === "confirm"
                  ? "Confirmar Pagamento"
                  : "Liberar Números"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
