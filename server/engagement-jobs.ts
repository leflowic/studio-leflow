import { storage } from "./storage";
import { sendPushToAll, sendPushToUser } from "./push";
import { notifyUser } from "./websocket-helpers";
import { findRankUpgrades } from "./activity";

// Background jobs that bring people back: game reminder, challenge deadline
// reminder, and earned-rank upgrades. Runs in-process on a 1-minute tick.
// "Already sent" markers live in the settings table, so a redeploy or restart
// mid-window can't send the same reminder twice.

function belgradeNow() {
  const now = new Date();
  const local = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
  const today = new Intl.DateTimeFormat("sv", { timeZone: "Europe/Belgrade" }).format(now);
  return { minutes: local.getHours() * 60 + local.getMinutes(), hour: local.getHours(), today };
}

function addDays(date: string, days: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function once(key: string, value: string, fn: () => Promise<void>) {
  const prev = await storage.getSetting(key);
  if (prev?.value === value) return;
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
      sendPushToAll({ title: "Pogodi Pesmu", body: `Današnja igra počinje u ${hh}:${mm}. Imaš jedan pokušaj.`, url: "/igra", tag: "game" }),
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
    sendPushToAll({ title: "Izazov meseca ističe sutra", body: theme.value, url: "/giveaway", tag: "challenge" }),
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
    sendPushToUser(u.userId, { title: `Novi rang: ${label}`, body: "Zaradio/la si ga aktivnošću na sajtu.", url: "/dashboard", tag: "rank" });
  }
  if (upgrades.length) console.log(`[Rank] upgraded ${upgrades.length} user(s)`);
}

export function startEngagementJobs() {
  const tick = async () => {
    for (const job of [gameReminder, challengeDeadlineReminder, rankUpgrades]) {
      try { await job(); } catch (e) { console.error(`[Jobs] ${job.name} failed:`, e); }
    }
  };
  // First run shortly after boot, then every minute
  setTimeout(tick, 30_000);
  setInterval(tick, 60_000);
}
