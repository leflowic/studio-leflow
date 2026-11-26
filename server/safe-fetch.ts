import { lookup } from "node:dns/promises";
import net from "node:net";

// Fetching a URL a user typed (chat link previews) from our server is an SSRF risk:
// without checks anyone could make the server request localhost, the cloud metadata
// address or the private network, or stream a huge file into memory. safeFetchHtml
// only talks to public addresses on standard ports, re-checks every redirect hop,
// only accepts HTML and stops reading after maxBytes.

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((acc, p) => (acc << 8) + Number(p), 0) >>> 0;
}

const V4_BLOCKED: Array<[string, number]> = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 3], // multicast + reserved + broadcast (224.0.0.0 - 255.255.255.255)
];

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const n = ipv4ToInt(ip);
    return V4_BLOCKED.some(([base, bits]) => {
      const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
      return (n & mask) === (ipv4ToInt(base) & mask);
    });
  }
  if (net.isIPv6(ip)) {
    const v = ip.toLowerCase();
    if (v === "::" || v === "::1") return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]!);
    if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(v)) return true; // hex-form mapped v4 - just refuse
    if (/^f[cd]/.test(v)) return true;          // fc00::/7 unique local
    if (/^fe[89ab]/.test(v)) return true;       // fe80::/10 link local
    if (v.startsWith("64:ff9b:")) return true;  // NAT64 can reach v4 internals
    if (v.startsWith("ff")) return true;        // multicast
    return false;
  }
  return true; // not an IP at all - refuse
}

export async function assertPublicUrl(raw: string): Promise<URL> {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("bad url"); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("bad protocol");
  if (u.username || u.password) throw new Error("credentials in url");
  if (u.port && u.port !== "80" && u.port !== "443") throw new Error("non-standard port");
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("internal host");
  }
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  if (!addrs.length || addrs.some(a => isPrivateAddress(a.address))) throw new Error("private address");
  return u;
}

export async function safeFetchHtml(raw: string, opts: { timeoutMs?: number; maxBytes?: number; maxRedirects?: number } = {}): Promise<{ url: string; html: string }> {
  const { timeoutMs = 4000, maxBytes = 512 * 1024, maxRedirects = 3 } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let current = raw;
    for (let hop = 0; hop <= maxRedirects; hop++) {
      const u = await assertPublicUrl(current);
      const res = await fetch(u, {
        signal: controller.signal,
        redirect: "manual",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; LinkPreview/1.0)", Accept: "text/html" },
      });
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        res.body?.cancel().catch(() => {});
        if (!loc) throw new Error("redirect without location");
        current = new URL(loc, u).toString();
        continue;
      }
      if (!res.ok) throw new Error(`status ${res.status}`);
      const type = res.headers.get("content-type") ?? "";
      if (!type.includes("text/html") && !type.includes("application/xhtml")) {
        res.body?.cancel().catch(() => {});
        throw new Error("not html");
      }
      const reader = res.body?.getReader();
      if (!reader) return { url: u.toString(), html: "" };
      const chunks: Uint8Array[] = [];
      let total = 0;
      while (total < maxBytes) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        total += value.byteLength;
      }
      reader.cancel().catch(() => {});
      const buf = Buffer.concat(chunks.map(c => Buffer.from(c))).subarray(0, maxBytes);
      return { url: u.toString(), html: buf.toString("utf8") };
    }
    throw new Error("too many redirects");
  } finally {
    clearTimeout(timer);
  }
}
