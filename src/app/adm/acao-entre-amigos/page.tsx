import Link from "next/link";

export default function RaffleModulePlaceholder() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Ação entre Amigos (Rifa)</h1>
        <p className="text-sm text-slate-400 mt-1">
          Módulo em preparação para gerenciamento e controle de números da rifa solidária da TV.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center max-w-xl mx-auto my-12">
        <div className="text-4xl mb-4">🎟️</div>
        <h2 className="text-lg font-semibold text-white mb-2">Módulo 2 — Em Breve</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          Este módulo está reservado para a gestão de compradores, números escolhidos, reservas via WhatsApp/Pix e confirmação de participação.
        </p>
        <Link
          href="/adm/doacoes"
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/30 transition-colors"
        >
          <span>🐾</span> Ir para Doações e Apoios
        </Link>
      </div>
    </div>
  );
}
