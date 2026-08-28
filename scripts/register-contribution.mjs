#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

function loadEnv() {
  const envPath = path.resolve(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^([^=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

const env = { ...loadEnv(), ...process.env };
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function parseArgs() {
  const args = process.argv.slice(2);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    }
  }
  return flags;
}

function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  const flags = parseArgs();

  let source = flags.source;
  if (!source) {
    console.log("Selecione a origem da contribuição:");
    console.log("1) Pix Direto (pix_direct)");
    console.log("2) Dinheiro (cash)");
    console.log("3) Pagamento Direto à Clínica (clinic_direct)");
    console.log("4) Manual / Outro (manual)");
    const choice = await prompt("Opção [1-4]: ");
    if (choice === "1") source = "pix_direct";
    else if (choice === "2") source = "cash";
    else if (choice === "3") source = "clinic_direct";
    else source = "manual";
  }

  const validSources = ["pix_direct", "cash", "clinic_direct", "manual", "mercado_pago"];
  if (!validSources.includes(source)) {
    console.error(`Erro: Origem inválida '${source}'. Válidas: ${validSources.join(", ")}`);
    process.exit(1);
  }

  const donorName = flags.name || (await prompt("Nome do doador (interno/completo): "));
  const amountStr = flags.amount || (await prompt("Valor da doação em R$ (ex: 50 ou 50.00): "));
  const amountReais = Number(amountStr.replace(",", "."));
  if (!Number.isFinite(amountReais) || amountReais <= 0) {
    console.error("Erro: Valor inválido.");
    process.exit(1);
  }
  const amountCents = Math.round(amountReais * 100);

  const dateStr = flags.date || new Date().toISOString();
  const occurredAt = new Date(dateStr).toISOString();

  let publicDisplayName = flags["public-name"] || null;
  let publicNameConsent = Boolean(publicDisplayName);
  if (!flags["public-name"] && !flags.yes) {
    const optPublic = await prompt("Exibir nome na seção pública de Gratidão? [s/N]: ");
    if (optPublic.toLowerCase() === "s" || optPublic.toLowerCase() === "sim") {
      publicNameConsent = true;
      publicDisplayName = await prompt("Nome a ser exibido na Gratidão (ex: primeiro nome): ");
    }
  }

  const e2e = flags.e2e || flags["end-to-end"] || null;
  const transactionId = flags.transaction || flags["transaction-id"] || null;
  const institution = flags.institution || null;
  const notes = flags.notes || null;

  // Dedupe key generation
  let dedupeKey = flags["dedupe-key"];
  if (!dedupeKey) {
    if (source === "pix_direct" && e2e) {
      dedupeKey = `pix:${e2e}`;
    } else if (source === "pix_direct" && transactionId) {
      dedupeKey = `pix_tx:${transactionId}`;
    } else if (source === "cash") {
      dedupeKey = `cash:${crypto.randomUUID()}`;
    } else if (source === "clinic_direct") {
      dedupeKey = `clinic:${crypto.randomUUID()}`;
    } else {
      dedupeKey = `manual:${crypto.randomUUID()}`;
    }
  }

  console.log("\n========================================");
  console.log("RESUMO DA CONTRIBUIÇÃO A REGISTRAR");
  console.log("========================================");
  console.log(`Origem:           ${source}`);
  console.log(`Doador:           ${donorName || "(não informado)"}`);
  console.log(`Valor:            R$ ${amountReais.toFixed(2)} (${amountCents} centavos)`);
  console.log(`Data:             ${occurredAt}`);
  console.log(`Nome Público:     ${publicNameConsent ? publicDisplayName : "(Não exibir publicamente)"}`);
  console.log(`Dedupe Key:       ${dedupeKey}`);
  if (e2e) console.log(`Pix E2E ID:       ${e2e}`);
  if (transactionId) console.log(`ID Transação:     ${transactionId}`);
  if (institution) console.log(`Instituição:      ${institution}`);
  if (notes) console.log(`Observações:      ${notes}`);
  console.log("========================================\n");

  if (!flags.yes) {
    const confirm = await prompt("Confirmar gravação no banco Supabase? [s/N]: ");
    if (confirm.toLowerCase() !== "s" && confirm.toLowerCase() !== "sim") {
      console.log("Operação cancelada pelo usuário.");
      process.exit(0);
    }
  }

  console.log("Gravando contribuição...");
  const { data, error } = await supabase.rpc("register_dante_contribution", {
    p_dedupe_key: dedupeKey,
    p_source: source,
    p_amount_cents: amountCents,
    p_status: "approved",
    p_donor_name: donorName || null,
    p_public_name: publicNameConsent && Boolean(publicDisplayName),
    p_public_display_name: publicDisplayName || null,
    p_occurred_at: occurredAt,
    p_provider: source === "pix_direct" ? "pix" : null,
    p_pix_end_to_end_id: e2e,
    p_transaction_id: transactionId,
    p_institution: institution,
    p_notes: notes,
  });

  if (error) {
    console.error("Erro ao registrar contribuição:", error.message);
    process.exit(1);
  }

  console.log("\n Contribuição registrada com sucesso!");
  console.log("ID da contribuição:", data.id);
  console.log("Status:", data.status);
  console.log("Novo total confirmado da campanha:", `R$ ${(data.confirmed_cents / 100).toFixed(2)}`);
}

main().catch((err) => {
  console.error("Erro fatal:", err);
  process.exit(1);
});
