import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const formatCurrency = (cents: number | null | undefined) => {
  if (cents === null || cents === undefined) return "R$ 0,00";
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
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return isoString;
  }
};

const supportTypeBadges: Record<string, { label: string; color: string }> = {
  financial: { label: "Financeiro", color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" },
  material: { label: "Bem / Material", color: "bg-sky-500/15 text-sky-300 border-sky-500/30" },
  service: { label: "Serviço", color: "bg-amber-500/15 text-amber-300 border-amber-500/30" },
  publicity: { label: "Divulgação", color: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30" },
  other: { label: "Outro apoio", color: "bg-purple-500/15 text-purple-300 border-purple-500/30" },
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  // 1. Fetch Campaign Progress
  const { data: campaignData } = await supabase
    .from("dante_campaign")
    .select("goal_cents, confirmed_cents")
    .eq("id", "main")
    .maybeSingle();

  const goalCents = Number(campaignData?.goal_cents || 350000);
  const confirmedCents = Number(campaignData?.confirmed_cents || 0);
  const progressPercent = goalCents > 0 ? Math.min(100, Math.round((confirmedCents / goalCents) * 100)) : 0;

  // 2. Fetch Contributions Count & Summaries
  const { data: contributions } = await supabase
    .from("dante_contributions")
    .select("id, donor_name, public_display_name, public_name, support_type, amount_cents, description, occurred_at, status, counts_for_goal, supporter_type")
    .order("occurred_at", { ascending: false });

  const list = contributions || [];
  const totalCount = list.length;
  const financialCount = list.filter((it) => it.support_type === "financial").length;
  const nonFinancialCount = list.filter((it) => it.support_type !== "financial").length;
  const publicCount = list.filter((it) => it.public_name).length;

  const recentList = list.slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Dashboard da Campanha
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Visão consolidada do tratamento, arrecadação financeira e apoios recebidos para o Dante.
          </p>
        </div>

        <Link
          href="/adm/doacoes"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-semibold text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all shrink-0"
        >
          <span>🐾</span> Gerenciar Doações e Apoios
        </Link>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Confirmado */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
              Total Arrecadado
            </span>
            <span className="text-emerald-400 text-base">💰</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400 tracking-tight">
            {formatCurrency(confirmedCents)}
          </div>
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
            <span>Meta: {formatCurrency(goalCents)}</span>
            <span className="font-semibold text-emerald-300">{progressPercent}%</span>
          </div>
          {/* Mini progress bar */}
          <div className="w-full bg-slate-950 h-2 rounded-full mt-1.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Card 2: Total de Apoios */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
              Total de Apoios
            </span>
            <span className="text-sky-400 text-base">🤝</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{totalCount}</div>
          <p className="text-[11px] text-slate-400 mt-3">
            <strong className="text-sky-300">{publicCount}</strong> exibidos com gratidão pública
          </p>
        </div>

        {/* Card 3: Apoios Financeiros */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
              Doações Financeiras
            </span>
            <span className="text-emerald-400 text-base">💳</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{financialCount}</div>
          <p className="text-[11px] text-slate-400 mt-3">
            Pix, Mercado Pago, dinheiro e clínica
          </p>
        </div>

        {/* Card 4: Outros Apoios */}
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-500">
              Bens & Voluntariado
            </span>
            <span className="text-purple-400 text-base">🎁</span>
          </div>
          <div className="text-2xl font-bold text-white tracking-tight">{nonFinancialCount}</div>
          <p className="text-[11px] text-slate-400 mt-3">
            Bens materiais, serviços e divulgação
          </p>
        </div>
      </div>

      {/* Grid: Recent Activity & Analytics Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Contributions (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <span className="text-base">🕒</span>
              <h2 className="text-sm font-bold text-white">Últimos Registros da Campanha</h2>
            </div>
            <Link
              href="/adm/doacoes"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Ver todos →
            </Link>
          </div>

          <div className="divide-y divide-slate-800/60">
            {recentList.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Nenhum apoio registrado ainda.
              </div>
            ) : (
              recentList.map((item) => {
                const badge = supportTypeBadges[item.support_type] || {
                  label: item.support_type,
                  color: "bg-slate-800 text-slate-300 border-slate-700",
                };

                return (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">
                        {item.supporter_type === "organization" ? "🏢" : "👤"}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">
                          {item.donor_name || item.public_display_name || "(Não informado)"}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{formatDate(item.occurred_at)}</span>
                          {item.public_name && (
                            <span className="text-emerald-300 font-medium">• Gratidão Pública</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      {item.support_type === "financial" ? (
                        <span className="font-bold text-emerald-400">
                          {formatCurrency(item.amount_cents)}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[11px] truncate max-w-[140px]" title={item.description || ""}>
                          {item.description || "Apoio não financeiro"}
                        </span>
                      )}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Analytics & Performance Hub (1 col) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <span className="text-base">📈</span>
            <h2 className="text-sm font-bold text-white">Estatísticas & Tráfego</h2>
          </div>

          {/* Status Badge */}
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Vercel Analytics & Speed Insights Ativos</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              A coleta de visitantes reais, acessos por página e Core Web Vitals está em andamento.
            </p>
          </div>

          {/* Privacy & Exclusion rule */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-300 font-medium">
              <span>Filtro de Rotas do ADM</span>
              <span className="text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30">
                Ativo
              </span>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              Todos os acessos administrativos em <code className="text-slate-300">/adm/*</code> são descartados automaticamente pelo filtro <code className="text-slate-300">beforeSend</code> para não contaminar os dados do site público.
            </p>
          </div>

          {/* Future Metrics Roadmap */}
          <div className="text-[11px] text-slate-400 space-y-2 pt-1">
            <span className="font-semibold text-slate-500 text-[10px] uppercase tracking-wider block">
              Métricas Consolidadas no Painel Vercel:
            </span>
            <ul className="space-y-1 list-disc list-inside text-slate-300 text-[11px]">
              <li>Visitantes únicos e visualizações totais</li>
              <li>Origens de tráfego (WhatsApp, Instagram, Direto)</li>
              <li>Dispositivos (Mobile / Desktop)</li>
              <li>Core Web Vitals (LCP, FID/INP, CLS)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
