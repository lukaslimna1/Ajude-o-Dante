/**
 * Gerador de Pix Copia e Cola / BR Code (Padrão BACEN / EMVCo)
 * Implementação pura em TypeScript sem dependências externas de rede.
 */

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

/**
 * Normaliza strings para o padrão EMV (sem acentos, apenas caracteres válidos e truncado no limite)
 */
export function normalizeEmvText(str: string, maxLen: number): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .slice(0, maxLen);
}

/**
 * Sanitiza a chave Pix de acordo com as regras do BACEN:
 * - Telefone: Deve manter o prefixo internacional com o sinal "+" (ex: +5514988025296)
 * - CPF/CNPJ: Apenas dígitos
 * - E-mail: Minúsculo sem espaços
 * - EVP: Formato UUID
 */
export function sanitizePixKey(key: string): string {
  const trimmed = key.trim();
  // Se for telefone com DDD brasileiro sem o '+', garante o formato internacional
  if (/^\+?55\d{10,11}$/.test(trimmed)) {
    return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
  }
  if (/^\d{10,11}$/.test(trimmed)) {
    return `+55${trimmed}`;
  }
  return trimmed;
}

/**
 * Cálculo de CRC16-CCITT (Polinômio 0x1021, valor inicial 0xFFFF)
 */
export function calculateCrc16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

export interface PixBrcodeOptions {
  key: string;
  receiverName: string;
  receiverCity: string;
  amountCents: number;
  txId: string;
}

export function generatePixBrcode({
  key,
  receiverName,
  receiverCity,
  amountCents,
  txId,
}: PixBrcodeOptions): string {
  const sanitizedKey = sanitizePixKey(key);
  // Limites rigorosos do padrão EMVCo: Name max 25, City max 15, TxID max 25
  const sanitizedName = normalizeEmvText(receiverName, 25) || "LUCAS M S LIMA";
  const sanitizedCity = normalizeEmvText(receiverCity, 15) || "BAURU";
  const sanitizedTxId = normalizeEmvText(txId.replace(/[^a-zA-Z0-9]/g, ""), 25) || "***";
  const amountStr = (amountCents / 100).toFixed(2);

  // Sub-fields for Tag 26 (Merchant Account Information)
  const tag26Gui = formatField("00", "br.gov.bcb.pix");
  const tag26Key = formatField("01", sanitizedKey);
  const tag26 = formatField("26", `${tag26Gui}${tag26Key}`);

  // Sub-fields for Tag 62 (Additional Data Field Template / TxID)
  const tag62TxId = formatField("05", sanitizedTxId);
  const tag62 = formatField("62", tag62TxId);

  // Assemble full payload without CRC
  const rawPayload =
    formatField("00", "01") + // Payload Format Indicator
    tag26 + // Merchant Account Info
    formatField("52", "0000") + // Merchant Category Code
    formatField("53", "986") + // Transaction Currency (BRL)
    formatField("54", amountStr) + // Transaction Amount
    formatField("58", "BR") + // Country Code
    formatField("59", sanitizedName) + // Merchant Name (max 25)
    formatField("60", sanitizedCity) + // Merchant City (max 15)
    tag62 + // Additional Data Field (TxID max 25)
    "6304"; // Tag 63 + Length 04 for CRC

  const crc = calculateCrc16(rawPayload);
  return `${rawPayload}${crc}`;
}
