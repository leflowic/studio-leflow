import { test } from "node:test";
import assert from "node:assert/strict";
import { leaderboardRef, makeReferralCode, LEADERBOARD_COINS } from "../coins";
import { weeklySmartLinkReportEmail } from "../email-templates";

test("leaderboard payout refs are unique per week and place (no double payout possible)", () => {
  const refs = new Set<number>();
  const weeks = ["2026-11-23", "2026-11-30", "2026-12-07", "2027-01-04"];
  for (const w of weeks) for (let p = 1; p <= LEADERBOARD_COINS.length; p++) refs.add(leaderboardRef(w, p));
  assert.equal(refs.size, weeks.length * LEADERBOARD_COINS.length);
  assert.equal(leaderboardRef("2026-11-23", 1), leaderboardRef("2026-11-23", 1));
  assert.ok(Number.isSafeInteger(leaderboardRef("2099-12-31", 9)));
  // must fit a Postgres INTEGER column (coin_ledger.ref_id)
  assert.ok(leaderboardRef("2099-12-31", 9) < 2 ** 31);
});

test("referral codes match the format the claim route accepts", () => {
  for (let i = 0; i < 2000; i++) assert.match(makeReferralCode(), /^[a-z0-9]{4,12}$/);
});

test("weekly report email: correct Serbian plurals and escaped titles", () => {
  const html = weeklySmartLinkReportEmail({
    username: "mila",
    links: [
      { title: "Jedna", slug: "a", thisWeek: 1, lastWeek: 0, topPlatform: "spotify" },
      { title: "Tri", slug: "b", thisWeek: 3, lastWeek: 5, topPlatform: null },
      { title: "<script>alert(1)</script>", slug: "c", thisWeek: 12, lastWeek: 12, topPlatform: "youtube" },
    ],
  });
  assert.match(html, />\s*1<\/span>\s*<span[^>]*> posetilac</);
  assert.match(html, />\s*3<\/span>\s*<span[^>]*> posetioca</);
  assert.match(html, />\s*12<\/span>\s*<span[^>]*> posetilaca</);
  assert.match(html, /imali 16 posetilaca/);
  assert.ok(!html.includes("<script>alert(1)</script>"), "link titles must be HTML-escaped");
  assert.ok(html.includes("&lt;script&gt;"));
  assert.match(html, /najviše preko Spotify/);
});
