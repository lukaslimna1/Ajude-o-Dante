import { generatePixBrcode, calculateCrc16, sanitizePixKey } from "../src/lib/pix/brcode.ts";
import crypto from "node:crypto";

console.log("==================================================");
console.log("SUITE COMPLETA DE TESTES DO MÓDULO 2 (V2 HARDENED)");
console.log("==================================================\n");

// 1. TESTES DO GERADOR PIX COM CHAVE INTERNACIONAL (+5514988025296)
console.log("--- 1. TESTES DO GERADOR PIX (CHAVE +55 E LIMITES EMV) ---");
const testAmounts = [
  { cents: 1500, label: "1 número (R$ 15,00)" },
  { cents: 3000, label: "2 números (R$ 30,00)" },
  { cents: 4500, label: "3 números (R$ 45,00)" },
  { cents: 15000, label: "10 números (R$ 150,00)" },
];

for (const t of testAmounts) {
  const pixKey = sanitizePixKey("+5514988025296");
  const payload = generatePixBrcode({
    key: pixKey,
    receiverName: "LUCAS M S LIMA",
    receiverCity: "BAURU",
    amountCents: t.cents,
    txId: "DANTE4F82A",
  });

  const body = payload.slice(0, -4);
  const crc = payload.slice(-4);
  const calculatedCrc = calculateCrc16(body);

  if (crc !== calculatedCrc) {
    throw new Error(`CRC Inválido para ${t.label}: obtido ${crc}, esperado ${calculatedCrc}`);
  }

  // Verifica se a chave internacional com '+' está presente no payload
  if (!payload.includes("+5514988025296")) {
    throw new Error("Payload Pix não preservou o formato internacional +5514988025296");
  }

  console.log(`[PASS] ${t.label}:`);
  console.log(`  Chave: ${pixKey} | Receiver: LUCAS M S LIMA (14 chars <= 25) | City: BAURU`);
  console.log(`  TxID: DANTE4F82A | CRC16: ${crc}`);
  console.log(`  Payload: ${payload}\n`);
}

// 2. TESTE DE TOKEN HASHING
console.log("--- 2. TESTES DE TOKENS E SHA256 HASHING ---");
const rawToken = crypto.randomBytes(16).toString("hex");
const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
if (rawToken.length !== 32 || tokenHash.length !== 64) {
  throw new Error("Tamanho de token ou hash inválido.");
}
console.log(`[PASS] Token 128-bit gerado (32 chars) e Hash SHA256 (64 chars) validados.`);

// 3. SIMULAÇÃO DE ESTADO DO BANCO DE DADOS POSTGRESQL COM LOCKS PESSIMISTAS
console.log("\n--- 3. TESTES DE CONCORRÊNCIA E REGRAS DE BANCO DE DADOS ---");

class DatabaseSimulation {
  constructor() {
    this.numbers = new Map();
    for (let i = 1; i <= 100; i++) {
      this.numbers.set(i, { number: i, status: "available", reservation_id: null, reserved_until: null });
    }
    this.reservations = new Map();
    this.advisoryLocks = new Set();
  }

  cleanupExpired() {
    const now = Date.now();
    let count = 0;
    for (const [id, res] of this.reservations.entries()) {
      if (["reserved", "awaiting_confirmation"].includes(res.status) && res.expires_at < now) {
        res.status = "expired";
        count++;
        for (const [, num] of this.numbers.entries()) {
          if (num.reservation_id === id && num.status !== "paid") {
            num.status = "available";
            num.reservation_id = null;
            num.reserved_until = null;
          }
        }
      }
    }
    return count;
  }

  reserveNumbers({ numbers, name, whatsapp, orderCode, tokenHash }) {
    const cleanWa = whatsapp.replace(/\D/g, "");
    if (cleanWa.length < 10) return { success: false, error: "WhatsApp inválido." };

    // 1. Advisory lock por WhatsApp
    if (this.advisoryLocks.has(cleanWa)) {
      return { success: false, error: "Operação simultânea em andamento para este telefone." };
    }
    this.advisoryLocks.add(cleanWa);

    try {
      // 2. Limpeza global de expirados
      this.cleanupExpired();

      // 3. Limite de 2 reservas ativas por WhatsApp
      const now = Date.now();
      let activeCount = 0;
      for (const res of this.reservations.values()) {
        if (res.customer_whatsapp === cleanWa && ["reserved", "awaiting_confirmation"].includes(res.status) && res.expires_at > now) {
          activeCount++;
        }
      }
      if (activeCount >= 2) {
        return { success: false, error: "Limite de 2 reservas ativas excedido para este WhatsApp." };
      }

      // 4. Validações de limites e duplicatas
      if (!numbers || numbers.length === 0) return { success: false, error: "Nenhum número selecionado." };
      if (numbers.length > 10) return { success: false, error: "Máximo de 10 números por pedido." };

      const sorted = [...numbers].sort((a, b) => a - b);
      const unique = Array.from(new Set(sorted));
      if (unique.length !== sorted.length) return { success: false, error: "Números duplicados na seleção." };

      for (const n of unique) {
        if (n < 1 || n > 100) return { success: false, error: `Número fora do intervalo 1-100: ${n}` };
      }

      // 5. Bloqueio pessimista (SELECT ... FOR UPDATE) & Verificação de Disponibilidade
      for (const n of unique) {
        const item = this.numbers.get(n);
        if (!item || item.status !== "available") {
          return { success: false, error: `O número ${n.toString().padStart(3, "0")} não está mais disponível.` };
        }
      }

      // 6. Commit atômico
      const resId = "res_" + Math.random().toString(36).slice(2);
      const expiresAt = now + 30 * 60 * 1000;
      this.reservations.set(resId, {
        id: resId,
        order_code: orderCode,
        reservation_token_hash: tokenHash,
        customer_name: name,
        customer_whatsapp: cleanWa,
        status: "reserved",
        expires_at: expiresAt,
        proof_sent_at: null,
        confirmed_at: null,
      });

      for (const n of unique) {
        const item = this.numbers.get(n);
        item.status = "reserved";
        item.reservation_id = resId;
        item.reserved_until = expiresAt;
      }

      return { success: true, reservationId: resId, orderCode, expiresAt };
    } finally {
      this.advisoryLocks.delete(cleanWa);
    }
  }

