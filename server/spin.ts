import { randomInt } from "crypto";

// "Ploča dana" - one spin per verified user per Belgrade day. The outcome is
// decided here, on the server; the client only animates to the result it gets
// back, so there is nothing to cheat on the client side.
//
// The studio voucher (50% off recording + mix/master, owner decision
// 2026-11-26) is capped at STUDIO_PRIZES_PER_MONTH across the whole site, and
// its chance is spread over the month (remaining prizes / expected remaining
// spins) so both prizes don't get won in the first two days.

export const STUDIO_PRIZES_PER_MONTH = 2;
export const STUDIO_MIN_ACCOUNT_DAYS = 7;   // fresh accounts can spin, but can't win the studio voucher
export const STUDIO_WIN_COOLDOWN_DAYS = 365; // one studio voucher per person (account AND IP) per year

// settings-table keys for the admin switches (absent = on)
export const SETTING_SPIN_ENABLED = "spin_enabled";
export const SETTING_STUDIO_PRIZE_ENABLED = "spin_studio_prize_enabled";
export const VOUCHER_VALID_DAYS = 60;
export const SPIN_POINTS = 5; // must match the daily_spins term in server/activity.ts
const STUDIO_MAX_CHANCE = 0.08;

export type SpinReward = "studio_50" | "extra_listen" | "feature_post" | "points" | "nothing";

export const SPIN_REWARDS: Record<SpinReward, { title: string; detail: string }> = {
  studio_50: { title: "50% popusta na snimanje + mix/master", detail: "Vaučer važi 60 dana, vezan je za tvoj nalog." },
  extra_listen: { title: "+1 slušanje u Pogodi Pesmu", detail: "Važi za današnju igru." },
  feature_post: { title: "Istaknuta objava", detail: "Tvoja poslednja objava stoji na vrhu zajednice 24 sata." },
  // Retired 2026-11-26 (owner: no rank points from the spin). Kept only so old
  // history rows still render; it is no longer in BASE_WEIGHTS.
  points: { title: `+${SPIN_POINTS} bodova za rang`, detail: "Već su dodati na tvoj nalog." },
  nothing: { title: "Prazna strana", detail: "Ovaj put ništa. Ploča se okreće ponovo sutra." },
};

const BASE_WEIGHTS: Partial<Record<Exclude<SpinReward, "studio_50">, number>> & { nothing: number } = {
  extra_listen: 35,
  feature_post: 20,
  nothing: 45,
};

export type SpinContext = {
  canExtraListen: boolean;   // today's challenge exists and the user hasn't guessed yet
  hasPosts: boolean;         // feature_post needs something to feature
  studioPrizesLeft: number;  // this month, site-wide
  expectedSpinsLeft: number; // rough estimate for the rest of the month
};

export function studioChance(ctx: Pick<SpinContext, "studioPrizesLeft" | "expectedSpinsLeft">): number {
  if (ctx.studioPrizesLeft <= 0) return 0;
  return Math.min(STUDIO_MAX_CHANCE, ctx.studioPrizesLeft / Math.max(ctx.studioPrizesLeft, ctx.expectedSpinsLeft));
}

export function pickReward(ctx: SpinContext): SpinReward {
  // crypto-grade randomness; 1e6 buckets is plenty of resolution for the chances here
  const roll = randomInt(0, 1_000_000) / 1_000_000;
  if (roll < studioChance(ctx)) return "studio_50";

  const weights = { ...BASE_WEIGHTS };
  // An ineligible reward falls through to "nothing" rather than inflating the others.
  if (!ctx.canExtraListen) { weights.nothing += weights.extra_listen ?? 0; weights.extra_listen = 0; }
  if (!ctx.hasPosts) { weights.nothing += weights.feature_post ?? 0; weights.feature_post = 0; }

  const total = Object.values(weights).reduce((a, b) => a + (b ?? 0), 0);
  let r = randomInt(0, total);
  for (const [key, w] of Object.entries(weights).map(([k, v]) => [k, v ?? 0]) as Array<[SpinReward, number]>) {
    if (r < w) return key;
    r -= w;
  }
  return "nothing";
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
export function generateVoucherCode(): string {
  const part = () => Array.from({ length: 4 }, () => CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]).join("");
  return `LF-${part()}-${part()}`;
}

/** Days left in the current Belgrade month, today included. */
export function daysLeftInMonth(today: string): number {
  const [y = 1970, m = 1, d = 1] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return last - d + 1;
}

// ── Client IP for the one-spin-per-IP rule ───────────────────────────────────
// The leftmost X-Forwarded-For entry is whatever the browser sent, so anyone
// can forge it. Proxies *append*, so we walk the list from the right and take
// the first public address - that's the one Railway's edge saw. Private/CGNAT
// ranges are skipped so an internal hop is never mistaken for the client
// (which would put every visitor behind one shared IP).
const PRIVATE_V4 = [/^10\./, /^127\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^169\.254\./, /^0\./];
function isPrivate(ip: string): boolean {
  const v = ip.replace(/^::ffff:/, "");
  if (PRIVATE_V4.some(r => r.test(v))) return true;
  const lower = v.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
}

export function getSpinIp(req: any): string | null {
  const xff = req.headers?.["x-forwarded-for"];
  const hops = typeof xff === "string" ? xff.split(",").map((h: string) => h.trim()).filter(Boolean) : [];
  for (let i = hops.length - 1; i >= 0; i--) {
    const hop = hops[i]!;
    if (!isPrivate(hop)) return hop.replace(/^::ffff:/, "");
  }
  const direct = String(req.socket?.remoteAddress ?? "");
  return direct && !isPrivate(direct) ? direct.replace(/^::ffff:/, "") : null;
}
