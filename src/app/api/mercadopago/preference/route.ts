import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_DONATION_REAIS = 3500;
const MIN_DONATION_REAIS = 0.01;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function getPublicSiteUrl() {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://ajudeodante.vercel.app";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") throw new Error("A URL pública precisa usar HTTPS.");
    return url.origin;
  } catch {
    throw new Error("NEXT_PUBLIC_SITE_URL inválida.");
  }
}

export async function POST(request: Request) {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN?.trim();
  if (!accessToken) return jsonError("Mercado Pago ainda não está configurado no servidor.", 503);

  let body: { amount?: unknown; publicName?: unknown };
  try {
    body = await request.json();
  } catch {
    return jsonError("Envie um valor válido para a doação.", 400);
  }

  const amount = typeof body.amount === "number" ? body.amount : Number(body.amount);
  if (!Number.isFinite(amount) || amount < MIN_DONATION_REAIS || amount > MAX_DONATION_REAIS) {
    return jsonError(`Informe uma doação entre R$ ${MIN_DONATION_REAIS.toFixed(2).replace(".", ",")} e R$ ${MAX_DONATION_REAIS.toFixed(2).replace(".", ",")}.`, 400);
  }

  let siteUrl: string;
  try {
    siteUrl = getPublicSiteUrl();
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "URL pública inválida.", 500);
  }

  const webhookUrl = process.env.MERCADOPAGO_WEBHOOK_URL?.trim() || `${siteUrl}/api/mercadopago/webhook`;
  try {
    const parsedWebhookUrl = new URL(webhookUrl);
    if (parsedWebhookUrl.protocol !== "https:") return jsonError("MERCADOPAGO_WEBHOOK_URL precisa usar HTTPS.", 500);
  } catch {
    return jsonError("MERCADOPAGO_WEBHOOK_URL inválida.", 500);
  }

  const publicName = Boolean(body.publicName);

  const externalReference = `dante-${crypto.randomUUID()}`;
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      items: [{
        id: "dante-donation",
        title: "Doação para o Dante",
        description: "Contribuição para cirurgia, internação, medicamentos e recuperação do Dante.",
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(amount.toFixed(2)),
      }],
      external_reference: externalReference,
      notification_url: webhookUrl,
      back_urls: {
        success: `${siteUrl}/?donation=success`,
        failure: `${siteUrl}/?donation=failure`,
        pending: `${siteUrl}/?donation=pending`,
      },
      auto_return: "approved",
      metadata: {
        campaign: "dante",
        public_name: publicName,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    return jsonError("O Mercado Pago não conseguiu criar o checkout agora.", response.status >= 500 ? 502 : 400);
  }

  const preference = await response.json() as { id?: string; init_point?: string; sandbox_init_point?: string };
  const checkoutUrl = preference.init_point || preference.sandbox_init_point;
  if (!checkoutUrl) return jsonError("O Mercado Pago não retornou uma URL de checkout.", 502);

  return NextResponse.json({ checkoutUrl, preferenceId: preference.id, externalReference });
}
