import { createHash } from "crypto";
import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Error log for the admin "Greške" tab. Sources:
//   - every 5xx response (most routes swallow their error and just answer 500,
//     so the response status is the only reliable signal)
//   - console.error(...) calls that include an Error object (gives the stack)
//   - uncaught exceptions / unhandled promise rejections
//   - browser errors posted to /api/client-errors
// Same errors are grouped by a fingerprint and counted. Writes are buffered
// and flushed every 10s so an error storm can't hammer the database.

type Entry = { fingerprint: string; source: string; message: string; stack: string | null; route: string | null; status: number | null; count: number; lastUserId: number | null; lastSeen: Date };

const buffer = new Map<string, Entry>();
const MAX_BUFFER = 500;

// Strip ids, numbers, hashes, emails and quoted values so the same bug groups together.
export function normalize(text: string): string {
  return text
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>")
    .replace(/\b[0-9a-f]{16,}\b/gi, "<hex>")
    .replace(/\b\d+(\.\d+)?\b/g, "#")
    .replace(/"[^"]{1,80}"/g, '"…"')
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function topFrame(stack?: string | null): string {
  const line = (stack ?? "").split("\n").find(l => /^\s+at /.test(l)) ?? "";
  return line.replace(/:\d+:\d+\)?$/, "").trim();
}

export function recordError(e: { source: "server" | "client"; message: string; stack?: string | null; route?: string | null; status?: number | null; userId?: number | null }) {
  try {
    const message = (e.message || "Nepoznata greška").slice(0, 500);
    const route = e.route ? normalize(e.route).slice(0, 200) : null;
    const fingerprint = createHash("sha1")
      .update([e.source, normalize(message), route ?? "", topFrame(e.stack)].join("|"))
      .digest("hex");
    const prev = buffer.get(fingerprint);
    if (prev) {
      prev.count++;
      prev.lastSeen = new Date();
      if (e.userId) prev.lastUserId = e.userId;
      return;
    }
    if (buffer.size >= MAX_BUFFER) return;
    buffer.set(fingerprint, {
      fingerprint, source: e.source, message, route, status: e.status ?? null, count: 1,
      stack: e.stack ? e.stack.slice(0, 4000) : null, lastUserId: e.userId ?? null, lastSeen: new Date(),
    });
  } catch { /* never let logging break the request */ }
}

async function flush() {
  if (!buffer.size) return;
  const batch = [...buffer.values()];
  buffer.clear();
  try {
    await storage.upsertErrorLogs(batch);
  } catch (err) {
    origConsoleError("[ErrorLog] flush failed:", err);
  }
}

const origConsoleError = console.error.bind(console);
let installed = false;

export function installErrorLogging() {
  if (installed) return;
  installed = true;

  // console.error with an Error object anywhere in the arguments
  let inHook = false;
  console.error = (...args: unknown[]) => {
    origConsoleError(...args);
    if (inHook) return;
    inHook = true;
    try {
      const err = args.find(a => a instanceof Error) as Error | undefined;
      if (err) {
        const label = args.filter(a => typeof a === "string").join(" ").slice(0, 200);
        recordError({ source: "server", message: [label, err.message].filter(Boolean).join(" "), stack: err.stack });
      }
    } finally { inHook = false; }
  };

  process.on("unhandledRejection", (reason: any) => {
    recordError({ source: "server", message: `Unhandled rejection: ${reason?.message ?? String(reason)}`, stack: reason?.stack });
  });
  process.on("uncaughtException", (err) => {
    recordError({ source: "server", message: `Uncaught exception: ${err.message}`, stack: err.stack });
    origConsoleError(err);
  });

  setInterval(flush, 10_000).unref();
}

/** Express middleware: record every 5xx response with its route pattern. */
export function errorResponseLogger(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    if (res.statusCode < 500) return;
    const routePattern = (req as any).route?.path ? `${req.baseUrl ?? ""}${(req as any).route.path}` : req.path;
    recordError({
      source: "server",
      message: `${res.statusCode} na ${req.method} ${routePattern}`,
      route: `${req.method} ${routePattern}`,
      status: res.statusCode,
      userId: (req as any).jwtUser?.id ?? null,
    });
  });
  next();
}
