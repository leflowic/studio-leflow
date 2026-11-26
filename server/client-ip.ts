// Trusted client IP for anti-abuse limits (Ploča dana, Pogodi Pesmu).
//
// The leftmost X-Forwarded-For entry is whatever the browser sent, so anyone
// can forge it. Proxies *append*, so we walk the list from the right and take
// the first public address - that's the one Railway's edge saw. Private/CGNAT
// ranges are skipped so an internal hop is never mistaken for the client
// (which would put every visitor behind one shared IP).
//
// Use this for anything a limit depends on. getClientIp() in routes.ts takes
// the leftmost hop and is only fine for low-stakes stats (smart link clicks).

const PRIVATE_V4 = [/^10\./, /^127\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^169\.254\./, /^0\./];

function isPrivate(ip: string): boolean {
  const v = ip.replace(/^::ffff:/, "");
  if (PRIVATE_V4.some(r => r.test(v))) return true;
  const lower = v.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

export function getTrustedClientIp(req: any): string | null {
  const xff = req.headers?.["x-forwarded-for"];
  const hops = typeof xff === "string" ? xff.split(",").map((h: string) => h.trim()).filter(Boolean) : [];
  for (let i = hops.length - 1; i >= 0; i--) {
    const hop = hops[i]!;
    if (!isPrivate(hop)) return hop.replace(/^::ffff:/, "");
  }
  const direct = String(req.socket?.remoteAddress ?? "");
  return direct && !isPrivate(direct) ? direct.replace(/^::ffff:/, "") : null;
}
