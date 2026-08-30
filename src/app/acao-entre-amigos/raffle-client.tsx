"use client";

import { useState, useEffect, useTransition, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PublicNumberState,
  reserveRaffleNumbers,
  markRaffleProofSent,
  getRafflePublicState,
} from "./actions";

interface RaffleClientProps {
  initialNumbers: PublicNumberState[];
  priceCents: number;
  raffleStatus?: "draft" | "active" | "finished" | "cancelled";
}

interface ActiveOrder {
  orderCode: string;
  token: string;
  totalCents: number;
  quantity: number;
  numbers: number[];
  expiresAt: string;
  pixPayload: string;
  pixQrCode: string;
  whatsappUrl: string;
  status: "reserved" | "awaiting_confirmation";
}

export default function RaffleClient({
  initialNumbers,
  priceCents,
  raffleStatus = "draft",
}: RaffleClientProps) {
  const [currentStatus, setCurrentStatus] = useState(raffleStatus);
  const [numbers, setNumbers] = useState<PublicNumberState[]>(initialNumbers);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [consent, setConsent] = useState(true);
  const [step, setStep] = useState<"grid" | "form" | "checkout">("grid");
  const [activeOrder, setActiveOrder] = useState<ActiveOrder | null>(null);
  const [copied, setCopied] = useState(false);
  const [proofSentSuccess, setProofSentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Polling periodically for updated public numbers state
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await getRafflePublicState();
      if (res.success && res.numbers.length > 0) {
        setNumbers(res.numbers);
        if (res.raffleStatus) setCurrentStatus(res.raffleStatus);
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  const stats = useMemo(() => {
    let paid = 0;
    let awaiting = 0;
    let reserved = 0;
    let available = 0;

    for (const n of numbers) {
      if (n.visual_status === "paid") paid++;
      else if (n.visual_status === "awaiting_confirmation") awaiting++;
      else if (n.visual_status === "reserved") reserved++;
      else available++;
    }

    return { paid, awaiting, reserved, available };
  }, [numbers]);

  const toggleNumber = (num: number, status: string) => {
    if (currentStatus !== "active") {
      setErrorMessage("A Ação entre Amigos está em preparação. As reservas serão abertas em breve.");
      return;
    }
    if (status !== "available") return;

    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(selectedNumbers.filter((n) => n !== num));
    } else {
      if (selectedNumbers.length >= 10) {
        setErrorMessage("O limite máximo por pedido é de 10 números.");
        return;
      }
      setErrorMessage(null);
      setSelectedNumbers([...selectedNumbers, num].sort((a, b) => a - b));
    }
  };

  const handlePhoneChange = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 11);
    let formatted = digits;
    if (digits.length > 2) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    if (digits.length > 7) {
      formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }
    setCustomerWhatsapp(formatted);
  };

  const handleStartReservation = () => {
    if (selectedNumbers.length === 0) return;
    setErrorMessage(null);
    setStep("form");
  };

  const handleConfirmReservation = () => {
    if (!customerName.trim()) {
      setErrorMessage("Por favor, preencha seu nome completo.");
      return;
    }
    const rawPhone = customerWhatsapp.replace(/\D/g, "");
    if (rawPhone.length < 10) {
      setErrorMessage("Por favor, preencha um WhatsApp válido com DDD.");
      return;
    }
    if (!consent) {
      setErrorMessage("Você precisa concordar com os termos de conferência do pagamento.");
      return;
    }

    setErrorMessage(null);
    startTransition(async () => {
      const res = await reserveRaffleNumbers({
        numbers: selectedNumbers,
        customerName: customerName.trim(),
        customerWhatsapp: rawPhone,
      });

      if (!res.success || !res.orderCode || !res.token) {
        setErrorMessage(res.error || "Não foi possível reservar os números selecionados.");
        // Refresh grid state in case another user took one of the numbers
        const updated = await getRafflePublicState();
        if (updated.success) setNumbers(updated.numbers);
        return;
      }

      setActiveOrder({
        orderCode: res.orderCode,
        token: res.token,
        totalCents: res.totalCents!,
        quantity: res.quantity!,
        numbers: res.numbers!,
        expiresAt: res.expiresAt!,
        pixPayload: res.pixPayload!,
        pixQrCode: res.pixQrCode!,
        whatsappUrl: res.whatsappUrl!,
        status: "reserved",
      });

      setStep("checkout");
      // Refresh numbers
      const updated = await getRafflePublicState();
      if (updated.success) setNumbers(updated.numbers);
    });
  };

  const handleCopyPix = () => {
    if (!activeOrder?.pixPayload) return;
    navigator.clipboard.writeText(activeOrder.pixPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleMarkProofSent = () => {
    if (!activeOrder) return;
    startTransition(async () => {
      const res = await markRaffleProofSent({
        orderCode: activeOrder.orderCode,
        token: activeOrder.token,
      });

      if (res.success) {
        setActiveOrder((prev) => (prev ? { ...prev, status: "awaiting_confirmation" } : null));
        setProofSentSuccess(true);
      } else {
        setErrorMessage(res.error || "Não foi possível atualizar o status do pedido.");
      }
    });
  };

  const totalSelectedCents = selectedNumbers.length * priceCents;

  const formatCents = (cents: number) => {
    return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 selection:bg-amber-500/30 selection:text-amber-200">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#070b14]/80 border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition"
          >
            <span className="text-amber-400">←</span> Voltar para a Campanha do Dante
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              100 Números • R$ 15,00 cada
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center justify-between animate-in fade-in">
            <span>{errorMessage}</span>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-bold underline ml-4 hover:opacity-80"
            >
              Fechar
            </button>
          </div>
        )}

        {/* HERO SECTION */}
        {step === "grid" && (
          <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-white/[0.05] to-transparent border border-white/10 p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <div className="md:col-span-7 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
                  <span>📺</span> Ação entre Amigos • Rifa Solidária
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  Ajude o Dante e Concorra a uma{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">
                    Smart TV SEMP 43&quot;
                  </span>
                </h1>

                <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                  Toda a arrecadação desta rifa é destinada exclusivamente ao tratamento médico,
                  medicamentos e cirurgias do cãozinho Dante. São apenas 100 números disponíveis!
                </p>

                {/* Prize Specs Pills */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
                    📺 43 Polegadas Full HD
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
                    🏷️ Modelo: 43S5300
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-slate-300">
                    ⚡ Smart TV com Wi-Fi
                  </span>
                </div>

                {/* Progress bar */}
                <div className="space-y-1.5 pt-2">
                  <div className="flex justify-between text-xs text-slate-400 font-medium">
                    <span>
                      {stats.paid} de 100 vendidos ({((stats.paid / 100) * 100).toFixed(0)}%)
                    </span>
                    <span>{stats.available} disponíveis</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
                      style={{ width: `${stats.paid}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="md:col-span-5 flex flex-col items-center">
                {/* Visual TV Frame with Real Photo */}
                <div className="w-full max-w-[320px] rounded-2xl bg-black/60 border border-white/15 p-3 shadow-2xl relative group">
                  <div className="aspect-video rounded-xl bg-slate-900 overflow-hidden relative border border-white/10 flex items-center justify-center">
                    <Image
                      src="/Rifa/TV Frente.png"
                      alt="Smart TV SEMP TCL 43 polegadas Modelo 43S5300"
                      fill
                      sizes="(max-width: 768px) 100vw, 320px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      priority
                    />
                  </div>
                  <div className="mt-3 flex items-center justify-between px-1">
                    <div>
                      <span className="text-white text-xs font-bold block">Smart TV SEMP 43&quot;</span>
                      <span className="text-[11px] text-slate-400">Modelo: 43S5300 Full HD</span>
                    </div>
                    <span className="text-lg font-extrabold text-amber-400">R$ 15,00</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* STEP 1: NUMBERS GRID */}
        {step === "grid" && (
          <section className="space-y-6">
            {/* Persistent Draft Notice Banner */}
            {currentStatus === "draft" && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 flex items-start sm:items-center gap-3 animate-in fade-in duration-300">
                <span className="text-2xl">⏳</span>
                <div>
                  <h3 className="text-sm font-bold text-amber-300">
                    Ação entre Amigos em preparação
                  </h3>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    Esta ação solidária será aberta em breve para reservas e compras de números.
                    Confira o prêmio e os números abaixo!
                  </p>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Escolha seus números da sorte
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  {currentStatus === "active"
                    ? "Clique para selecionar. Você pode escolher até 10 números por pedido."
                    : "Ação em preparação. A escolha e reserva de números será liberada em breve."}
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-white/5 border border-white/20" />
                  <span className="text-slate-400">Disponível</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-amber-500 border border-amber-400" />
                  <span className="text-amber-300 font-bold">Selecionado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-blue-500/20 border border-blue-500/40" />
                  <span className="text-blue-300">Reservado</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700 opacity-60" />
                  <span className="text-slate-500">Vendido</span>
                </div>
              </div>
            </div>

            {/* 001 - 100 Grid */}
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 md:gap-2.5">
              {numbers.map((item) => {
                const isSelected = selectedNumbers.includes(item.number);
                const isAvailable = item.visual_status === "available";
                const isPaid = item.visual_status === "paid";
                const isAwaiting = item.visual_status === "awaiting_confirmation";
                const isReserved = item.visual_status === "reserved";

                let btnClasses =
                  "aspect-square rounded-xl flex flex-col items-center justify-center font-mono text-xs md:text-sm font-bold transition-all relative select-none ";

                if (isSelected) {
                  btnClasses +=
                    "bg-gradient-to-b from-amber-400 to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 scale-95 ring-2 ring-amber-300 ";
                } else if (isPaid) {
                  btnClasses +=
                    "bg-slate-900/60 border border-white/5 text-slate-600 cursor-not-allowed line-through ";
                } else if (isAwaiting) {
                  btnClasses +=
                    "bg-amber-500/10 border border-amber-500/30 text-amber-500/70 cursor-not-allowed ";
                } else if (isReserved) {
                  btnClasses +=
                    "bg-blue-500/10 border border-blue-500/30 text-blue-400/70 cursor-not-allowed ";
                } else {
                  btnClasses +=
                    "bg-white/[0.04] hover:bg-white/[0.12] border border-white/10 hover:border-amber-400/60 text-slate-200 hover:text-white cursor-pointer active:scale-95 ";
                }

                return (
                  <button
                    key={item.number}
                    onClick={() => toggleNumber(item.number, item.visual_status)}
                    disabled={!isAvailable}
                    className={btnClasses}
                    title={
                      isSelected
                        ? "Selecionado"
                        : isPaid
                        ? "Vendido"
                        : isAwaiting
                        ? "Aguardando confirmação de pagamento"
                        : isReserved
                        ? "Reservado temporariamente"
                        : "Clique para escolher"
                    }
                  >
                    <span>{item.number.toString().padStart(3, "0")}</span>
                    {isSelected && <span className="text-[9px] font-extrabold leading-none">✓</span>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* FLOATING ACTION BAR FOR STEP 1 */}
        {step === "grid" && selectedNumbers.length > 0 && (
          <div className="fixed bottom-4 left-4 right-4 max-w-xl mx-auto z-40 animate-in slide-in-from-bottom duration-300">
            <div className="p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md border border-amber-500/40 shadow-2xl flex items-center justify-between gap-4">
              <div>
                <span className="text-xs text-slate-400">
                  {selectedNumbers.length}{" "}
                  {selectedNumbers.length === 1 ? "número escolhido" : "números escolhidos"}:
                </span>
                <div className="text-lg font-extrabold text-white">
                  {formatCents(totalSelectedCents)}
                </div>
                <div className="text-[11px] font-mono text-amber-300 truncate max-w-[200px]">
                  {selectedNumbers.map((n) => n.toString().padStart(3, "0")).join(", ")}
                </div>
              </div>

              <button
                onClick={handleStartReservation}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition active:scale-95 whitespace-nowrap"
              >
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: PARTICIPANT FORM MODAL / SECTION */}
        {step === "form" && (
          <section className="max-w-lg mx-auto rounded-3xl bg-slate-900 border border-white/10 p-6 md:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div>
              <button
                onClick={() => setStep("grid")}
                className="text-xs text-slate-400 hover:text-white mb-3 inline-flex items-center gap-1"
              >
                ← Alterar números
              </button>
              <h2 className="text-2xl font-bold text-white tracking-tight">Seus Dados</h2>
              <p className="text-xs text-slate-400 mt-1">
                Informe seus dados para identificarmos seu pagamento e entrarmos em contato para a
                entrega do prêmio.
              </p>
            </div>

            {/* Selected Summary Pill */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Números Escolhidos:</span>
                <span className="font-mono font-bold text-amber-300">
                  {selectedNumbers.map((n) => n.toString().padStart(3, "0")).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400 font-medium">Valor Total:</span>
                <span className="font-extrabold text-white">
                  {formatCents(totalSelectedCents)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  WhatsApp com DDD *
                </label>
                <input
                  type="tel"
                  value={customerWhatsapp}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="(14) 98802-5296"
                  className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/15 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="consentCheck"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 rounded border-white/20 bg-black/40 text-amber-500 focus:ring-amber-500"
                />
                <label htmlFor="consentCheck" className="text-xs text-slate-300 leading-snug">
                  Estou ciente de que os números serão confirmados após a conferência do comprovante
                  Pix enviado pelo WhatsApp.
                </label>
              </div>
            </div>

            <button
              onClick={handleConfirmReservation}
              disabled={isPending}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/25 transition active:scale-95 disabled:opacity-50"
            >
              {isPending ? "Reservando Números..." : "Reservar Números e Gerar Pix"}
            </button>
          </section>
        )}

        {/* STEP 3: CHECKOUT PIX & WHATSAPP */}
        {step === "checkout" && activeOrder && (
          <section className="max-w-xl mx-auto rounded-3xl bg-slate-900 border border-amber-500/30 p-6 md:p-8 space-y-6 animate-in zoom-in-95 duration-200">
            {/* Header / Success Badge */}
            <div className="text-center space-y-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                ✓ Reserva Realizada com Sucesso
              </span>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Pague via Pix e Envie o Comprovante
              </h2>
              <p className="text-xs text-slate-400">
                Seus números estão reservados por 30 minutos. Conclua o pagamento e envie o
                comprovante pelo WhatsApp para validação.
              </p>
            </div>

            {/* Order Details Box */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Identificador do Pedido:</span>
                <span className="font-mono font-extrabold text-white text-sm">
                  {activeOrder.orderCode}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Participante:</span>
                <span className="font-medium text-white">{customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Números:</span>
                <span className="font-mono font-bold text-amber-300">
                  {activeOrder.numbers.map((n) => n.toString().padStart(3, "0")).join(", ")}
                </span>
              </div>
              <div className="flex justify-between text-sm pt-1 border-t border-white/5">
                <span className="text-slate-300 font-medium">Valor Total:</span>
                <span className="font-extrabold text-emerald-400">
                  {formatCents(activeOrder.totalCents)}
                </span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white text-slate-950 space-y-3">
              {activeOrder.pixQrCode && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activeOrder.pixQrCode}
                  alt="QR Code Pix"
                  className="w-56 h-56 rounded-lg"
                />
              )}
              <span className="text-xs font-semibold text-slate-700">
                Abra o app do seu banco e escaneie o QR Code
              </span>
            </div>

            {/* Pix Copia e Cola */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Ou use o Pix Copia e Cola:
              </label>
              <div className="relative">
                <input
                  type="text"
                  readOnly
                  value={activeOrder.pixPayload}
                  className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-slate-300 pr-24 select-all focus:outline-none"
                />
                <button
                  onClick={handleCopyPix}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition"
                >
                  {copied ? "Copiado!" : "Copiar Pix"}
                </button>
              </div>
            </div>

            {/* Primary Action: Send to WhatsApp */}
            <div className="space-y-3 pt-2">
              <a
                href={activeOrder.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-emerald-500/25 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.694.067-2.023-.483-1.696-.703-2.775-2.434-2.86-2.546-.084-.112-.684-.912-.684-1.739 0-.828.432-1.233.586-1.391.154-.157.337-.197.45-.197.113 0 .225.001.324.006.104.005.244-.04.382.291.144.347.491 1.2.534 1.288.043.088.072.19.014.303-.058.113-.088.184-.174.285-.087.102-.183.228-.261.306-.088.087-.179.182-.077.357.102.174.453.748.972 1.211.669.596 1.233.78 1.408.868.174.087.277.073.379-.044.103-.117.437-.51.554-.685.116-.175.234-.146.393-.088.16.059 1.01.476 1.183.563.174.088.29.131.334.204.043.073.043.424-.101.829z" />
                </svg>
                Enviar Comprovante pelo WhatsApp
              </a>

              {/* Mark Proof Sent Button */}
              {activeOrder.status !== "awaiting_confirmation" ? (
                <button
                  onClick={handleMarkProofSent}
                  disabled={isPending}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition"
                >
                  {isPending ? "Atualizando..." : "Já enviei meu comprovante"}
                </button>
              ) : (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center text-xs text-amber-300 font-medium">
                  {proofSentSuccess
                    ? "✓ Comprovante registrado! O prazo foi estendido para conferência administrativa."
                    : "Aguardando conferência do comprovante pela equipe do Dante."}
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
