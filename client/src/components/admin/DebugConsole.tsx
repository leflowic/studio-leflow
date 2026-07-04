import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Terminal, Trash2, ChevronDown, ChevronUp, Search, Copy, Wifi, Database, FileText } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type LogLevel = "log" | "warn" | "error" | "info";

interface LogEntry {
  id: number;
  kind: "log";
  level: LogLevel;
  args: string;
  ts: string;
  ms: number;
}

interface NetEntry {
  id: number;
  kind: "net";
  method: string;
  url: string;
  status: number | null;
  ok: boolean | null;
  duration: number | null;
  ts: string;
  ms: number;
  reqBody: string | null;
  resBody: string | null;
}

type Entry = LogEntry | NetEntry;

// ─── Module-level state (survives re-renders) ─────────────────────────────────

let entryId = 0;
const listeners: Array<(e: Entry) => void> = [];
let consolePatchedRef = false;
let fetchPatchedRef = false;

function notify(e: Entry) {
  listeners.forEach(fn => fn(e));
}

function patchConsole() {
  if (consolePatchedRef || typeof window === "undefined") return;
  consolePatchedRef = true;
  const levels: LogLevel[] = ["log", "warn", "error", "info"];
  for (const level of levels) {
    const orig = (console[level] as (...a: any[]) => void).bind(console);
    (console as any)[level] = (...args: any[]) => {
      orig(...args);
      notify({
        id: ++entryId,
        kind: "log",
        level,
        ts: new Date().toLocaleTimeString("en-GB", { hour12: false }),
        ms: Date.now(),
        args: args.map(a => {
          try { return typeof a === "object" && a !== null ? JSON.stringify(a, null, 0) : String(a); }
          catch { return String(a); }
        }).join(" "),
      });
    };
  }

  window.addEventListener("error", (ev) => {
    notify({
      id: ++entryId,
      kind: "log",
      level: "error",
      ts: new Date().toLocaleTimeString("en-GB", { hour12: false }),
      ms: Date.now(),
      args: `Uncaught: ${ev.message} (${ev.filename}:${ev.lineno})`,
    });
  });

  window.addEventListener("unhandledrejection", (ev) => {
    notify({
      id: ++entryId,
      kind: "log",
      level: "error",
      ts: new Date().toLocaleTimeString("en-GB", { hour12: false }),
      ms: Date.now(),
      args: `UnhandledPromise: ${ev.reason}`,
    });
  });
}

function patchFetch() {
  if (fetchPatchedRef || typeof window === "undefined") return;
  fetchPatchedRef = true;
  const origFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : (input as Request).url;
    const method = (init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
    const t0 = Date.now();
    const id = ++entryId;
    const ts = new Date().toLocaleTimeString("en-GB", { hour12: false });

    let reqBody: string | null = null;
    if (init?.body) {
      try { reqBody = typeof init.body === "string" ? init.body : JSON.stringify(init.body); }
      catch { reqBody = "[binary]"; }
    }

    try {
      const res = await origFetch(input, init);
      const duration = Date.now() - t0;
      let resBody: string | null = null;
      const cloned = res.clone();
      try {
        const text = await cloned.text();
        resBody = text.length > 500 ? text.slice(0, 500) + "…" : text;
      } catch {}

      notify({
        id, kind: "net", method, url: url.replace(window.location.origin, ""),
        status: res.status, ok: res.ok, duration, ts, ms: t0, reqBody, resBody,
      });
      return res;
    } catch (err: any) {
      notify({
        id, kind: "net", method, url: url.replace(window.location.origin, ""),
        status: null, ok: false, duration: Date.now() - t0, ts, ms: t0,
        reqBody, resBody: err?.message ?? "Network error",
      });
      throw err;
    }
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LOG_COLOR: Record<LogLevel, string> = {
  log: "text-zinc-300",
  info: "text-sky-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

const LOG_BG: Record<LogLevel, string> = {
  log: "",
  info: "",
  warn: "bg-yellow-950/20",
  error: "bg-red-950/25",
};

function statusColor(status: number | null, ok: boolean | null) {
  if (status === null) return "text-zinc-500";
  if (ok) return "text-emerald-400";
  if (status >= 400 && status < 500) return "text-yellow-400";
  return "text-red-400";
}

function methodColor(m: string) {
  if (m === "GET") return "text-sky-400";
  if (m === "POST") return "text-emerald-400";
  if (m === "PATCH" || m === "PUT") return "text-yellow-400";
  if (m === "DELETE") return "text-red-400";
  return "text-zinc-400";
}

function storageEntries(store: Storage): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i)!;
    out.push([k, store.getItem(k) ?? ""]);
  }
  return out;
}

