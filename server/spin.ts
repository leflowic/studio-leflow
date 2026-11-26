import { randomInt } from "crypto";

// "Ploča dana" - one spin per verified user per Belgrade day. The outcome is
// decided here, on the server; the client only animates to the result it gets
// back, so there is nothing to cheat on the client side.
//
// Since 2026-11-26 the record pays out Studio Coins (SC) plus two small site
// perks. Studio discounts are no longer won on the record - they are bought
// with coins in the shop (owner decision), which keeps the number of discounts
// in the owner's hands (prices + monthly stock in admin "Prodavnica").

// settings-table keys for the admin switches (absent = on)
export const SETTING_SPIN_ENABLED = "spin_enabled";
export const SETTING_SHOP_ENABLED = "shop_enabled";
// "one per network per day" limits, switchable from the admin "Zaštita igara" tab (absent = on)
export const SETTING_SPIN_IP_LIMIT = "spin_ip_limit";
export const SETTING_GAME_IP_LIMIT = "game_ip_limit";

export const VOUCHER_VALID_DAYS = 60;
export const STUDIO_MIN_ACCOUNT_DAYS = 7; // shop: studio vouchers need an account at least this old
export const GAME_CORRECT_COINS = 10;     // Studio Coins for a correct Pogodi Pesmu answer
export const SPIN_POINTS = 5;             // retired reward, see SPIN_REWARDS.points

export type SpinReward =
  | "coins_5" | "coins_10" | "coins_25" | "coins_50" | "coins_100"
  | "extra_listen" | "feature_post" | "nothing"
  // retired - kept only so old history rows still render
  | "studio_50" | "points";

export const COIN_REWARDS: Partial<Record<SpinReward, number>> = {
  coins_5: 5, coins_10: 10, coins_25: 25, coins_50: 50, coins_100: 100,
};

export const SPIN_REWARDS: Record<SpinReward, { title: string; detail: string }> = {
  coins_5: { title: "+5 SC", detail: "Studio Coins su dodati u tvoj novčanik." },
  coins_10: { title: "+10 SC", detail: "Studio Coins su dodati u tvoj novčanik." },
  coins_25: { title: "+25 SC", detail: "Lep dobitak - coini su već u novčaniku." },
  coins_50: { title: "+50 SC", detail: "Odličan dobitak - coini su već u novčaniku." },
  coins_100: { title: "+100 SC", detail: "Glavni dobitak! Coini su već u novčaniku." },
  extra_listen: { title: "+1 slušanje u Pogodi Pesmu", detail: "Važi za današnju igru." },
  feature_post: { title: "Istaknuta objava", detail: "Tvoja poslednja objava stoji na vrhu zajednice 24 sata." },
  nothing: { title: "Prazna strana", detail: "Ovaj put ništa. Ploča se okreće ponovo sutra." },
  studio_50: { title: "50% popusta na snimanje + mix/master", detail: "Vaučer važi 60 dana, vezan je za tvoj nalog." },
  points: { title: `+${SPIN_POINTS} bodova za rang`, detail: "Već su dodati na tvoj nalog." },
};

// Expected payout ≈ 8.75 SC per spin; with correct game answers a regular
// player earns roughly 300-450 SC a month. Shop prices were set against that.
const BASE_WEIGHTS: Partial<Record<SpinReward, number>> & { nothing: number } = {
  coins_5: 25,
  coins_10: 20,
  coins_25: 10,
  coins_50: 4,
  coins_100: 1,
  extra_listen: 12,
  feature_post: 8,
  nothing: 20,
};

export type SpinContext = {
  canExtraListen: boolean; // today's challenge exists and the user hasn't guessed yet
  hasPosts: boolean;       // feature_post needs something to feature
};

export function pickReward(ctx: SpinContext): SpinReward {
  const weights = { ...BASE_WEIGHTS };
  // An ineligible perk falls through to "nothing" rather than inflating the others.
  if (!ctx.canExtraListen) { weights.nothing += weights.extra_listen ?? 0; weights.extra_listen = 0; }
  if (!ctx.hasPosts) { weights.nothing += weights.feature_post ?? 0; weights.feature_post = 0; }

  const entries = Object.entries(weights).map(([k, v]) => [k, v ?? 0]) as Array<[SpinReward, number]>;
  const total = entries.reduce((a, [, w]) => a + w, 0);
  let r = randomInt(0, total); // crypto-grade randomness
  for (const [key, w] of entries) {
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

// Client IP: see server/client-ip.ts (rightmost public X-Forwarded-For hop).
export { getTrustedClientIp as getSpinIp } from "./client-ip";
