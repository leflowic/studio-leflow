// Sends browser errors to the admin "Greške" tab (POST /api/client-errors).
// At most 5 reports per page load and each message only once, so a render
// loop can't flood the server. Dev builds don't report.

const sent = new Set<string>();
let count = 0;

export function reportClientError(message: string, stack?: string | null) {
  try {
    if (!import.meta.env.PROD) return;
    const key = message.slice(0, 200);
    if (!message || sent.has(key) || count >= 5) return;
    sent.add(key);
    count++;
    const token = localStorage.getItem("auth_token");
    fetch("/api/client-errors", {
      method: "POST",
      keepalive: true,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ message: message.slice(0, 500), stack: stack ? stack.slice(0, 4000) : null, url: window.location.pathname }),
    }).catch(() => {});
  } catch { /* reporting must never throw */ }
}

export function installClientErrorReporting() {
  window.addEventListener("error", (e) => {
    reportClientError(e.message || "Greška u skripti", (e.error as Error | undefined)?.stack ?? null);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const r: any = e.reason;
    reportClientError(`Unhandled rejection: ${r?.message ?? String(r)}`, r?.stack ?? null);
  });
}
