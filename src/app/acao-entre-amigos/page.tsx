import type { Metadata } from "next";
import { getRafflePublicState } from "./actions";
import RaffleClient from "./raffle-client";

export const metadata: Metadata = {
  title: "Ação entre Amigos • Rifa da Smart TV 43\" | Ajude o Dante",
  description:
    "Participe da Ação entre Amigos do cãozinho Dante e concorra a uma Smart TV SEMP TCL 43\" Full HD. Apenas 100 números de R$ 15,00. Toda a arrecadação é revertida para o tratamento do Dante.",
};

export const dynamic = "force-dynamic";

export default async function AcaoEntreAmigosPublicPage() {
  const { numbers, priceCents, raffleStatus } = await getRafflePublicState();

  return (
    <RaffleClient
      initialNumbers={numbers}
      priceCents={priceCents}
      raffleStatus={raffleStatus}
    />
  );
}
