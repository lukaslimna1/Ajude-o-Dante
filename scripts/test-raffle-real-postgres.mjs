import pg from "pg";
import fs from "node:fs";
import QRCode from "qrcode";
import { generatePixBrcode, sanitizePixKey } from "../src/lib/pix/brcode.ts";

const { Pool, Client } = pg;
const connectionString = "postgresql://postgres:postgres@127.0.0.1:5499/postgres";

async function runRealPostgresTests() {
  console.log("==================================================");
  console.log("SUÍTE DE TESTES E ASSERTIONS REAIS NO POSTGRESQL");
  console.log("==================================================\n");

  const pool = new Pool({ connectionString, max: 10 });

  // 1. APLICAR MIGRATION NO BANCO ISOLADO
  console.log("--- 1. APLICANDO MIGRATION NO BANCO DE TESTE ---");
  const migrationSql = fs.readFileSync(
    "supabase/migrations/20260830000000_raffle_architecture.sql",
    "utf8"
  );

  const setupClient = await pool.connect();
  try {
    await setupClient.query(`
      do $$ begin
        if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin; end if;
        if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
        if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
      end $$;
      create schema if not exists auth;
      create or replace function auth.uid() returns uuid language sql as $$ select '6cd70073-9f58-4227-ac7f-d61faf25b57e'::uuid; $$;

      -- Tabela de simulação de permissão admin para os testes
      create table if not exists public.test_admin_context (is_admin boolean not null default true);
      insert into public.test_admin_context (is_admin) values (true);

      create or replace function public.is_dante_admin() returns boolean language sql as $$
        select is_admin from public.test_admin_context limit 1;
      $$;
    `);
    await setupClient.query(migrationSql);
    console.log("[ASSERT PASS] Migration aplicada com sucesso no PostgreSQL.");
  } finally {
    setupClient.release();
  }

  // 2. TESTE DE CONTROLE DE STATUS E PERMISSÕES (ADMIN vs NÃO-ADMIN vs ANON)
  console.log("\n--- 2. TESTE DE CONTROLE DE STATUS E PERMISSÕES VIA RPC ---");

  // 2.1 Admin altera draft -> active
  const setAct = await pool.query("select public.set_dante_raffle_status('main', 'active') as res");
  if (!setAct.rows[0].res.success || setAct.rows[0].res.status !== "active") {
    throw new Error("Falha ao ativar rifa como admin.");
  }
  console.log("[ASSERT PASS] Admin alterou status draft -> active com sucesso.");

  // 2.2 Admin altera active -> finished
  const setFin = await pool.query("select public.set_dante_raffle_status('main', 'finished') as res");
  if (!setFin.rows[0].res.success || setFin.rows[0].res.status !== "finished") {
    throw new Error("Falha ao encerrar rifa como admin.");
  }
  console.log("[ASSERT PASS] Admin alterou status active -> finished com sucesso.");

  // 2.3 Simula usuário autenticado NÃO-ADMIN tentando alterar status
  await pool.query("update public.test_admin_context set is_admin = false");
  let nonAdminBlocked = false;
  try {
    await pool.query("select public.set_dante_raffle_status('main', 'active') as res");
  } catch (err) {
    if (err.message.includes("Acesso não autorizado.")) {
      nonAdminBlocked = true;
    }
  }
  if (!nonAdminBlocked) {
    throw new Error("CRÍTICO: Usuário não-admin conseguiu alterar o status da ação!");
  }
  console.log("[ASSERT PASS] Usuário NÃO-ADMIN sumariamente bloqueado ao tentar alterar status.");

  // Restaura permissão de admin
  await pool.query("update public.test_admin_context set is_admin = true");

  // 3. TESTE DE GATING DE RESERVAS POR STATUS DA RIFA
  console.log("\n--- 3. TESTE DE GATING DE RESERVAS POR STATUS ---");

  // Status draft:
  await pool.query("select public.set_dante_raffle_status('main', 'draft')");
  const resDraft = await pool.query("select public.reserve_dante_raffle_numbers('main', array[1], 'Lucas', '14988025296', 'D-DRAFT', 'h') as res");
  if (resDraft.rows[0].res.success || !resDraft.rows[0].res.error.includes("em preparação")) {
    throw new Error("Status DRAFT deveria bloquear reservas.");
  }
  console.log(`[ASSERT PASS] Status DRAFT bloqueou reserva: "${resDraft.rows[0].res.error}"`);

  // Status finished:
  await pool.query("select public.set_dante_raffle_status('main', 'finished')");
  const resFinished = await pool.query("select public.reserve_dante_raffle_numbers('main', array[1], 'Lucas', '14988025296', 'D-FIN', 'h') as res");
  if (resFinished.rows[0].res.success || !resFinished.rows[0].res.error.includes("não está ativa")) {
    throw new Error("Status FINISHED deveria bloquear reservas.");
  }
  console.log(`[ASSERT PASS] Status FINISHED bloqueou reserva: "${resFinished.rows[0].res.error}"`);

  // Status cancelled:
  await pool.query("select public.set_dante_raffle_status('main', 'cancelled')");
  const resCancelled = await pool.query("select public.reserve_dante_raffle_numbers('main', array[1], 'Lucas', '14988025296', 'D-CANC', 'h') as res");
  if (resCancelled.rows[0].res.success || !resCancelled.rows[0].res.error.includes("não está ativa")) {
    throw new Error("Status CANCELLED deveria bloquear reservas.");
  }
  console.log(`[ASSERT PASS] Status CANCELLED bloqueou reserva: "${resCancelled.rows[0].res.error}"`);

  // Ativa para os testes de concorrência
  await pool.query("select public.set_dante_raffle_status('main', 'active')");
  console.log("[ASSERT PASS] Status ACTIVE configurado para testes de concorrência.");

  // 4. CENÁRIO CONCORRENTE 1: CHAMADA B VENCE (DISPUTA PELO 023)
  console.log("\n--- 4. TESTE CONCORRENTE 1: CHAMADA B VENCE (DISPUTA PELO 023) ---");
  await pool.query("update public.dante_raffle_numbers set status = 'available', reservation_id = null, reserved_until = null");
  await pool.query("delete from public.dante_raffle_reservations");

  const client1 = new Client({ connectionString });
  const client2 = new Client({ connectionString });
  await client1.connect();
  await client2.connect();

  // B reserva [23, 50]
  const promB = client2.query(
    "select public.reserve_dante_raffle_numbers('main', array[23, 50], 'Pessoa B', '14999998888', 'DANTE-B1', 'hash_b') as res"
  );
  // Pequeno delay de 15ms para garantir que B estabelece o lock primeiro
  await new Promise((r) => setTimeout(r, 15));
  const promA = client1.query(
    "select public.reserve_dante_raffle_numbers('main', array[7, 23, 71], 'Pessoa A', '14988025296', 'DANTE-A1', 'hash_a') as res"
  );

  const [resB_out, resA_out] = await Promise.all([promB, promA]);
  await client1.end();
  await client2.end();

  const outB = resB_out.rows[0].res;
  const outA = resA_out.rows[0].res;

  // Assertions automáticas
  if (!outB.success) throw new Error("Cenário 1: Chamada B deveria ter obtido sucesso.");
  if (outA.success) throw new Error("Cenário 1: Chamada A deveria ter sido rejeitada.");
  if (!outA.error.includes("023 não está mais disponível")) {
    throw new Error(`Cenário 1: Erro inesperado em A: ${outA.error}`);
  }

  const rowsB = (await pool.query(
    "select number, status, reservation_id from public.dante_raffle_numbers where number in (7, 23, 50, 71) order by number"
  )).rows;

  const n7 = rowsB.find(r => r.number === 7);
  const n23 = rowsB.find(r => r.number === 23);
  const n50 = rowsB.find(r => r.number === 50);
  const n71 = rowsB.find(r => r.number === 71);

  if (n7.status !== "available" || n7.reservation_id !== null) {
    throw new Error("Cenário 1: Número 007 deveria estar AVAILABLE e sem reserva.");
  }
  if (n23.status !== "reserved" || n23.reservation_id !== outB.reservation_id) {
    throw new Error("Cenário 1: Número 023 deveria estar RESERVED por B.");
  }
  if (n50.status !== "reserved" || n50.reservation_id !== outB.reservation_id) {
    throw new Error("Cenário 1: Número 050 deveria estar RESERVED por B.");
  }
  if (n71.status !== "available" || n71.reservation_id !== null) {
    throw new Error("Cenário 1: Número 071 deveria estar AVAILABLE e sem reserva.");
  }

  console.log("Registros exatos no banco (Cenário 1 - B vence):");
  console.log("  • Número 007:", n7.status, "(reserva:", n7.reservation_id, ")");
  console.log("  • Número 023:", n23.status, "(reserva de B:", n23.reservation_id, ")");
  console.log("  • Número 050:", n50.status, "(reserva de B:", n50.reservation_id, ")");
  console.log("  • Número 071:", n71.status, "(reserva:", n71.reservation_id, ")");
  console.log("[ASSERT PASS] Cenário 1 validado: B reservou [023, 050]; A falhou completamente; 007 e 071 continuam AVAILABLE.");

  // 5. CENÁRIO CONCORRENTE 2: CHAMADA A VENCE
  console.log("\n--- 5. TESTE CONCORRENTE 2: CHAMADA A VENCE (DISPUTA PELO 023) ---");
  await pool.query("update public.dante_raffle_numbers set status = 'available', reservation_id = null, reserved_until = null");
  await pool.query("delete from public.dante_raffle_reservations");

  const c3 = new Client({ connectionString });
  const c4 = new Client({ connectionString });
  await c3.connect();
  await c4.connect();

  // A reserva [7, 23, 71] primeiro
  const promA2 = c3.query(
    "select public.reserve_dante_raffle_numbers('main', array[7, 23, 71], 'Pessoa A', '14988025296', 'DANTE-A2', 'hash_a2') as res"
  );
  await new Promise((r) => setTimeout(r, 15));
  const promB2 = c4.query(
    "select public.reserve_dante_raffle_numbers('main', array[23, 50], 'Pessoa B', '14999998888', 'DANTE-B2', 'hash_b2') as res"
  );

  const [resA2_out, resB2_out] = await Promise.all([promA2, promB2]);
  await c3.end();
  await c4.end();

  const outA2 = resA2_out.rows[0].res;
  const outB2 = resB2_out.rows[0].res;

  // Assertions automáticas
  if (!outA2.success) throw new Error("Cenário 2: Chamada A deveria ter obtido sucesso.");
  if (outB2.success) throw new Error("Cenário 2: Chamada B deveria ter sido rejeitada.");
  if (!outB2.error.includes("023 não está mais disponível")) {
    throw new Error(`Cenário 2: Erro inesperado em B: ${outB2.error}`);
  }

  const rowsA = (await pool.query(
    "select number, status, reservation_id from public.dante_raffle_numbers where number in (7, 23, 50, 71) order by number"
  )).rows;

  const n7_a = rowsA.find(r => r.number === 7);
  const n23_a = rowsA.find(r => r.number === 23);
  const n50_a = rowsA.find(r => r.number === 50);
  const n71_a = rowsA.find(r => r.number === 71);

  if (n7_a.status !== "reserved" || n7_a.reservation_id !== outA2.reservation_id) {
    throw new Error("Cenário 2: Número 007 deveria estar RESERVED por A.");
  }
  if (n23_a.status !== "reserved" || n23_a.reservation_id !== outA2.reservation_id) {
    throw new Error("Cenário 2: Número 023 deveria estar RESERVED por A.");
  }
  if (n50_a.status !== "available" || n50_a.reservation_id !== null) {
    throw new Error("Cenário 2: Número 050 deveria estar AVAILABLE e sem reserva.");
  }
  if (n71_a.status !== "reserved" || n71_a.reservation_id !== outA2.reservation_id) {
    throw new Error("Cenário 2: Número 071 deveria estar RESERVED por A.");
  }

  console.log("Registros exatos no banco (Cenário 2 - A vence):");
  console.log("  • Número 007:", n7_a.status, "(reserva de A:", n7_a.reservation_id, ")");
  console.log("  • Número 023:", n23_a.status, "(reserva de A:", n23_a.reservation_id, ")");
  console.log("  • Número 050:", n50_a.status, "(reserva:", n50_a.reservation_id, ")");
  console.log("  • Número 071:", n71_a.status, "(reserva de A:", n71_a.reservation_id, ")");
  console.log("[ASSERT PASS] Cenário 2 validado: A reservou [007, 023, 071]; B falhou completamente; 050 continua AVAILABLE.");

  // 6. GERAÇÃO DE QR CODE PIX REAL DE R$ 15,00 PARA VALIDAÇÃO
  console.log("\n--- 6. GERAÇÃO DO QR CODE PIX REAL DE R$ 15,00 ---");
  const pixKey = sanitizePixKey("+5514988025296");
  const pixPayload = generatePixBrcode({
    key: pixKey,
    receiverName: "LUCAS M S LIMA",
    receiverCity: "BAURU",
    amountCents: 1500,
    txId: "DANTE4F82A",
  });

  const qrFilePath = "scripts/raffle_pix_test_15reais.png";
  await QRCode.toFile(qrFilePath, pixPayload, {
    width: 300,
    margin: 1,
    color: { dark: "#0b1329", light: "#ffffff" },
  });

  console.log("Payload Pix Copia e Cola gerado:");
  console.log(" ", pixPayload);
  console.log("QR Code salvo em:", qrFilePath);
  // 7. INVARIANTE: TODA RESERVA ATIVA DEVE TER NÚMEROS VINCULADOS === QUANTITY
  const orphanCheck = await pool.query(`
    select r.id, r.order_code, r.quantity, count(n.id) as linked_count
    from public.dante_raffle_reservations r
    left join public.dante_raffle_numbers n on n.reservation_id = r.id
    where r.status in ('reserved', 'awaiting_confirmation')
    group by r.id, r.order_code, r.quantity
    having count(n.id) <> r.quantity or count(n.id) = 0
  `);
  if (orphanCheck.rows.length > 0) {
    throw new Error(`Invariante violado no PostgreSQL: ${orphanCheck.rows.length} reservas ativas órfãs!`);
  }
  console.log("[ASSERT PASS] Invariante estrito verificado no PostgreSQL: Nenhuma reserva ativa órfã.");

  // 8. RESTAURA STATUS DA RIFA COMO 'DRAFT' (CONFORME REQUISITO 5)
  await pool.query("update public.dante_raffle set status = 'draft' where id = 'main'");
  const finalRaffle = (await pool.query("select status from public.dante_raffle where id = 'main'")).rows[0];
  if (finalRaffle.status !== "draft") {
    throw new Error("Rifa deveria permanecer em DRAFT ao final!");
  }
  console.log("\n[ASSERT PASS] Rifa restaurada e mantida em DRAFT.");

  await pool.end();

  console.log("\n==================================================");
  console.log("TODAS AS ASSERTIONS AUTOMÁTICAS FORAM 100% APROVADAS!");
  console.log("==================================================");
}

runRealPostgresTests().catch((err) => {
  console.error("ERRO NAS ASSERTIONS:", err);
  process.exit(1);
});
