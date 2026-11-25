import { apiRequest } from "@/lib/queryClient";
import { isIOS, isStandalone } from "@/lib/registerServiceWorker";

// Browser side of Web Push. The service worker (/sw.js, registered in
// production only) shows the notifications; this file only manages the
// subscription. iOS supports web push only for a site added to the home
// screen (iOS 16.4+), so there we ask for that first.

export type PushState = "unsupported" | "ios-needs-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function getPushState(): Promise<PushState> {
  if (isIOS() && !isStandalone()) return "ios-needs-install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  return sub ? "on" : "off";
}

export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const reg = await navigator.serviceWorker.ready;
  const keyRes = await fetch("/api/push/public-key");
  if (!keyRes.ok) throw new Error("Obaveštenja trenutno nisu dostupna");
  const { key } = await keyRes.json();

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
  }
  await apiRequest("POST", "/api/push/subscribe", { subscription: sub.toJSON() });
  return "on";
}

export async function disablePush(): Promise<PushState> {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = reg ? await reg.pushManager.getSubscription() : null;
  if (sub) {
    await apiRequest("POST", "/api/push/unsubscribe", { endpoint: sub.endpoint }).catch(() => {});
    await sub.unsubscribe();
  }
  return "off";
}
