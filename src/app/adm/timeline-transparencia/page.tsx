import Link from "next/link";

export default function TimelineModulePlaceholder() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Timeline e Transparência</h1>
        <p className="text-sm text-slate-400 mt-1">
          Módulo em preparação para gerenciamento de boletins médicos, notas fiscais e atualizações da recuperação do Dante.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-8 text-center max-w-xl mx-auto my-12">
        <div className="text-4xl mb-4">📝</div>
        <h2 className="text-lg font-semibold text-white mb-2">Módulo 3 — Em Breve</h2>
        <p className="text-sm text-slate-400 leading-relaxed mb-6">
          Este módulo está reservado para publicação de novos eventos na linha do tempo pública, prestação de contas, laudos veterinários e documentos comprobatórios.
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
