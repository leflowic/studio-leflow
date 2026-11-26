import webpush from "web-push";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { storage } from "./storage";
import { pushSubscriptions, users, type NotificationCategory } from "@shared/schema";
import { wsHelpers } from "./websocket-helpers";

// Web Push. VAPID keys are generated once on first startup and kept in the
// `settings` table (key "vapid_keys"), so no extra Railway env vars are needed
// and keys survive redeploys. Rotating them would invalidate every existing
// browser subscription - don't delete that setting.

export type PushPayload = {
  title: string;
  body: string;
  url?: string;   // where clicking the notification opens (same-origin path or absolute URL)
  tag?: string;   // same tag replaces an older notification instead of stacking
  // Per-user opt-out bucket (Podešavanja → Obaveštenja). Without a category the
  // push always goes out (e.g. the "push is on" confirmation).
  category?: NotificationCategory;
};

/** True unless the user switched this category off in Podešavanja. */
export async function wantsNotification(userId: number, category: NotificationCategory | undefined): Promise<boolean> {
  if (!category) return true;
  const [u] = await db.select({ prefs: users.notificationPrefs }).from(users).where(eq(users.id, userId));
  return (u?.prefs as Record<string, boolean> | null | undefined)?.[category] !== false;
}

let publicKey: string | null = null;
let ready = false;

export async function initPush(): Promise<void> {
  try {
    let keys: { publicKey: string; privateKey: string } | null = null;
    const stored = await storage.getSetting("vapid_keys");
    if (stored?.value) {
      try { keys = JSON.parse(stored.value); } catch { keys = null; }
    }
    if (!keys?.publicKey || !keys?.privateKey) {
      keys = webpush.generateVAPIDKeys();
      await storage.setSetting("vapid_keys", JSON.stringify(keys));
      console.log("[Push] Generated new VAPID keys");
    }
    webpush.setVapidDetails("mailto:podrska@studioleflow.com", keys.publicKey, keys.privateKey);
    publicKey = keys.publicKey;
    ready = true;
  } catch (e) {
    console.error("[Push] init failed, push disabled:", e);
  }
}

export function getVapidPublicKey(): string | null {
  return publicKey;
}

export async function saveSubscription(userId: number, sub: { endpoint: string; keys: { p256dh: string; auth: string } }) {
  await db
    .insert(pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
}

export async function removeSubscription(endpoint: string, userId: number) {
  const rows = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  if (rows[0] && rows[0].userId === userId) {
    await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  }
}

export async function hasSubscription(userId: number): Promise<boolean> {
  const rows = await db.select({ id: pushSubscriptions.id }).from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId)).limit(1);
  return rows.length > 0;
}

async function deliver(rows: Array<typeof pushSubscriptions.$inferSelect>, payload: PushPayload) {
  if (!ready || !rows.length) return;
  const body = JSON.stringify(payload);
  const dead: number[] = [];
  await Promise.all(rows.map(async (r) => {
    try {
      await webpush.sendNotification(
        { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
        body,
        { TTL: 60 * 60 * 6 },
      );
    } catch (e: any) {
      // 404/410: the browser dropped this subscription (unsubscribed, cleared data, uninstalled)
      if (e?.statusCode === 404 || e?.statusCode === 410) dead.push(r.id);
      else console.error("[Push] send failed:", e?.statusCode, e?.body || e?.message);
    }
  }));
  if (dead.length) await db.delete(pushSubscriptions).where(inArray(pushSubscriptions.id, dead));
}

export async function sendPushToUser(userId: number, payload: PushPayload) {
  try {
    if (!(await wantsNotification(userId, payload.category))) return;
    const rows = await db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    await deliver(rows, payload);
  } catch (e) {
    console.error("[Push] sendPushToUser error:", e);
  }
}

// For per-user activity (likes, comments, messages): if the user currently has
// the site open they already got the in-app toast over WebSocket - a phone
// notification on top of that is just noise.
export async function sendPushToUserIfOffline(userId: number, payload: PushPayload) {
  const online = wsHelpers.getOnlineUserIds?.() ?? [];
  if (online.includes(userId)) return;
  await sendPushToUser(userId, payload);
}

export async function sendPushToAll(payload: PushPayload) {
  try {
    const rows = payload.category
      ? (await db.select({ s: pushSubscriptions }).from(pushSubscriptions)
          .innerJoin(users, eq(users.id, pushSubscriptions.userId))
          .where(sql`COALESCE(${users.notificationPrefs}::json->>${payload.category}, 'true') <> 'false'`)).map(r => r.s)
      : await db.select().from(pushSubscriptions);
    await deliver(rows, payload);
  } catch (e) {
    console.error("[Push] sendPushToAll error:", e);
  }
}