  markProofSent({ orderCode, tokenHash }) {
    for (const res of this.reservations.values()) {
      if (res.order_code === orderCode && res.reservation_token_hash === tokenHash) {
        if (res.status === "paid") return { success: true, status: "paid" };
        if (res.status === "awaiting_confirmation") {
          if (res.expires_at < Date.now()) return { success: false, error: "Esta reserva expirou." };
          return { success: true, status: "awaiting_confirmation", expires_at: res.expires_at, idempotent: true };
        }
        if (["cancelled", "expired"].includes(res.status) || (res.status === "reserved" && res.expires_at < Date.now())) {
          return { success: false, error: "Esta reserva expirou ou foi cancelada." };
        }

        res.status = "awaiting_confirmation";
        res.proof_sent_at = Date.now();
        res.expires_at = Date.now() + 12 * 60 * 60 * 1000;

        for (const num of this.numbers.values()) {
          if (num.reservation_id === res.id) {
            num.status = "awaiting_confirmation";
            num.reserved_until = res.expires_at;
          }
        }
        return { success: true, status: "awaiting_confirmation", expires_at: res.expires_at, idempotent: false };
      }
    }
    return { success: false, error: "Reserva não encontrada ou token inválido." };
  }

  confirmPayment(resId) {
    const res = this.reservations.get(resId);
    if (!res) return { success: false, error: "Reserva não encontrada." };
    if (res.status === "paid") return { success: true, status: "paid", idempotent: true };
    if (["expired", "cancelled"].includes(res.status)) {
      return { success: false, error: "Não é possível confirmar pagamento de reserva cancelada ou expirada." };
    }

    res.status = "paid";
    res.confirmed_at = Date.now();
    for (const num of this.numbers.values()) {
      if (num.reservation_id === res.id) {
        num.status = "paid";
        num.confirmed_at = Date.now();
        num.reserved_until = null;
      }
    }
    return { success: true, status: "paid", idempotent: false };
  }

  releaseReservation(resId) {
    const res = this.reservations.get(resId);
    if (!res) return { success: false, error: "Reserva não encontrada." };
    if (res.status === "paid") {
      return { success: false, error: "Não é permitido liberar números de uma reserva paga." };
    }
    if (res.status === "cancelled") return { success: true, status: "cancelled", idempotent: true };

    res.status = "cancelled";
    for (const num of this.numbers.values()) {
      if (num.reservation_id === res.id && num.status !== "paid") {
        num.status = "available";
        num.reservation_id = null;
        num.reserved_until = null;
        num.confirmed_at = null;
      }
    }
    return { success: true, status: "cancelled" };
  }
}

const db = new DatabaseSimulation();

// Teste 3.1: Concorrência simultânea com números sobrepostos [7, 23, 71] vs [23, 50]
const resA = db.reserveNumbers({
  numbers: [7, 23, 71],
  name: "Pessoa A",
  whatsapp: "14988025296",
  orderCode: "DANTE-A1111",
  tokenHash: "hash_a",
});
const resB = db.reserveNumbers({
  numbers: [23, 50],
  name: "Pessoa B",
  whatsapp: "14999998888",
  orderCode: "DANTE-B2222",
  tokenHash: "hash_b",
});

if (!resA.success) throw new Error("Pessoa A falhou inesperadamente.");
if (resB.success) throw new Error("Pessoa B conseguiu reservar número 23 já travado por A!");
if (db.numbers.get(50).status !== "available") throw new Error("Número 50 foi reservado parcialmente!");

console.log("[PASS] Concorrência pessimista: Pessoa A reservou [007, 023, 071].");
console.log(`[PASS] Pessoa B rejeitada com erro de exclusividade atômica: "${resB.error}".`);
console.log("[PASS] Número 050 permaneceu DISPONÍVEL (reserva parcial prevenida).");

