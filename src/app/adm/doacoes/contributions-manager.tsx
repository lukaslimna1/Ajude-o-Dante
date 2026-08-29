"use client";

import { useMemo, useState } from "react";
import {
  type ContributionRow,
  type SaveContributionInput,
  deleteContribution,
  saveContribution,
} from "./actions";

type Props = {
  initialContributions: ContributionRow[];
};

const formatCurrency = (cents: number | null) => {
  if (cents === null || cents === undefined) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
};

const formatDate = (isoString: string) => {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
};

const supportTypeLabels: Record<string, string> = {
  financial: "Financeiro",
  material: "Bem / Material",
  service: "Serviço",
  publicity: "Divulgação",
  other: "Outro apoio",
};

const sourceLabels: Record<string, string> = {
  pix_direct: "Pix Direto",
  cash: "Dinheiro",
  clinic_direct: "Clínica Direto",
  mercado_pago: "Mercado Pago",
  manual: "Manual / Outro",
};

const statusLabels: Record<string, { label: string; color: string }> = {
  approved: { label: "Aprovado", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  pending: { label: "Pendente", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  cancelled: { label: "Cancelado", color: "bg-slate-700/50 text-slate-400 border-slate-600" },
  refunded: { label: "Reembolsado", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
  rejected: { label: "Rejeitado", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
  charged_back: { label: "Chargeback", color: "bg-rose-500/15 text-rose-300 border-rose-500/30" },
};

function getSuggestedPublicName(name: string, type: "person" | "organization"): string {
  const clean = name.trim();
  if (!clean) return "";
  if (type === "organization") return clean;
  // For person: extract first two words
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length <= 2) return clean;
  return `${parts[0]} ${parts[1]}`;
}

export default function ContributionsManager({ initialContributions }: Props) {
  const [contributions, setContributions] = useState<ContributionRow[]>(initialContributions);
  const [search, setSearch] = useState("");
  const [filterSupportType, setFilterSupportType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterGoal, setFilterGoal] = useState<string>("all");
  const [filterPublic, setFilterPublic] = useState<string>("all");

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ContributionRow | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [formSupporterType, setFormSupporterType] = useState<"person" | "organization">("person");
  const [formDonorName, setFormDonorName] = useState("");
  const [formPublicName, setFormPublicName] = useState(true);
  const [formPublicDisplayName, setFormPublicDisplayName] = useState("");
  const [hasManuallyEditedPublicName, setHasManuallyEditedPublicName] = useState(false);
  const [formSupportType, setFormSupportType] = useState<"financial" | "material" | "service" | "publicity" | "other">("financial");
  const [formAmountReais, setFormAmountReais] = useState<string>("50");
  const [formSource, setFormSource] = useState<string>("pix_direct");
  const [formDescription, setFormDescription] = useState("");
  const [formCountsForGoal, setFormCountsForGoal] = useState(true);
  const [formOccurredAt, setFormOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [formStatus, setFormStatus] = useState("approved");
  const [formNotes, setFormNotes] = useState("");
  const [formInstitution, setFormInstitution] = useState("");

  // Delete Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ContributionRow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Filtered List
  const filteredList = useMemo(() => {
    return contributions.filter((item) => {
      const matchSearch =
        !search.trim() ||
        (item.donor_name && item.donor_name.toLowerCase().includes(search.toLowerCase())) ||
        (item.public_display_name && item.public_display_name.toLowerCase().includes(search.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(search.toLowerCase()));

      const matchType = filterSupportType === "all" || item.support_type === filterSupportType;
      const matchStatus = filterStatus === "all" || item.status === filterStatus;
      const matchGoal =
        filterGoal === "all" ||
        (filterGoal === "yes" && item.counts_for_goal) ||
        (filterGoal === "no" && !item.counts_for_goal);
      const matchPublic =
        filterPublic === "all" ||
        (filterPublic === "yes" && item.public_name) ||
        (filterPublic === "no" && !item.public_name);

      return matchSearch && matchType && matchStatus && matchGoal && matchPublic;
    });
  }, [contributions, search, filterSupportType, filterStatus, filterGoal, filterPublic]);

  // Open Modal for Create
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormSupporterType("person");
    setFormDonorName("");
    setFormPublicName(true);
    setFormPublicDisplayName("");
    setHasManuallyEditedPublicName(false);
    setFormSupportType("financial");
    setFormAmountReais("50");
    setFormSource("pix_direct");
    setFormDescription("");
    setFormCountsForGoal(true);
    setFormOccurredAt(new Date().toISOString().slice(0, 16));
    setFormStatus("approved");
    setFormNotes("");
    setFormInstitution("");
    setFormError(null);
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (item: ContributionRow) => {
    setEditingItem(item);
    setFormSupporterType(item.supporter_type || "person");
    setFormDonorName(item.donor_name || "");
    setFormPublicName(item.public_name);
    setFormPublicDisplayName(item.public_display_name || "");
    setHasManuallyEditedPublicName(true); // Don't auto-overwrite existing values
    setFormSupportType(item.support_type || "financial");
    setFormAmountReais(item.amount_cents ? (item.amount_cents / 100).toFixed(2) : "");
    setFormSource(item.source || "pix_direct");
    setFormDescription(item.description || "");
    setFormCountsForGoal(item.counts_for_goal);
    setFormOccurredAt(item.occurred_at ? new Date(item.occurred_at).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setFormStatus(item.status || "approved");
    setFormNotes(item.notes || "");
    setFormInstitution(item.institution || "");
    setFormError(null);
    setModalOpen(true);
  };

  // Handle donor name changes and auto-suggestion
  const handleDonorNameChange = (val: string) => {
    setFormDonorName(val);
    if (!hasManuallyEditedPublicName) {
      setFormPublicDisplayName(getSuggestedPublicName(val, formSupporterType));
    }
  };

  // Handle supporter type toggle
  const handleSupporterTypeChange = (type: "person" | "organization") => {
    setFormSupporterType(type);
    if (!hasManuallyEditedPublicName) {
      setFormPublicDisplayName(getSuggestedPublicName(formDonorName, type));
    }
  };

  // Handle support type change
  const handleSupportTypeChange = (type: "financial" | "material" | "service" | "publicity" | "other") => {
    setFormSupportType(type);
    if (type !== "financial") {
      setFormCountsForGoal(false);
    } else {
      setFormCountsForGoal(true);
    }
  };

  // Submit Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFormError(null);

    const payload: SaveContributionInput = {
      id: editingItem?.id,
      supporter_type: formSupporterType,
      donor_name: formDonorName,
      public_name: formPublicName,
      public_display_name: formPublicDisplayName,
      support_type: formSupportType,
      source: formSource,
      amount_reais: formSupportType === "financial" ? Number(formAmountReais.replace(",", ".")) : undefined,
      description: formDescription,
      counts_for_goal: formCountsForGoal,
      occurred_at: formOccurredAt,
      status: formStatus,
      notes: formNotes,
      institution: formInstitution,
    };

    const res = await saveContribution(payload);
    setIsSaving(false);

    if (!res.success) {
      setFormError(res.error || "Erro ao salvar registro.");
      return;
    }

    // Refresh list locally
    setContributions((prev) => {
      const now = new Date().toISOString();
      const amountCents = formSupportType === "financial" ? Math.round(Number(formAmountReais.replace(",", ".")) * 100) : null;
      if (editingItem) {
        return prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                ...payload,
                amount_cents: amountCents,
                occurred_at: formOccurredAt ? new Date(formOccurredAt).toISOString() : now,
                updated_at: now,
              }
            : item
        );
      } else {
        const newItem: ContributionRow = {
          id: `temp-${Date.now()}`,
          donor_name: formDonorName || null,
          public_display_name: formPublicName ? (formPublicDisplayName || formDonorName) : null,
          public_name: formPublicName,
          amount_cents: amountCents,
          source: formSupportType === "financial" ? formSource : "manual",
          provider: formSource === "pix_direct" ? "pix" : null,
          status: formStatus,
          occurred_at: formOccurredAt ? new Date(formOccurredAt).toISOString() : now,
          pix_end_to_end_id: null,
          transaction_id: null,
          institution: formInstitution || null,
          provider_payment_id: null,
          dedupe_key: `adm:${Date.now()}`,
          notes: formNotes || null,
          supporter_type: formSupporterType,
          support_type: formSupportType,
          counts_for_goal: formCountsForGoal,
          description: formDescription || null,
          created_at: now,
          updated_at: now,
        };
        return [newItem, ...prev];
      }
    });

    setModalOpen(false);
  };

  // Handle Delete Confirmation
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);

    const res = await deleteContribution(itemToDelete.id);
    setIsDeleting(false);

    if (!res.success) {
      setDeleteError(res.error || "Erro ao excluir registro.");
      return;
    }

    setContributions((prev) => prev.filter((it) => it.id !== itemToDelete.id));
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Doações e Apoios</h1>
          <p className="text-sm text-slate-400 mt-1">
            Gerenciamento e conciliação de doações financeiras, bens doados e apoios voluntários.
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
        >
          <span>➕</span> Novo Registro
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search */}
          <div className="md:col-span-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="🔍 Buscar por nome completo, nome público ou descrição..."
              className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={filterSupportType}
              onChange={(e) => setFilterSupportType(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="all">Tipo de Apoio: Todos</option>
              <option value="financial">Financeiro</option>
              <option value="material">Bem / Material</option>
              <option value="service">Serviço</option>
              <option value="publicity">Divulgação</option>
              <option value="other">Outro apoio</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950/80 border border-slate-700/70 rounded-xl text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="all">Status: Todos</option>
              <option value="approved">Aprovado</option>
              <option value="pending">Pendente</option>
              <option value="cancelled">Cancelado</option>
              <option value="refunded">Reembolsado</option>
            </select>
          </div>
        </div>

        {/* Secondary filters row */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-xs text-slate-400">
          <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider mr-1">
            Filtros rápidos:
          </span>
          <button
            onClick={() => setFilterGoal(filterGoal === "yes" ? "all" : "yes")}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
              filterGoal === "yes"
                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                : "bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300"
            }`}
          >
            Contabiliza na Arrecadação
          </button>
          <button
            onClick={() => setFilterPublic(filterPublic === "yes" ? "all" : "yes")}
            className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
              filterPublic === "yes"
                ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                : "bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-300"
            }`}
          >
            Exibe nos Agradecimentos
          </button>
          {(search || filterSupportType !== "all" || filterStatus !== "all" || filterGoal !== "all" || filterPublic !== "all") && (
            <button
              onClick={() => {
                setSearch("");
                setFilterSupportType("all");
                setFilterStatus("all");
                setFilterGoal("all");
                setFilterPublic("all");
              }}
              className="ml-auto text-xs text-rose-400 hover:text-rose-300 underline"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Mostrando <strong>{filteredList.length}</strong> de {contributions.length} registros
        </span>
      </div>

      {/* Table & Cards */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Apoiador (Interno)</th>
                <th className="py-3 px-4 font-semibold">Nome Público</th>
                <th className="py-3 px-4 font-semibold">Tipo & Origem</th>
                <th className="py-3 px-4 font-semibold">Valor / Descrição</th>
                <th className="py-3 px-4 font-semibold">Contabiliza</th>
                <th className="py-3 px-4 font-semibold">Data / Hora</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Nenhum registro encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredList.map((item) => {
                  const statusInfo = statusLabels[item.status] || {
                    label: item.status,
                    color: "bg-slate-800 text-slate-300 border-slate-700",
                  };
                  const isMercadoPago = item.source === "mercado_pago" || item.provider === "mercado_pago";

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white flex items-center gap-1.5">
                          <span>{item.supporter_type === "organization" ? "🏢" : "👤"}</span>
                          <span>{item.donor_name || "(Não informado)"}</span>
                        </div>
                        {item.institution && (
                          <div className="text-[10px] text-slate-500">{item.institution}</div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {item.public_name ? (
                          <div className="flex items-center gap-1 text-emerald-300 font-medium">
                            <span title="Exibido publicamente">👁️</span>
                            <span>{item.public_display_name || item.donor_name}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px] italic">Oculto</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-200">
                          {supportTypeLabels[item.support_type] || item.support_type}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {sourceLabels[item.source] || item.source}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {item.support_type === "financial" ? (
                          <div className="font-semibold text-emerald-400">
                            {formatCurrency(item.amount_cents)}
                          </div>
                        ) : (
                          <div className="text-slate-300 truncate max-w-[200px]" title={item.description || ""}>
                            {item.description || "Apoio não financeiro"}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        {item.counts_for_goal ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            Sim
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            Não
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {formatDate(item.occurred_at)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusInfo.color}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => {
                              setItemToDelete(item);
                              setDeleteError(null);
                              setDeleteDialogOpen(true);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${
                              isMercadoPago
                                ? "opacity-30 cursor-not-allowed text-slate-600"
                                : "hover:bg-rose-500/20 text-rose-400 hover:text-rose-300"
                            }`}
                            title={isMercadoPago ? "Registros do Mercado Pago não podem ser excluídos" : "Excluir"}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden divide-y divide-slate-800/80">
          {filteredList.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              Nenhum registro encontrado.
            </div>
          ) : (
            filteredList.map((item) => {
              const statusInfo = statusLabels[item.status] || {
                label: item.status,
                color: "bg-slate-800 text-slate-300 border-slate-700",
              };
              const isMercadoPago = item.source === "mercado_pago" || item.provider === "mercado_pago";

              return (
                <div key={item.id} className="p-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white text-sm flex items-center gap-1.5">
                        <span>{item.supporter_type === "organization" ? "🏢" : "👤"}</span>
                        <span>{item.donor_name || "(Não informado)"}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Nome público:{" "}
                        {item.public_name ? (
                          <span className="text-emerald-300 font-medium">{item.public_display_name}</span>
                        ) : (
                          <span className="text-slate-500 italic">Oculto</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusInfo.color}`}
                    >
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Tipo & Origem</span>
                      <span className="text-slate-200 font-medium">
                        {supportTypeLabels[item.support_type]} • {sourceLabels[item.source] || item.source}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Valor / Bem</span>
                      {item.support_type === "financial" ? (
                        <span className="text-emerald-400 font-semibold">{formatCurrency(item.amount_cents)}</span>
                      ) : (
                        <span className="text-slate-300 truncate block">{item.description || "—"}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>{formatDate(item.occurred_at)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => {
                          setItemToDelete(item);
                          setDeleteError(null);
                          setDeleteDialogOpen(true);
                        }}
                        disabled={isMercadoPago}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                          isMercadoPago
                            ? "bg-slate-900 text-slate-600 cursor-not-allowed"
                            : "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30"
                        }`}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal Cadastro / Edição */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-white">
                {editingItem ? "Editar Apoio / Contribuição" : "Novo Apoio / Contribuição"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              {/* Tipo de Apoiador */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Tipo de Apoiador
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleSupporterTypeChange("person")}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      formSupporterType === "person"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/50"
                    }`}
                  >
                    <span>👤</span> Pessoa Física
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSupporterTypeChange("organization")}
                    className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      formSupporterType === "organization"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800/50"
                    }`}
                  >
                    <span>🏢</span> Empresa / Organização
                  </button>
                </div>
              </div>

              {/* Nome Completo */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1" htmlFor="donorName">
                  Nome Completo / Identificação Interna
                </label>
                <input
                  id="donorName"
                  type="text"
                  required
                  value={formDonorName}
                  onChange={(e) => handleDonorNameChange(e.target.value)}
                  placeholder={formSupporterType === "person" ? "Ex: João Pedro da Silva Santos" : "Ex: Mattos Max Transporte e Turismo"}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Exibir nos Agradecimentos & Nome Público */}
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-slate-200 font-semibold block">
                      Exibir nos agradecimentos
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Mostrar reconhecimento público no site do Dante
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formPublicName}
                    onChange={(e) => setFormPublicName(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/50 bg-slate-900 border-slate-700 cursor-pointer"
                  />
                </div>

                {formPublicName && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1" htmlFor="publicDisplayName">
                      Nome Público (como aparecerá no site)
                    </label>
                    <input
                      id="publicDisplayName"
                      type="text"
                      value={formPublicDisplayName}
                      onChange={(e) => {
                        setFormPublicDisplayName(e.target.value);
                        setHasManuallyEditedPublicName(true);
                      }}
                      placeholder="Ex: João Pedro"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      {formSupporterType === "person"
                        ? "Sugerido automaticamente pelos dois primeiros nomes. Você pode alterar para apelido ou inicial."
                        : "Sugerido com a razão social/marca informada."}
                    </p>
                  </div>
                )}
              </div>

              {/* Tipo de Apoio */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1" htmlFor="supportType">
                  Tipo de Apoio
                </label>
                <select
                  id="supportType"
                  value={formSupportType}
                  onChange={(e) =>
                    handleSupportTypeChange(
                      e.target.value as "financial" | "material" | "service" | "publicity" | "other"
                    )
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="financial">Financeiro (Dinheiro, Pix, Cartão)</option>
                  <option value="material">Bem / Material (TV, ração, medicamentos)</option>
                  <option value="service">Serviço (Atendimento, transporte, consultoria)</option>
                  <option value="publicity">Divulgação (Influenciador, rádio, perfil)</option>
                  <option value="other">Outro apoio</option>
                </select>
              </div>

              {/* Campos Condicionais: Financeiro vs Não Financeiro */}
              {formSupportType === "financial" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-emerald-950/20 p-3.5 rounded-xl border border-emerald-500/20">
                  <div>
                    <label className="block text-emerald-300 font-semibold mb-1" htmlFor="amountReais">
                      Valor da Doação (R$) *
                    </label>
                    <input
                      id="amountReais"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={formAmountReais}
                      onChange={(e) => setFormAmountReais(e.target.value)}
                      placeholder="50.00"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-emerald-400 font-semibold text-xs focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1" htmlFor="source">
                      Forma de Recebimento
                    </label>
                    <select
                      id="source"
                      value={formSource}
                      onChange={(e) => setFormSource(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/50"
                    >
                      <option value="pix_direct">Pix Direto</option>
                      <option value="cash">Dinheiro</option>
                      <option value="clinic_direct">Pagamento na Clínica</option>
                      <option value="mercado_pago">Mercado Pago</option>
                      <option value="manual">Manual / Transferência</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-300 font-semibold mb-1" htmlFor="institution">
                      Banco / Instituição (Opcional)
                    </label>
                    <input
                      id="institution"
                      type="text"
                      value={formInstitution}
                      onChange={(e) => setFormInstitution(e.target.value)}
                      placeholder="Ex: Nubank, Banco do Brasil, Itaú"
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              ) : (
                <div className="bg-sky-950/20 p-3.5 rounded-xl border border-sky-500/20 space-y-2">
                  <label className="block text-sky-300 font-semibold" htmlFor="description">
                    Descrição Interna do Bem ou Serviço
                  </label>
                  <textarea
                    id="description"
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Ex: TV doada para a Ação Solidária / Rifa do Dante"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-sky-500/50"
                  />
                  <p className="text-[10px] text-slate-400">
                    A descrição permanece interna para controle administrativo e nunca é exibida no site público.
                  </p>
                </div>
              )}

              {/* Contabilizar na Arrecadação */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <label className="text-slate-200 font-semibold block">
                    Contabilizar na Arrecadação
                  </label>
                  <span className="text-[11px] text-slate-400">
                    Soma o valor diretamente na barra de progresso do site público
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={formCountsForGoal}
                  onChange={(e) => setFormCountsForGoal(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500/50 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>

              {/* Data & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1" htmlFor="occurredAt">
                    Data e Hora
                  </label>
                  <input
                    id="occurredAt"
                    type="datetime-local"
                    value={formOccurredAt}
                    onChange={(e) => setFormOccurredAt(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/50"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1" htmlFor="status">
                    Status do Registro
                  </label>
                  <select
                    id="status"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="approved">Aprovado (Confirmado)</option>
                    <option value="pending">Pendente</option>
                    <option value="cancelled">Cancelado</option>
                    <option value="refunded">Reembolsado</option>
                  </select>
                </div>
              </div>

              {/* Observações Internas */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1" htmlFor="notes">
                  Observações Internas (ADM)
                </label>
                <textarea
                  id="notes"
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Anotações para controle interno..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <span className="w-3 h-3 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <span>Salvar Registro</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Exclusão */}
      {deleteDialogOpen && itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-base font-bold text-white">Confirmar Exclusão</h2>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Tem certeza que deseja excluir o registro de{" "}
              <strong className="text-white">
                {itemToDelete.donor_name || itemToDelete.public_display_name || "apoiador"}
              </strong>
              {itemToDelete.amount_cents ? ` no valor de ${formatCurrency(itemToDelete.amount_cents)}` : ""}?
            </p>

            <p className="text-[11px] text-slate-500">
              Esta ação removerá o registro e atualizará a arrecadação da campanha automaticamente.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setItemToDelete(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl text-xs shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <span>Sim, Excluir</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