// ─── Panel height drag hook ───────────────────────────────────────────────────

function useDragHeight(initial: number) {
  const [height, setHeight] = useState(initial);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(initial);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    e.preventDefault();
  }, [height]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startY.current - e.clientY;
      setHeight(Math.max(150, Math.min(window.innerHeight * 0.8, startH.current + delta)));
    };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", move); window.removeEventListener("mouseup", up); };
  }, []);

  return { height, onMouseDown };
}

// ─── Sub-panels ───────────────────────────────────────────────────────────────

function LogsPanel({ entries }: { entries: LogEntry[] }) {
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, autoScroll]);

  const filtered = entries
    .filter(e => filter === "all" || e.level === filter)
    .filter(e => !search || e.args.toLowerCase().includes(search.toLowerCase()));

  const counts = { error: 0, warn: 0, info: 0, log: 0 };
  entries.forEach(e => counts[e.level]++);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-zinc-800/60 shrink-0 flex-wrap">
        {(["all", "log", "info", "warn", "error"] as const).map(lvl => (
          <button key={lvl} onClick={() => setFilter(lvl)}
            className={`text-[10px] px-1.5 py-0.5 rounded font-mono transition-colors ${filter === lvl ? "bg-zinc-700 text-white" : "text-zinc-500 hover:text-zinc-300"}`}>
            {lvl}{lvl !== "all" && counts[lvl] > 0 ? ` (${counts[lvl]})` : ""}
          </button>
        ))}
        <div className="flex items-center gap-1 ml-2 flex-1 min-w-[100px]">
          <Search className="w-3 h-3 text-zinc-600 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Filter..."
            className="bg-transparent text-[10px] text-zinc-300 outline-none placeholder:text-zinc-700 w-full"
          />
        </div>
        <label className="flex items-center gap-1 text-[10px] text-zinc-600 cursor-pointer ml-auto">
          <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)} className="w-2.5 h-2.5" />
          auto
        </label>
      </div>
      <div ref={scrollRef} className="overflow-y-auto flex-1 font-mono text-[11px]">
        {filtered.length === 0
          ? <div className="flex items-center justify-center h-16 text-zinc-700 text-[10px]">No entries</div>
          : filtered.map(e => (
            <div key={e.id} onClick={() => setExpanded(expanded === e.id ? null : e.id)}
              className={`px-2 py-0.5 border-b border-zinc-900/40 cursor-pointer hover:bg-zinc-900/60 ${LOG_BG[e.level]}`}>
              <div className={`flex gap-1.5 ${LOG_COLOR[e.level]}`}>
                <span className="text-zinc-600 shrink-0 w-16">{e.ts}</span>
                <span className={`shrink-0 w-9 ${LOG_COLOR[e.level]}`}>[{e.level}]</span>
                <span className={expanded === e.id ? "break-all whitespace-pre-wrap" : "truncate"}>{e.args}</span>
              </div>
            </div>
          ))
        }
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function NetPanel({ entries }: { entries: NetEntry[] }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<NetEntry | null>(null);

  const filtered = entries.filter(e => !search || e.url.toLowerCase().includes(search.toLowerCase()) || e.method.includes(search.toUpperCase()));

  return (
    <div className="flex h-full">
      {/* Request list */}
      <div className={`flex flex-col border-r border-zinc-800/60 ${selected ? "w-1/2" : "w-full"}`}>
        <div className="flex items-center gap-1.5 px-2 py-1 border-b border-zinc-800/60 shrink-0">
          <Search className="w-3 h-3 text-zinc-600" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter URL..."
            className="bg-transparent text-[10px] text-zinc-300 outline-none placeholder:text-zinc-700 flex-1" />
          <span className="text-[10px] text-zinc-600">{filtered.length} req</span>
        </div>
        <div className="overflow-y-auto flex-1 font-mono text-[10px]">
          {filtered.length === 0
            ? <div className="flex items-center justify-center h-16 text-zinc-700">No requests</div>
            : [...filtered].reverse().map(e => (
              <div key={e.id} onClick={() => setSelected(selected?.id === e.id ? null : e)}
                className={`flex items-center gap-1.5 px-2 py-1 border-b border-zinc-900/40 cursor-pointer hover:bg-zinc-900/60 ${selected?.id === e.id ? "bg-zinc-800/50" : ""}`}>
                <span className={`shrink-0 w-10 font-bold ${methodColor(e.method)}`}>{e.method}</span>
                <span className={`shrink-0 w-6 ${statusColor(e.status, e.ok)}`}>{e.status ?? "ERR"}</span>
                <span className="truncate text-zinc-400 flex-1">{e.url}</span>
                <span className="shrink-0 text-zinc-600">{e.duration != null ? `${e.duration}ms` : ""}</span>
              </div>
            ))
          }
        </div>
      </div>

      {/* Detail panel */}
      {selected && (
        <div className="w-1/2 flex flex-col font-mono text-[10px] overflow-hidden">
          <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800/60 shrink-0">
            <span className="text-zinc-400 truncate">{selected.method} {selected.url}</span>
            <button onClick={() => setSelected(null)} className="text-zinc-600 hover:text-zinc-300 ml-2 shrink-0">✕</button>
          </div>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            <div>
              <p className="text-zinc-500 mb-0.5">Status</p>
              <p className={statusColor(selected.status, selected.ok)}>{selected.status ?? "Network Error"} · {selected.duration}ms · {selected.ts}</p>
            </div>
            {selected.reqBody && (
              <div>
                <p className="text-zinc-500 mb-0.5">Request body</p>
                <pre className="text-zinc-300 bg-zinc-900/60 p-1.5 rounded text-[10px] overflow-x-auto whitespace-pre-wrap break-all">
                  {(() => { try { return JSON.stringify(JSON.parse(selected.reqBody), null, 2); } catch { return selected.reqBody; } })()}
                </pre>
              </div>
            )}
            {selected.resBody && (
              <div>
                <p className="text-zinc-500 mb-0.5">Response body</p>
                <pre className="text-zinc-300 bg-zinc-900/60 p-1.5 rounded text-[10px] overflow-x-auto whitespace-pre-wrap break-all">
                  {(() => { try { return JSON.stringify(JSON.parse(selected.resBody), null, 2); } catch { return selected.resBody; } })()}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StoragePanel() {
  const [, tick] = useState(0);
  const refresh = () => tick(n => n + 1);

  const ls = typeof window !== "undefined" ? storageEntries(localStorage) : [];
  const ss = typeof window !== "undefined" ? storageEntries(sessionStorage) : [];

  const del = (store: Storage, key: string) => { store.removeItem(key); refresh(); };
  const copyVal = (v: string) => navigator.clipboard.writeText(v);

  const Row = ({ k, v, onDel, onCopy }: { k: string; v: string; onDel: () => void; onCopy: () => void }) => (
    <div className="flex items-start gap-1.5 px-2 py-1 border-b border-zinc-900/40 hover:bg-zinc-900/40 group font-mono text-[10px]">
      <span className="text-sky-400 shrink-0 w-40 truncate" title={k}>{k}</span>
      <span className="text-zinc-300 flex-1 break-all line-clamp-2" title={v}>{v}</span>
      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100">
        <button onClick={onCopy} title="Copy value" className="text-zinc-600 hover:text-zinc-300"><Copy className="w-2.5 h-2.5" /></button>
        <button onClick={onDel} title="Delete" className="text-zinc-600 hover:text-red-400"><Trash2 className="w-2.5 h-2.5" /></button>
      </div>
    </div>
  );

  return (
    <div className="overflow-y-auto h-full">
      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800/60">
        <span className="text-[10px] text-zinc-500 font-mono">localStorage ({ls.length})</span>
        <button
          onClick={() => {
            if (window.confirm("Obrisati sav localStorage? Ovo će te odjaviti (auth_token se briše).")) { localStorage.clear(); refresh(); }
          }}
          className="text-[10px] text-zinc-600 hover:text-red-400"
        >
          Clear all
        </button>
      </div>
      {ls.map(([k, v]) => <Row key={k} k={k} v={v} onDel={() => del(localStorage, k)} onCopy={() => copyVal(v)} />)}
      {ls.length === 0 && <p className="text-[10px] text-zinc-700 px-2 py-1">Empty</p>}

      <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-800/60 mt-1">
        <span className="text-[10px] text-zinc-500 font-mono">sessionStorage ({ss.length})</span>
        <button
          onClick={() => {
            if (window.confirm("Obrisati sav sessionStorage?")) { sessionStorage.clear(); refresh(); }
          }}
          className="text-[10px] text-zinc-600 hover:text-red-400"
        >
          Clear all
        </button>
      </div>
      {ss.map(([k, v]) => <Row key={k} k={k} v={v} onDel={() => del(sessionStorage, k)} onCopy={() => copyVal(v)} />)}
      {ss.length === 0 && <p className="text-[10px] text-zinc-700 px-2 py-1">Empty</p>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Tab = "logs" | "net" | "storage";

export function DebugConsole() {
  const { user } = useAuth();
  const [panelVisible, setPanelVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("logs");
  const [entries, setEntries] = useState<Entry[]>([]);
  const { height, onMouseDown } = useDragHeight(300);

  useEffect(() => {
    patchConsole();
    patchFetch();
    const handler = (e: Entry) => setEntries(prev => [...prev.slice(-499), e]);
    listeners.push(handler);

    const toggle = () => setPanelVisible(v => !v);
    window.addEventListener("toggle-debug-console", toggle);

    return () => {
      const i = listeners.indexOf(handler);
      if (i > -1) listeners.splice(i, 1);
      window.removeEventListener("toggle-debug-console", toggle);
    };
  }, []);

  if (!user || user.role !== "admin") return null;
  if (!panelVisible) return null;

  const logs = entries.filter((e): e is LogEntry => e.kind === "log");
  const nets = entries.filter((e): e is NetEntry => e.kind === "net");
  const errCount = logs.filter(e => e.level === "error").length;
  const warnCount = logs.filter(e => e.level === "warn").length;
  const netErrCount = nets.filter(e => !e.ok).length;

  const clearAll = () => setEntries([]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none select-none">
      <div className="pointer-events-auto">

        {/* Drag handle */}
        {open && (
          <div
            onMouseDown={onMouseDown}
            className="h-1 bg-zinc-800 hover:bg-primary/60 cursor-ns-resize transition-colors"
            title="Drag to resize"
          />
        )}

        {/* Tab bar */}
        <div className="flex items-center bg-zinc-900/98 border-t border-zinc-700/50 backdrop-blur-sm">
          {/* Toggle + title */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-zinc-800/50 transition-colors border-r border-zinc-800/60"
            onClick={() => setOpen(o => !o)}
          >
            <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[10px] font-mono font-bold text-emerald-400 hidden sm:inline">DEV</span>
            {(errCount + netErrCount) > 0 && (
              <span className="text-[9px] bg-red-500 text-white px-1 py-0.5 rounded font-mono leading-none">
                {errCount + netErrCount}
              </span>
            )}
            {warnCount > 0 && (
              <span className="text-[9px] bg-yellow-500 text-black px-1 py-0.5 rounded font-mono leading-none">
                {warnCount}
              </span>
            )}
            {open ? <ChevronDown className="w-3 h-3 text-zinc-500" /> : <ChevronUp className="w-3 h-3 text-zinc-500" />}
          </div>

          {/* Tabs */}
          {open && (
            <>
              {([
                { id: "logs" as Tab, label: "Console", icon: FileText, badge: errCount + warnCount },
                { id: "net" as Tab, label: "Network", icon: Wifi, badge: netErrCount },
                { id: "storage" as Tab, label: "Storage", icon: Database, badge: 0 },
              ]).map(({ id, label, icon: Icon, badge }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono border-r border-zinc-800/40 transition-colors ${
                    tab === id
                      ? "bg-zinc-800 text-white border-b-2 border-b-primary"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  <span className="hidden sm:inline">{label}</span>
                  {badge > 0 && (
                    <span className="text-[9px] bg-red-500/80 text-white px-0.5 rounded leading-none">{badge}</span>
                  )}
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto px-2">
                <span className="text-[9px] text-zinc-600 font-mono">{entries.length} entries</span>
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 px-2 py-1 hover:bg-zinc-800/50 rounded transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </>
          )}

          {!open && (
            <span className="text-[9px] text-zinc-600 font-mono ml-auto px-3">
              {logs.length}L · {nets.length}N
            </span>
          )}
        </div>

        {/* Panel */}
        {open && (
          <div
            className="bg-zinc-950/99 border-t border-zinc-800/40 overflow-hidden"
            style={{ height }}
          >
            {tab === "logs" && <LogsPanel entries={logs} />}
            {tab === "net" && <NetPanel entries={nets} />}
            {tab === "storage" && <StoragePanel />}
          </div>
        )}
      </div>
    </div>
  );
}
