import { createClient } from "@supabase/supabase-js";
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
  console.error("Erro: Credenciais do Supabase ausentes no .env");
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const batch = [
  {
    donor_name: "Guilherme Lima de Souza",
    amount_cents: 2000,
    occurred_at: "2026-08-28T20:03:00-03:00",
    source: "pix_direct",
    status: "approved",
    pix_end_to_end_id: "E18236120202608282303s11d22d5553",
    transaction_id: "B3381N0EVFFP85WFA",
    institution: "Nu Pagamentos S.A",
    public_name: true,
    public_display_name: "Guilherme",
    dedupe_key: "pix:E18236120202608282303s11d22d5553",
  },
  {
    donor_name: "Gislaine Pereira do Nascimento",
    amount_cents: 2200,
    occurred_at: "2026-08-28T19:53:00-03:00",
    source: "pix_direct",
    status: "approved",
    pix_end_to_end_id: "E60701190202608282252DY5K0KJ29LT",
    transaction_id: "B3381KXP5BNC87R5N",
    institution: "Itau Unibanco S.A",
    public_name: true,
    public_display_name: "Gislaine",
    dedupe_key: "pix:E60701190202608282252DY5K0KJ29LT",
  },
  {
    donor_name: "Kuo Wei Cheng",
    amount_cents: 500,
    occurred_at: "2026-08-28T18:22:00-03:00",
    source: "pix_direct",
    status: "approved",
    pix_end_to_end_id: null,
    transaction_id: "B3381A0Z7JRHPQ9A7",
    institution: "Mercado Pago",
    public_name: true,
    public_display_name: "Cheng",
    dedupe_key: "pix_tx:B3381A0Z7JRHPQ9A7",
  },
  {
    donor_name: "Luis Carlos dos Santos",
    amount_cents: 2000,
    occurred_at: "2026-08-28T17:55:00-03:00",
    source: "pix_direct",
    status: "approved",
    pix_end_to_end_id: "E18236120202608282054s08e348da5f",
    transaction_id: "B338170RB5K7SYN20",
    institution: "Nu Pagamento S.A",
    public_name: true,
    public_display_name: "Luis Carlos",
    dedupe_key: "pix:E18236120202608282054s08e348da5f",
  },
  {
    donor_name: "Veronica Maria dos Santos",
    amount_cents: 2000,
    occurred_at: "2026-08-28T17:09:00-03:00",
    source: "pix_direct",
    status: "approved",
    pix_end_to_end_id: null,
    transaction_id: null,
    institution: "PagSeguro Internet S.A",
    public_name: true,
    public_display_name: "Veronica",
    dedupe_key: "pix_backfill:2026-08-28:1709:2000:veronica-maria-dos-santos:pagseguro",
  },
  {
    donor_name: "Giovanna Pereira de Souza More",
    amount_cents: 2000,
    occurred_at: "2026-08-28T17:09:00-03:00",
    source: "pix_direct",
    status: "approved",
    pix_end_to_end_id: null,
    transaction_id: null,
    institution: "Banco do Brasil",
    public_name: true,
    public_display_name: "Giovanna",
    dedupe_key: "pix_backfill:2026-08-28:1709:2000:giovanna-pereira-de-souza-more:banco-do-brasil",
  },
  {
    donor_name: "Leticia Mota Leite Martins",
    amount_cents: 5000,
    occurred_at: "2026-08-28T10:22:00-03:00",
    source: "pix_direct",
    status: "approved",
    pix_end_to_end_id: null,
    transaction_id: null,
    institution: "Banco Bradesco",
    public_name: true,
    public_display_name: "Leticia Mota",
    dedupe_key: "pix_backfill:2026-08-28:1022:5000:leticia-mota-leite-martins:bradesco",
  },
  {
    donor_name: "Marina N Lorenzetti Gil",
    amount_cents: 10000,
    occurred_at: "2026-08-28T09:22:00-03:00",
    source: "pix_direct",
    status: "approved",
    pix_end_to_end_id: null,
    transaction_id: null,
    institution: "Banco do Brasil",
    public_name: true,
    public_display_name: "Marina Lorenzetti",
    dedupe_key: "pix_backfill:2026-08-28:0922:10000:marina-n-lorenzetti-gil:banco-do-brasil",
  },
  {
    donor_name: "Iris Cristina de O. O. Alcarde",
    amount_cents: 668,
    occurred_at: "2026-08-28T09:09:00-03:00",
    source: "pix_direct",
    status: "approved",
    pix_end_to_end_id: null,
    transaction_id: null,
    institution: "Caixa Economica Federal",
    public_name: true,
    public_display_name: "Iris Cristina",
    dedupe_key: "pix_backfill:2026-08-28:0909:668:iris-cristina-alcarde:caixa",
  },
  {
    donor_name: "Mattos Max Transporte e Turismo Eireli",
    amount_cents: 2000,
    occurred_at: "2026-08-28T08:39:00-03:00",
    source: "pix_direct",
    status: "approved",
    pix_end_to_end_id: null,
    transaction_id: null,
    institution: "C.C.P.I da Região Centro Oeste Paulista",
    public_name: true,
    public_display_name: "Mattos Max Transporte e Turismo",
    dedupe_key: "pix_backfill:2026-08-28:0839:2000:mattos-max-transporte-e-turismo:ccpi-centro-oeste-paulista",
  },
];

async function main() {
  console.log("==================================================");
  console.log("REGISTRO DO LOTE 2 DE CONTRIBUIÇÕES REAIS");
  console.log("==================================================");

  const initialCamp = await admin.from("dante_campaign").select("*").eq("id", "main").single();
  console.log("Total inicial no banco: R$", (initialCamp.data.confirmed_cents / 100).toFixed(2), `(${initialCamp.data.confirmed_cents} centavos)`);

  let addedCents = 0;
  for (const item of batch) {
    const { data, error } = await admin.rpc("register_dante_contribution", {
      p_dedupe_key: item.dedupe_key,
      p_source: item.source,
      p_amount_cents: item.amount_cents,
      p_status: item.status,
      p_donor_name: item.donor_name,
      p_public_name: item.public_name,
      p_public_display_name: item.public_display_name,
      p_occurred_at: item.occurred_at,
      p_provider: "pix",
      p_pix_end_to_end_id: item.pix_end_to_end_id,
      p_transaction_id: item.transaction_id,
      p_institution: item.institution,
    });

    if (error) {
      console.error(`Erro ao inserir ${item.public_display_name}:`, error.message);
      process.exit(1);
    }

    addedCents += item.amount_cents;
    console.log(`[OK] ${item.public_display_name.padEnd(32)} | R$ ${(item.amount_cents / 100).toFixed(2).padStart(6)} | ID: ${data.id} | Total: R$ ${(data.confirmed_cents / 100).toFixed(2)}`);
  }

  const finalCamp = await admin.from("dante_campaign").select("*").eq("id", "main").single();
  console.log("==================================================");
  console.log("Total adicionado no lote: R$", (addedCents / 100).toFixed(2), `(${addedCents} centavos)`);
  console.log("Total final no banco:     R$", (finalCamp.data.confirmed_cents / 100).toFixed(2), `(${finalCamp.data.confirmed_cents} centavos)`);
  console.log("==================================================");
}

main().catch(console.error);
