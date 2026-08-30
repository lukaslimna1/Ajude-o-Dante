"use server";

import crypto from "node:crypto";
import QRCode from "qrcode";
import { createClient } from "@supabase/supabase-js";
import { generatePixBrcode, sanitizePixKey, normalizeEmvText } from "@/lib/pix/brcode";

// In-memory rate limiting map for reservations (IP -> timestamps array) - Best-effort defense layer
const ipRateLimitMap = new Map<string, number[]>();

function checkRateLimit(ip: string, maxAttempts = 5, windowMs = 60_000): boolean {
  const now = Date.now();
  const timestamps = (ipRateLimitMap.get(ip) || []).filter((t) => now - t < windowMs);

  if (timestamps.length >= maxAttempts) {
    ipRateLimitMap.set(ip, timestamps);
    return false;
  }

  timestamps.push(now);
  ipRateLimitMap.set(ip, timestamps);
  return true;
}

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Configuração do Supabase ausente no ambiente do servidor.");
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

function generateOrderCode(): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // Sem 0/O, 1/I para evitar confusão visual
  const randomBytes = crypto.randomBytes(5);
  let code = "DANTE-";
  for (let i = 0; i < 5; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export interface PublicNumberState {
  number: number;
  visual_status: "available" | "reserved" | "awaiting_confirmation" | "paid";
}

export async function getRafflePublicState(): Promise<{
  success: boolean;
  raffleStatus: "draft" | "active" | "finished" | "cancelled";
  numbers: PublicNumberState[];
  priceCents: number;
  totalNumbers: number;
  error?: string;
}> {
  try {
    const supabase = getServiceRoleClient();
    const { data: raffle } = await supabase
      .from("dante_raffle")
      .select("status, number_price_cents, total_numbers")
      .eq("id", "main")
      .single();

    const { data, error } = await supabase.rpc("get_dante_raffle_public_state", {
      p_raffle_id: "main",
    });

    if (error) {
      return {
        success: false,
        raffleStatus: "draft",
        numbers: [],
        priceCents: 1500,
        totalNumbers: 100,
        error: error.message,
      };
    }

    return {
      success: true,
      raffleStatus:
        (raffle?.status as "draft" | "active" | "finished" | "cancelled") || "draft",
      numbers: (data || []) as PublicNumberState[],
      priceCents: raffle?.number_price_cents ? Number(raffle.number_price_cents) : 1500,
      totalNumbers: raffle?.total_numbers ? Number(raffle.total_numbers) : 100,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro ao consultar disponibilidade dos números.";
    return {
      success: false,
      raffleStatus: "draft",
      numbers: [],
      priceCents: 1500,
      totalNumbers: 100,
      error: errorMsg,
    };
  }
}

export interface ReserveRaffleInput {
  numbers: number[];
  customerName: string;
  customerWhatsapp: string;
  clientIp?: string;
}

export interface ReserveRaffleResult {
  success: boolean;
  orderCode?: string;
  token?: string;
  totalCents?: number;
  quantity?: number;
  numbers?: number[];
  expiresAt?: string;
  pixPayload?: string;
  pixQrCode?: string;
  whatsappUrl?: string;
  error?: string;
}

export async function reserveRaffleNumbers({
  numbers,
  customerName,
  customerWhatsapp,
  clientIp = "default",
}: ReserveRaffleInput): Promise<ReserveRaffleResult> {
  try {
    // 1. Rate limiting em memória (camada auxiliar)
    if (!checkRateLimit(clientIp, 5, 60_000)) {
      return {
        success: false,
        error: "Muitas tentativas de reserva em sequência. Por favor, aguarde um minuto.",
      };
    }

    // 2. Validações de entrada
    if (!numbers || !Array.isArray(numbers) || numbers.length === 0) {
      return { success: false, error: "Nenhum número selecionado." };
    }

    if (numbers.length > 10) {
      return { success: false, error: "O limite máximo é de 10 números por pedido." };
    }

    const uniqueNumbers = Array.from(new Set(numbers));
    if (uniqueNumbers.length !== numbers.length) {
      return { success: false, error: "Números duplicados na seleção." };
    }

    for (const n of numbers) {
      if (typeof n !== "number" || n < 1 || n > 100) {
        return { success: false, error: `Número inválido: ${n}. Escolha entre 1 e 100.` };
      }
    }

    const sanitizedName = customerName.trim();
    if (sanitizedName.length < 3) {
      return { success: false, error: "Informe seu nome completo." };
    }

    const rawWhatsapp = normalizePhone(customerWhatsapp);
    if (rawWhatsapp.length < 10 || rawWhatsapp.length > 11) {
      return {
        success: false,
        error: "Informe um número de WhatsApp válido com DDD (ex: 14 98802-5296).",
      };
    }

    const supabase = getServiceRoleClient();

    // 3. Gerar identificador e token secreto (128 bits) com hash seguro
    const orderCode = generateOrderCode();
    const rawToken = crypto.randomBytes(16).toString("hex");
    const tokenHash = hashToken(rawToken);

    // 4. Chamar RPC transacional com bloqueio pessimista e regras de banco
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "reserve_dante_raffle_numbers",
      {
        p_raffle_id: "main",
        p_numbers: uniqueNumbers,
        p_customer_name: sanitizedName,
        p_customer_whatsapp: rawWhatsapp,
        p_order_code: orderCode,
        p_reservation_token_hash: tokenHash,
      }
    );

    if (rpcError) {
      return { success: false, error: rpcError.message };
    }

    if (!rpcResult || !rpcResult.success) {
      return {
        success: false,
        error: rpcResult?.error || "Não foi possível reservar os números.",
      };
    }

    const totalCents = Number(rpcResult.total_cents);
    // Configuração com chave internacional +55 e Merchant Name dentro do limite de 25 caracteres
    const rawPixKey = process.env.RAFFLE_PIX_KEY || "+5514988025296";
    const pixKey = sanitizePixKey(rawPixKey);
    const pixReceiver = normalizeEmvText(
      process.env.RAFFLE_PIX_RECEIVER_NAME || "LUCAS M S LIMA",
      25
    );
    const pixCity = normalizeEmvText(process.env.RAFFLE_PIX_RECEIVER_CITY || "BAURU", 15);

    // 5. Gerar Pix BR Code
    const pixPayload = generatePixBrcode({
      key: pixKey,
      receiverName: pixReceiver,
      receiverCity: pixCity,
      amountCents: totalCents,
      txId: orderCode.replace(/[^a-zA-Z0-9]/g, ""),
    });

    // 6. Gerar QR Code DataURL
    const pixQrCode = await QRCode.toDataURL(pixPayload, {
      margin: 1,
      width: 280,
      color: {
        dark: "#0b1329",
        light: "#ffffff",
      },
    });

    // 7. Formatar link do WhatsApp do projeto
    const formattedNumbers = uniqueNumbers.map((n) => n.toString().padStart(3, "0")).join(", ");
    const totalFormatted = (totalCents / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

    const projectWhatsapp = "5514988025296";
    const whatsappMessage = `Olá! Acabei de realizar o pagamento da Ação entre Amigos pelo Dante 🐾💚\n\n👤 Nome: ${sanitizedName}\n🎟️ Pedido: ${orderCode}\n🔢 Número(s): ${formattedNumbers}\n💰 Valor: ${totalFormatted}\n\n📎 Vou anexar o comprovante de pagamento nesta conversa para conferência.\n\nAguardo a confirmação dos meus números. Obrigado por ajudar o Dante! 💚`;
    const whatsappUrl = `https://wa.me/${projectWhatsapp}?text=${encodeURIComponent(
      whatsappMessage
    )}`;

    return {
      success: true,
      orderCode,
      token: rawToken, // Entregue ao usuário para autorizar suas operações
      totalCents,
      quantity: uniqueNumbers.length,
      numbers: uniqueNumbers,
      expiresAt: rpcResult.expires_at,
      pixPayload,
      pixQrCode,
      whatsappUrl,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro inesperado ao realizar reserva.";
    return {
      success: false,
      error: errorMsg,
    };
  }
}

export async function markRaffleProofSent({
  orderCode,
  token,
}: {
  orderCode: string;
  token: string;
}): Promise<{ success: boolean; error?: string; status?: string }> {
  try {
    if (!orderCode || !token) {
      return { success: false, error: "Identificadores da reserva ausentes." };
    }

    const tokenHash = hashToken(token.trim());
    const supabase = getServiceRoleClient();
    const { data, error } = await supabase.rpc("mark_dante_raffle_proof_sent", {
      p_order_code: orderCode.trim(),
      p_reservation_token_hash: tokenHash,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: Boolean(data?.success),
      status: data?.status,
      error: data?.error,
    };
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Erro ao registrar envio de comprovante.";
    return { success: false, error: errorMsg };
  }
}
