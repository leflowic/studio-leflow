import { storage } from "./storage";
import { sendPushToAll, sendPushToUser, wantsNotification } from "./push";
import { notifyUser } from "./websocket-helpers";
import { findRankUpgrades } from "./activity";
import { REFERRAL_COINS, SPIN_STREAK_DAYS, SPIN_STREAK_COINS } from "./coins";
import { sendEmail } from "./resend-client";
import { weeklySmartLinkReportEmail } from "./email-templates";

// Background jobs that bring people back: game reminder, challenge deadline
// reminder, earned-rank upgrades, Ploča dana streak reminder, weekly
// Pogodi Pesmu coin prizes, the weekly smart link report and referral payouts. Runs in-process on a 1-minute tick.
// "Already sent" markers live in the settings table, so a redeploy or restart
// mid-window can't send the same reminder twice.

function belgradeNow() {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
  const today = new Intl.DateTimeFormat("sv", { timeZone: "Europe/Belgrade" }).format(now);
  return { minutes: local.getHours() * 60 + local.getMinutes(), hour: local.getHours(), today, weekday: local.getDay() };
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Remembers in memory what already ran today, so the minute tick doesn't re-read
// the same setting from the DB all day (the DB stays the source of truth after a restart).
const doneCache = new Map<string, string>();
async function once(key: string, value: string, fn: () => Promise<void>) {
  if (doneCache.get(key) === value) return;
  const prev = await storage.getSetting(key);
  if (prev?.value === value) { doneCache.set(key, value); return; }
  doneCache.set(key, value);
  await storage.setSetting(key, value);
  await fn();
}

async function gameReminder() {
  const { minutes, today } = belgradeNow();
  const challenge = await storage.getTodayChallenge();
  if (!challenge?.clipUrl) return;
  const open = challenge.openHour * 60 + challenge.openMinute;
  const until = open - minutes;
  if (until > 0 && until <= 10) {
    const hh = String(challenge.openHour).padStart(2, "0");
    const mm = String(challenge.openMinute).padStart(2, "0");
    await once("push_sent_game", today, () =>
      sendPushToAll({ title: "Pogodi Pesmu", body: `Današnja igra počinje u ${hh}:${mm}. Imaš jedan pokušaj.`, url: "/igra", tag: "game", category: "game" }),
    );
  }
}

async function challengeDeadlineReminder() {
  const { hour, today } = belgradeNow();
  if (hour < 12) return; // send around midday, not at midnight
  const [theme, deadline] = await Promise.all([storage.getSetting("challenge_theme"), storage.getSetting("challenge_deadline")]);
  if (!theme?.value || !deadline?.value) return;
  if (deadline.value !== addDays(today, 1)) return;
  await once("push_sent_challenge_deadline", deadline.value, () =>
    sendPushToAll({ title: "Izazov meseca ističe sutra", body: theme.value, url: "/giveaway", tag: "challenge", category: "challenge" }),
  );
}

const RANK_LABEL: Record<string, string> = { vip: "VIP", legend: "Legenda" };
let lastRankRun = 0;

async function rankUpgrades() {
  if (Date.now() - lastRankRun < 60 * 60 * 1000) return;
  lastRankRun = Date.now();
  const upgrades = await findRankUpgrades();
  for (const u of upgrades) {
    await storage.updateUserRank(u.userId, u.to);
    const label = RANK_LABEL[u.to];
    notifyUser(u.userId, `Novi rang: ${label}`, "Zaradio/la si ga aktivnošću na sajtu. Hvala što si tu.");
    sendPushToUser(u.userId, { title: `Novi rang: ${label}`, body: "Zaradio/la si ga aktivnošću na sajtu.", url: "/dashboard", tag: "rank", category: "rewards" });
  }
  if (upgrades.length) console.log(`[Rank] upgraded ${upgrades.length} user(s)`);
}

// 20:00 Belgrade: people with a Ploča streak of 2+ days who haven't spun today.
async function spinStreakReminder() {
  const { hour, today } = belgradeNow();
  if (hour < 20) return;
  await once("push_sent_spin_streak", today, async () => {
    const targets = await storage.getSpinStreakReminderTargets(today);
    for (const t of targets) {
      const left = SPIN_STREAK_DAYS - (t.streak % SPIN_STREAK_DAYS);
      const body = left === 1
        ? `Niz od ${t.streak} dana - danas je ${SPIN_STREAK_DAYS}. dan i bonus od ${SPIN_STREAK_COINS} SC.`
        : `Ne prekidaj niz od ${t.streak} dana. Ploča se resetuje u ponoć.`;
      await sendPushToUser(t.userId, { title: "Ploča dana te čeka", body, url: "/ploca", tag: "spin-streak", category: "spin" });
    }
    if (targets.length) console.log(`[Spin] streak reminders sent: ${targets.length}`);
  });
}

// Monday after midnight: coins for last week's Pogodi Pesmu top 3.
async function weeklyLeaderboardCoins() {
  const { weekday, today } = belgradeNow();
  if (weekday !== 1) return;
  const lastWeekStart = addDays(today, -7);
  await once("coins_leaderboard_paid", lastWeekStart, async () => {
    const paid = await storage.payWeeklyLeaderboard(lastWeekStart);
    for (const p of paid) {
      notifyUser(p.userId, `+${p.coins} SC`, `${p.place}. mesto u Pogodi Pesmu prošle nedelje.`);
      await sendPushToUser(p.userId, { title: `${p.place}. mesto prošle nedelje`, body: `Pogodi Pesmu: +${p.coins} Studio Coins su u tvom novčaniku.`, url: "/prodavnica", tag: "coins", category: "rewards" });
    }
    console.log(`[Coins] weekly leaderboard ${lastWeekStart}: paid ${paid.length}`);
  });
}

// Monday 10:00: "Tvoja muzika prošle nedelje" for smart link owners.
async function weeklySmartLinkReport() {
  const { weekday, hour, today } = belgradeNow();
  if (weekday !== 1 || hour < 10) return;
  await once("weekly_report_sent", today, async () => {
    // this Monday 00:00 Belgrade, as a UTC instant
    const offsetH = Number(new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Belgrade", timeZoneName: "shortOffset" })
      .formatToParts(new Date()).find(p => p.type === "timeZoneName")?.value.replace("GMT", "") || "1");
    const monday = new Date(`${today}T00:00:00Z`);
    monday.setUTCHours(monday.getUTCHours() - offsetH);
    const owners = await storage.getWeeklySmartLinkReport(monday);
    let sent = 0;
    for (const o of owners) {
      if (!(await wantsNotification(o.userId, "weekly_report"))) continue;
      const total = o.links.reduce((a, l) => a + l.thisWeek, 0);
      try {
        await sendEmail({ to: o.email, subject: "Tvoja muzika prošle nedelje", html: weeklySmartLinkReportEmail({ username: o.username, links: o.links }) });
        sent++;
      } catch (e) {
        console.error(`[Report] email to user ${o.userId} failed:`, e);
      }
      await sendPushToUser(o.userId, { title: "Tvoja muzika prošle nedelje", body: `${total} posetilaca na tvojim smart linkovima.`, url: "/dashboard", tag: "weekly-report", category: "weekly_report" });
    }
    console.log(`[Report] weekly smart link report: ${sent}/${owners.length} emails`);
  });
}

// 04:00 Belgrade, daily: drop anti-abuse IP addresses older than 90 days (privacy).
async function purgeOldIps() {
  const { hour, today } = belgradeNow();
  if (hour < 4) return;
  await once("privacy_ip_purge", today, async () => {
    const r = await storage.purgeOldIps(90);
    const errors = await storage.purgeOldErrors();
    console.log(`[Privacy] old IPs purged: ${JSON.stringify(r)}; old error log rows removed: ${errors}`);
  });
}

// Hourly: pay referrals whose invitee became active (or block same-network pairs).
let lastReferralRun = 0;
async function referralPayouts() {
  if (Date.now() - lastReferralRun < 60 * 60 * 1000) return;
  lastReferralRun = Date.now();
  const done = await storage.processReferrals();
  for (const d of done) {
    if (d.status === "blocked") continue;
    notifyUser(d.inviteeId, `+${REFERRAL_COINS} SC`, "Dobrodošlica od prijatelja koji te je pozvao.");
    await sendPushToUser(d.inviteeId, { title: `+${REFERRAL_COINS} Studio Coins`, body: "Dobrodošlica od prijatelja koji te je pozvao.", url: "/prodavnica", tag: "coins", category: "rewards" });
    if (d.status === "rewarded") {
      notifyUser(d.inviterId, `+${REFERRAL_COINS} SC`, "Prijatelj kog si pozvao je aktivan na sajtu.");
      await sendPushToUser(d.inviterId, { title: `+${REFERRAL_COINS} Studio Coins`, body: "Prijatelj kog si pozvao je aktivan na sajtu.", url: "/prodavnica", tag: "coins", category: "rewards" });
    }
  }
  if (done.length) console.log(`[Referral] processed ${done.length}: ${done.map(d => d.status).join(", ")}`);
}

export function startEngagementJobs() {
  const tick = async () => {
    for (const job of [gameReminder, challengeDeadlineReminder, rankUpgrades, spinStreakReminder, weeklyLeaderboardCoins, weeklySmartLinkReport, referralPayouts, purgeOldIps]) {
      try { await job(); } catch (e) { console.error(`[Jobs] ${job.name} failed:`, e); }
    }
  };
  // First run shortly after boot, then every minute
  setTimeout(tick, 30_000);
  setInterval(tick, 60_000);
}
