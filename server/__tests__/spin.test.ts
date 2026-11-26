import { test } from "node:test";
import assert from "node:assert/strict";
import { pickReward, BASE_WEIGHTS, COIN_REWARDS, SPIN_REWARDS, generateVoucherCode, type SpinReward } from "../spin";

const N = 40_000;
function draw(ctx: { canExtraListen: boolean; hasPosts: boolean }, n = N) {
  const counts: Record<string, number> = {};
  for (let i = 0; i < n; i++) {
    const r = pickReward(ctx);
    counts[r] = (counts[r] ?? 0) + 1;
  }
  return counts;
}

test("retired rewards (studio_50, points) can never be drawn", () => {
  const c = draw({ canExtraListen: true, hasPosts: true });
  assert.equal(c.studio_50 ?? 0, 0);
  assert.equal(c.points ?? 0, 0);
});

test("ineligible perks are never drawn and fall through to 'nothing'", () => {
  const c = draw({ canExtraListen: false, hasPosts: false });
  assert.equal(c.extra_listen ?? 0, 0);
  assert.equal(c.feature_post ?? 0, 0);
  const total = Object.values(BASE_WEIGHTS).reduce((a, b) => a + (b ?? 0), 0);
  const expectedNothing = (BASE_WEIGHTS.nothing + (BASE_WEIGHTS.extra_listen ?? 0) + (BASE_WEIGHTS.feature_post ?? 0)) / total;
  assert.ok(Math.abs((c.nothing ?? 0) / N - expectedNothing) < 0.02, `nothing share ${(c.nothing ?? 0) / N} vs ${expectedNothing}`);
});

test("draw frequencies match BASE_WEIGHTS (±2 percentage points)", () => {
  const c = draw({ canExtraListen: true, hasPosts: true });
  const total = Object.values(BASE_WEIGHTS).reduce((a, b) => a + (b ?? 0), 0);
  for (const [k, w] of Object.entries(BASE_WEIGHTS)) {
    const share = (c[k] ?? 0) / N;
    assert.ok(Math.abs(share - (w ?? 0) / total) < 0.02, `${k}: ${share} vs ${(w ?? 0) / total}`);
  }
});

test("every weighted reward has a user-facing title, and coin titles match their amounts", () => {
  for (const k of Object.keys(BASE_WEIGHTS) as SpinReward[]) {
    assert.ok(SPIN_REWARDS[k]?.title, `missing title for ${k}`);
  }
  for (const [k, amount] of Object.entries(COIN_REWARDS)) {
    assert.equal(SPIN_REWARDS[k as SpinReward].title, `+${amount} SC`);
  }
});

test("expected coin payout per spin stays in the range shop prices were set for (≈8.75 SC)", () => {
  const total = Object.values(BASE_WEIGHTS).reduce((a, b) => a + (b ?? 0), 0);
  const ev = Object.entries(COIN_REWARDS).reduce((a, [k, amt]) => a + (amt ?? 0) * ((BASE_WEIGHTS as any)[k] ?? 0) / total, 0);
  assert.ok(ev > 6 && ev < 12, `expected value ${ev} SC/spin - re-check shop prices if this moves`);
});

test("voucher codes: LF-XXXX-XXXX, no ambiguous characters, no collisions in 20k", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 20_000; i++) {
    const code = generateVoucherCode();
    assert.match(code, /^LF-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    seen.add(code);
  }
  assert.equal(seen.size, 20_000);
});