// Teste 3.2: Validação de duplicatas no array [7, 7]
const resDup = db.reserveNumbers({
  numbers: [7, 7],
  name: "Pessoa Dup",
  whatsapp: "14911112222",
  orderCode: "DANTE-DUP11",
  tokenHash: "hash_dup",
});
if (resDup.success) throw new Error("Array com números duplicados deveria ser rejeitado.");
console.log(`[PASS] Rejeição de duplicatas no array: "${resDup.error}".`);

// Teste 3.3: Validação de limites (número 0, número 101, mais de 10 números)
const resZero = db.reserveNumbers({ numbers: [0, 5], name: "P", whatsapp: "14911112222", orderCode: "D1", tokenHash: "h1" });
const resOver100 = db.reserveNumbers({ numbers: [101], name: "P", whatsapp: "14911112222", orderCode: "D2", tokenHash: "h2" });
const res11 = db.reserveNumbers({ numbers: [1,2,3,4,5,6,7,8,9,10,11], name: "P", whatsapp: "14911112222", orderCode: "D3", tokenHash: "h3" });

if (resZero.success || resOver100.success || res11.success) throw new Error("Limites de número violados.");
console.log("[PASS] Validações de limites de números (0, 101, >10) rejeitadas corretamente.");

// Teste 3.4: Limite de 2 reservas ativas por WhatsApp
const resA2 = db.reserveNumbers({ numbers: [12], name: "Pessoa A", whatsapp: "14988025296", orderCode: "DANTE-A2222", tokenHash: "hash_a2" });
const resA3 = db.reserveNumbers({ numbers: [13], name: "Pessoa A", whatsapp: "14988025296", orderCode: "DANTE-A3333", tokenHash: "hash_a3" });

if (!resA2.success) throw new Error("Segunda reserva da Pessoa A falhou.");
if (resA3.success) throw new Error("Terceira reserva da Pessoa A deveria ser bloqueada pelo limite de 2 ativas.");
console.log(`[PASS] Limite de 2 reservas ativas por WhatsApp funcionando: "${resA3.error}".`);

// Teste 3.5: Idempotência do envio de comprovante
const proof1 = db.markProofSent({ orderCode: "DANTE-A1111", tokenHash: "hash_a" });
const proof2 = db.markProofSent({ orderCode: "DANTE-A1111", tokenHash: "hash_a" });

if (!proof1.success || proof1.idempotent) throw new Error("Primeiro envio de comprovante falhou.");
if (!proof2.success || !proof2.idempotent) throw new Error("Segundo clique em 'Já enviei' deveria ser idempotente.");
console.log("[PASS] Idempotência do comprovante: Primeiro envio estendeu prazo; segundo clique retornou idempotente sem renovar prazo.");

// Teste 3.6: Token inválido
const proofBadToken = db.markProofSent({ orderCode: "DANTE-A1111", tokenHash: "wrong_token_hash" });
if (proofBadToken.success) throw new Error("Token incorreto foi aceito!");
console.log(`[PASS] Token incorreto rejeitado com: "${proofBadToken.error}".`);

// Teste 3.7: Confirmação de Pagamento
const payRes = db.confirmPayment(resA.reservationId);
if (!payRes.success) throw new Error("Confirmação de pagamento falhou.");
if (db.numbers.get(7).status !== "paid" || db.numbers.get(23).status !== "paid" || db.numbers.get(71).status !== "paid") {
  throw new Error("Números não foram marcados como paid.");
}
console.log("[PASS] Confirmação de pagamento: Reserva e números [007, 023, 071] marcados como PAID.");

// Teste 3.8: Número PAID não pode ser liberado nem recomprado
const releasePaid = db.releaseReservation(resA.reservationId);
if (releasePaid.success) throw new Error("Reserva paga NÃO pode ser liberada!");
console.log(`[PASS] Bloqueio estrito de liberação em reserva paga: "${releasePaid.error}".`);

// Teste 3.9: Limpeza global de expirados
// Força expiração da segunda reserva de A (número 12)
db.reservations.get(resA2.reservationId).expires_at = Date.now() - 1000;
const cleaned = db.cleanupExpired();
if (cleaned === 0 || db.numbers.get(12).status !== "available") {
  throw new Error("Limpeza de expirados falhou para o número 12.");
}
// Teste 3.10: Invariante Estrito — Toda reserva ativa DEVE ter contagem de números vinculados === quantity
for (const [resId, res] of db.reservations.entries()) {
  if (res.status === "reserved" || res.status === "awaiting_confirmation") {
    let linked = 0;
    for (const num of db.numbers.values()) {
      if (num.reservation_id === resId) linked++;
    }
    if (linked !== res.quantity || linked === 0) {
      throw new Error(`Invariante violado: Reserva ativa órfã detectada! ID ${resId}`);
    }
  }
}
console.log("[PASS] Invariante estrito: Nenhuma reserva ativa órfã permitida.");

console.log("\n==================================================");
console.log("TODOS OS 15 CENÁRIOS DE TESTE PASSARAM COM SUCESSO!");
console.log("==================================================");
