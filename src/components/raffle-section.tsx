"use client";

import Image from "next/image";
import { contacts, raffleInfo } from "@/data/campaign-content";

export default function RaffleSection() {
  return (
    <div className="soft-panel raffle-panel" id="rifa">
      <div className="raffle-header">
        <div>
          <p className="section-kicker">{raffleInfo.title}</p>
          <h2>Ação entre Amigos pelo Dante</h2>
        </div>
        <span className="status-tag raffle-badge">Em Preparação</span>
      </div>

      <div className="raffle-tv-preview">
        <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-slate-950 border border-white/10 flex items-center justify-center p-2">
          <Image
            src="/Rifa/TV Frente.jpg"
            alt="Smart TV SEMP TCL 43 polegadas - prêmio da Ação entre Amigos pelo Dante"
            fill
            sizes="(max-width: 768px) 100vw, 480px"
            className="object-contain"
          />
        </div>
      </div>

      <div className="raffle-info-grid">
        <div className="raffle-info-pill">
          <span className="raffle-pill-label">Prêmio</span>
          <strong>Smart TV 43&quot; Full HD</strong>
        </div>
        <div className="raffle-info-pill">
          <span className="raffle-pill-label">Modelo</span>
          <strong>SEMP TCL 43S5300</strong>
        </div>
        <div className="raffle-info-pill">
          <span className="raffle-pill-label">Valor do Número</span>
          <strong>R$ 15,00</strong>
        </div>
      </div>

      <div className="raffle-copy">
        {raffleInfo.description.map((paragraph, index) => (
          <p key={index}>{paragraph}</p>
        ))}
      </div>

      <div className="raffle-actions">
        <a
          href="/acao-entre-amigos"
          className="button button-primary raffle-btn"
          style={{ gridColumn: "1 / -1", textAlign: "center", justifyContent: "center" }}
        >
          <span aria-hidden="true">🎟️</span> Escolher meus números na Rifa (R$ 15,00)
        </a>
        <a
          href={contacts.lucas.getRaffleUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-secondary raffle-btn"
        >
          <span aria-hidden="true">💬</span> Falar com Lucas
        </a>
        <a
          href={contacts.evandro.getRaffleUrl()}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-secondary raffle-btn"
        >
          <span aria-hidden="true">💬</span> Falar com Evandro
        </a>
      </div>
    </div>
  );
}
