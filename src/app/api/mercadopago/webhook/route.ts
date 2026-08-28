import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseSignature(value: string | null) {
  const parts = new Map<string, string>();
  for (const part of value?.split(",") || []) {
    const [key, ...rest] = part.trim().split("=");
    if (key && rest.length) parts.set(key, rest.join("="));
  }
  return { timestamp: parts.get("ts") || "", signature: parts.get("v1") || "" };
}

function buildManifest(dataId: string, requestId: string, timestamp: string) {
  const values = [
    dataId ? `id:${dataId}` : "",
    requestId ? `request-id:${requestId}` : "",
    timestamp ? `ts:${timestamp}` : "",
  ].filter(Boolean);
  return `${values.join(";")};`;
}

function isValidSignature(signatureHeader: string | null, requestId: string, dataId: string, secret: string) {
  const { timestamp, signature } = parseSignature(signatureHeader);
  if (!timestamp || !signature || !dataId) return false;
  const manifest = buildManifest(dataId, requestId, timestamp);
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const received = Buffer.from(signature, "hex");
  const calculated = Buffer.from(expected, "hex");
  return received.length === calculated.length && timingSafeEqual(received, calculated);
}

function mapMercadoPagoStatus(mpStatus: string | undefined): "pending" | "approved" | "cancelled" | "refunded" | "rejected" | "charged_back" {
  switch (mpStatus) {
    case "approved":
      return "approved";
    case "refunded":
      return "refunded";
    case "charged_back":
      return "charged_back";
    case "cancelled":
      return "cancelled";
    case "rejected":
      return "rejected";
    case "pending":
    case "in_process":
    case "in_mediation":
    case "authorized":
    default:
      return "pending";
  }
}

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(request: Request) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  const url = new URL(request.url);
  const requestId = request.headers.get("x-request-id") || "";
  const dataId = url.searchParams.get("data.id") || url.searchParams.get("id") || "";
  const body = await request.json().catch(() => ({})) as {
    type?: string;
    action?: string;
    data?: { id?: string };
  };
  const bodyDataId = String(body.data?.id || "");
  const effectiveDataId = dataId || bodyDataId;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Webhook do Mercado Pago não configurado." }, { status: 503 });
    }
    return NextResponse.json({ received: true, verified: false, development: true });
  }

  if (!isValidSignature(request.headers.get("x-signature"), requestId, effectiveDataId, secret)) {
    return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 401 });
  }

  if (body.type !== "payment" && body.action !== "payment.created" && body.action !== "payment.updated") {
    return NextResponse.json({ received: true, verified: true, ignored: true });
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken || !effectiveDataId) {
    return NextResponse.json({ error: "Credenciais ou ID do pagamento ausentes." }, { status: 503 });
  }

  const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(effectiveDataId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!paymentResponse.ok) {
    return NextResponse.json({ error: "Não foi possível consultar o pagamento na API do Mercado Pago." }, { status: 502 });
  }

  const payment = await paymentResponse.json() as {
    id?: number | string;
    status?: string;
    transaction_amount?: number;
    external_reference?: string;
    date_approved?: string;
    date_created?: string;
    metadata?: { campaign?: string; public_name?: boolean | string };
    payer?: { first_name?: string; last_name?: string };
    payment_method_id?: string;
  };

  const paymentId = String(payment.id || effectiveDataId);
  const externalRef = payment.external_reference || "";
  const metadataCampaign = payment.metadata?.campaign;

  // Validar se o pagamento pertence à campanha Dante
  const isDanteCampaign = externalRef.startsWith("dante-") || metadataCampaign === "dante";
  if (!isDanteCampaign) {
    return NextResponse.json({
      received: true,
      verified: true,
      ignored: true,
      reason: "Pagamento não pertence à campanha Dante",
      paymentId,
    });
  }

  const status = mapMercadoPagoStatus(payment.status);
  const amountCents = Math.round(Number(payment.transaction_amount || 0) * 100);

  if (amountCents <= 0) {
    return NextResponse.json({ error: "Valor de pagamento inválido." }, { status: 400 });
  }

  // Nome do pagador seguro (sem documento/email/telefone)
  const firstName = payment.payer?.first_name?.trim() || "";
  const lastName = payment.payer?.last_name?.trim() || "";
  const donorName = `${firstName} ${lastName}`.trim() || null;

  const publicNameConsent = Boolean(payment.metadata?.public_name === true || payment.metadata?.public_name === "true");
  const publicDisplayName = publicNameConsent && firstName ? firstName : null;

  const occurredAt = payment.date_approved || payment.date_created || new Date().toISOString();
  const dedupeKey = `mercado_pago:${paymentId}`;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({
      received: true,
      verified: true,
      persistedToSupabase: false,
      error: "Supabase Service Role não configurado no servidor.",
    }, { status: 500 });
  }

  const { data: rpcResult, error: rpcError } = await supabase.rpc("register_dante_contribution", {
    p_dedupe_key: dedupeKey,
    p_source: "mercado_pago",
    p_amount_cents: amountCents,
    p_status: status,
    p_donor_name: donorName,
    p_public_name: publicNameConsent && Boolean(publicDisplayName),
    p_public_display_name: publicDisplayName,
    p_occurred_at: occurredAt,
    p_provider: "mercado_pago",
    p_provider_payment_id: paymentId,
    p_transaction_id: externalRef || null,
    p_notes: payment.payment_method_id ? `Método: ${payment.payment_method_id}` : null,
  });

  if (rpcError) {
    return NextResponse.json({
      received: true,
      verified: true,
      persistedToSupabase: false,
      error: rpcError.message,
    }, { status: 500 });
  }

  return NextResponse.json({
    received: true,
    verified: true,
    persistedToSupabase: true,
    paymentId,
    status,
    amountCents,
    contribution: rpcResult,
  });
}
