// Trusted client IP for anti-abuse limits (Ploča dana, Pogodi Pesmu, rate limits).
//
// The leftmost X-Forwarded-For entry is whatever the browser sent, so anyone
// can forge it. Proxies *append*, so we walk the list from the right and skip
// hops that are our own infrastructure: private/CGNAT ranges (Railway's
// internal network) and Cloudflare's published edge ranges (when the domain is
// proxied through Cloudflare, Railway sees a Cloudflare address, and Cloudflare
// has appended the real visitor just left of it). The first hop that is neither
// is the visitor.
//
// A visitor can't promote a forged hop: whatever they send stays left of the
// address our edge appends for them, and their own address is not in a
// trusted range.
//
// Express uses the same rule (`app.set("trust proxy", isTrustedProxy)` in
// index.ts), so `req.ip` - and every express-rate-limit limiter keyed on it -
// gets the same visitor address as getTrustedClientIp().
//
// Cloudflare ranges: https://www.cloudflare.com/ips-v4 and /ips-v6 (checked
// 2026-11-26). They change rarely; update this list if Cloudflare announces new ones.

const PRIVATE_V4 = [/^10\./, /^127\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^169\.254\./, /^0\./];

const CLOUDFLARE_V4 = [
  "173.245.48.0/20", "103.21.244.0/22", "103.22.200.0/22", "103.31.4.0/22", "141.101.64.0/18",
  "108.162.192.0/18", "190.93.240.0/20", "188.114.96.0/20", "197.234.240.0/22", "198.41.128.0/17",
  "162.158.0.0/15", "104.16.0.0/13", "104.24.0.0/14", "172.64.0.0/13", "131.0.72.0/22",
];
const CLOUDFLARE_V6 = [
  "2400:cb00::/32", "2606:4700::/32", "2803:f800::/32", "2405:b500::/32",
  "2405:8100::/32", "2a06:98c0::/29", "2c0f:f248::/32",
];

function normalize(ip: string): string {
  return ip.trim().replace(/^::ffff:/i, "");
}

function v4ToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = Number(p);
    if (!/^\d{1,3}$/.test(p) || v > 255) return null;
    n = n * 256 + v;
  }
  return n;
}

function v6ToBigInt(ip: string): bigint | null {
  if (!ip.includes(":")) return null;
  const [head, tail] = ip.toLowerCase().split("::");
  const h = head ? head.split(":") : [];
  const t = tail !== undefined ? (tail ? tail.split(":") : []) : [];
  if (tail === undefined && h.length !== 8) return null;
  const groups = tail === undefined ? h : [...h, ...Array(8 - h.length - t.length).fill("0"), ...t];
  if (groups.length !== 8) return null;
  let n = 0n;
  for (const g of groups) {
    if (!/^[0-9a-f]{1,4}$/.test(g)) return null;
    n = (n << 16n) + BigInt(parseInt(g, 16));
  }
  return n;
}

const CF_V4 = CLOUDFLARE_V4.map(c => {
  const [base, bits] = c.split("/");
  const b = Number(bits);
  return { base: v4ToInt(base!)!, size: 2 ** (32 - b) };
});
const CF_V6 = CLOUDFLARE_V6.map(c => {
  const [base, bits] = c.split("/");
  const shift = BigInt(128 - Number(bits));
  return { prefix: v6ToBigInt(base!)! >> shift, shift };
});

export function isCloudflareIp(raw: string): boolean {
  const ip = normalize(raw);
  const n4 = v4ToInt(ip);
  if (n4 !== null) return CF_V4.some(r => n4 >= r.base && n4 < r.base + r.size);
  const n6 = v6ToBigInt(ip);
  if (n6 !== null) return CF_V6.some(r => n6 >> r.shift === r.prefix);
  return false;
}

function isPrivate(raw: string): boolean {
  const v = normalize(raw);
  if (PRIVATE_V4.some(r => r.test(v))) return true;
  const lower = v.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

/** Our own infrastructure: Railway's internal network or a Cloudflare edge. */
export function isTrustedProxy(raw: string): boolean {
  return isPrivate(raw) || isCloudflareIp(raw);
}

export function getTrustedClientIp(req: any): string | null {
  const xff = req.headers?.["x-forwarded-for"];
  const hops = typeof xff === "string" ? xff.split(",").map((h: string) => h.trim()).filter(Boolean) : [];
  for (let i = hops.length - 1; i >= 0; i--) {
    const hop = hops[i]!;
    if (!isTrustedProxy(hop)) return normalize(hop);
  }
  const direct = String(req.socket?.remoteAddress ?? "");
  return direct && !isTrustedProxy(direct) ? normalize(direct) : null;
}
