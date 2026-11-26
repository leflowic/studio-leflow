import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

// Account verification over WhatsApp (needed for the prize games when the admin
// switch is on). The visitor sends one WhatsApp message "... LF-XXXXXX" to the
// studio number; Meta's Cloud API forwards it to POST /api/whatsapp/webhook and
// we match the code. We never send WhatsApp messages (replies cost money since
// Oct 2026; receiving is free) - the site shows the result itself.
//
// The phone number is never stored, only an HMAC of it (keyed with
// SESSION_SECRET), which is enough to stop one number verifying two accounts.
//
// Env (all three needed, otherwise the feature reports "not configured" and
// never blocks anyone):
//   WHATSAPP_NUMBER        studio number in international format, digits only (3816...)
//   WHATSAPP_APP_SECRET    Meta app secret - verifies X-Hub-Signature-256
//   WHATSAPP_VERIFY_TOKEN  any random string, also entered in Meta's webhook setup

export const PHONE_CODE_TTL_MS = 15 * 60 * 1000;
export const SETTING_PHONE_REQUIRED = "phone_required_for_games";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I/L

export function generatePhoneCode(): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return `LF-${s}`;
}

/** Finds a code anywhere in the message, tolerant of case and the dash being dropped. */
export function extractPhoneCode(text: string): string | null {
  const m = String(text ?? "").toUpperCase().match(/\bLF[-\s]?([A-Z0-9]{6})\b/);
  return m ? `LF-${m[1]}` : null;
}

export function normalizePhone(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "");
}

export function hashPhone(raw: string, secret: string): string {
  return createHmac("sha256", secret).update(`phone:${normalizePhone(raw)}`).digest("hex");
}

export function verifyMetaSignature(rawBody: Buffer | string | undefined, header: string | undefined, appSecret: string): boolean {
  if (!rawBody || !header || !appSecret || !header.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", appSecret).update(rawBody).digest();
  const given = Buffer.from(header.slice(7), "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Inbound text messages from a Cloud API webhook payload. */
export function parseInboundMessages(payload: any): Array<{ from: string; text: string }> {
  const out: Array<{ from: string; text: string }> = [];
  for (const entry of Array.isArray(payload?.entry) ? payload.entry : []) {
    for (const change of Array.isArray(entry?.changes) ? entry.changes : []) {
      const msgs = change?.value?.messages;
      for (const m of Array.isArray(msgs) ? msgs : []) {
        const text = m?.type === "text" ? m?.text?.body : m?.button?.text ?? m?.interactive?.button_reply?.title;
        if (typeof m?.from === "string" && typeof text === "string") out.push({ from: m.from, text });
      }
    }
  }
  return out;
}

export function whatsappConfig() {
  const number = normalizePhone(process.env.WHATSAPP_NUMBER ?? "");
  const appSecret = process.env.WHATSAPP_APP_SECRET ?? "";
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN ?? "";
  return { number, appSecret, verifyToken, configured: !!(number && appSecret && verifyToken) };
}

export function whatsappLink(number: string, code: string): string {
  return `https://wa.me/${normalizePhone(number)}?text=${encodeURIComponent(`Moj kod za potvrdu naloga na Studio LeFlow: ${code}`)}`;
}
