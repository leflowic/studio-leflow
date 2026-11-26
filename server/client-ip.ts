// Trusted client IP for anti-abuse limits (Ploča dana, Pogodi Pesmu, rate limits).
//
// How Railway forwards a request (measured in production 2026-11-26 with a
// temporary echo endpoint):
//   - Railway's edge DROPS any X-Forwarded-For the visitor sends and writes its
//     own: "<address that connected to Railway>, <Railway's own edge address>".
//     The last hop is Railway's edge (public addresses, e.g. AS60068) - not the
//     visitor. The old "rightmost public hop" rule therefore returned Railway's
//     edge for everyone, lumping visitors together in every per-IP limit.
//   - So the visitor (or whoever connected) is the hop LEFT of the last one.
//   - Behind Cloudflare, the address that connected to Railway is a Cloudflare
//     edge; the real visitor is in the CF-Connecting-IP header. That header is
//     only trusted when the connecting address really is a Cloudflare edge -
//     sent straight to Railway it is ignored (anyone can set it).
//
// index.ts overrides req.ip with this value, so express-rate-limit and every
// other req.ip user get the same visitor address.
//
// Cloudflare ranges: https://www.cloudflare.com/ips-v4 and /ips-v6 (checked
// 2026-11-26). They change rarely; update this list if Cloudflare announces new ones.

import net from "node:net";

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
  return { base: v4ToInt(base!)!, size: 2 ** (32 - Number(bits)) };
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

export function getTrustedClientIp(req: any): string | null {
  const xff = req.headers?.["x-forwarded-for"];
  const hops: string[] = typeof xff === "string" ? xff.split(",").map((h: string) => normalize(h)).filter(Boolean) : [];

  // Drop the last hop (Railway's own edge) when there is more than one, then
  // skip any internal hops: what remains on the right is who connected.
  const candidates = hops.length > 1 ? hops.slice(0, -1) : hops;
  let peer: string | null = null;
  for (let i = candidates.length - 1; i >= 0; i--) {
    if (!isPrivate(candidates[i]!)) { peer = candidates[i]!; break; }
  }
  if (!peer) {
    const direct = normalize(String(req.socket?.remoteAddress ?? ""));
    peer = direct && !isPrivate(direct) ? direct : null;
  }
  if (!peer) return null;

  // Through Cloudflare: the real visitor is in CF-Connecting-IP - trusted only
  // when the connection really came from a Cloudflare edge.
  if (isCloudflareIp(peer)) {
    const cf = req.headers?.["cf-connecting-ip"];
    const ip = typeof cf === "string" ? normalize(cf) : "";
    return ip && net.isIP(ip) && !isPrivate(ip) ? ip : null;
  }
  return peer;
}
