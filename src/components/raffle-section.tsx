"use client";

import { contacts, raffleInfo } from "@/data/campaign-content";

export default function RaffleSection() {
  return (
    <div className="soft-panel raffle-panel" id="rifa">
      <div className="raffle-header">
        <div>
          <p className="section-kicker">{raffleInfo.title}</p>
          <h2>{raffleInfo.heading}</h2>
        </div>
        <span className="status-tag raffle-badge">{raffleInfo.badge}</span>
      </div>

      <div className="raffle-tv-preview">
        <div className="raffle-tv-screen" aria-hidden="true">
          <svg
            className="raffle-tv-icon"
            viewBox="0 0 24 24"
            width="48"
            height="48"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
            <polyline points="17 2 12 7 7 2" />
          </svg>
          <span className="raffle-tv-label">Foto do prêmio em breve</span>
        </div>
      </div>

      <div className="raffle-info-grid">
        <div className="raffle-info-pill">
          <span className="raffle-pill-label">Prêmio</span>
          <strong>TV</strong>
        </div>
        <div className="raffle-info-pill">
          <span className="raffle-pill-label">Status</span>
          <strong>Em preparação</strong>
        </div>
        <div className="raffle-info-pill">
          <span className="raffle-pill-label">Detalhes</span>
          <strong>Em breve</strong>
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
