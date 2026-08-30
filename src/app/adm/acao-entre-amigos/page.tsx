import { fetchRaffleAdminData } from "./actions";
import RaffleManager from "./raffle-manager";

export const dynamic = "force-dynamic";

export default async function AcaoEntreAmigosPage() {
  const { metrics, reservations, numbers, error } = await fetchRaffleAdminData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Ação entre Amigos — Rifa da TV
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Gestão dos 100 números, conferência de comprovantes e confirmação de pagamentos Pix.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            Prêmio: Smart TV SEMP TCL 43&quot;
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      <RaffleManager
        initialMetrics={metrics}
        initialReservations={reservations}
        initialNumbers={numbers}
      />
    </div>
  );
}
