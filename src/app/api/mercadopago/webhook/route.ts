import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim();
  const url = new URL(request.url);
  const requestId = request.headers.get("x-request-id") || "";
  const dataId = url.searchParams.get("data.id") || url.searchParams.get("id") || "";
  const body = await request.json().catch(() => ({})) as { type?: string; action?: string; data?: { id?: string } };
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
  if (!paymentResponse.ok) return NextResponse.json({ error: "Não foi possível confirmar o pagamento." }, { status: 502 });

  const payment = await paymentResponse.json() as {
    id?: number | string;
    status?: string;
    transaction_amount?: number;
    external_reference?: string;
  };

  // A gravação automática fica deliberadamente bloqueada até existir uma tabela
  // de pagamentos com idempotência aprovada no Supabase. Nunca somar valores
  // diretamente em dante_campaign a partir de um webhook duplicado.
  return NextResponse.json({
    received: true,
    verified: true,
    paymentId: payment.id || effectiveDataId,
    status: payment.status || "unknown",
    amount: payment.transaction_amount || null,
    externalReference: payment.external_reference || null,
    persistedToSupabase: false,
  });
}
