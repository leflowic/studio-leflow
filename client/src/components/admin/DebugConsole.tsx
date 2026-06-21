import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { X, Terminal, Trash2, ChevronDown, ChevronUp } from "lucide-react";

type LogLevel = "log" | "warn" | "error" | "info";
interface LogEntry {
  id: number;
  level: LogLevel;
  args: string;
  ts: string;
}

let logId = 0;
const globalListeners: Array<(entry: LogEntry) => void> = [];
let patched = false;

function patchConsole() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  const levels: LogLevel[] = ["log", "warn", "error", "info"];
  for (const level of levels) {
    const orig = console[level].bind(console);
    console[level] = (...args: any[]) => {
      orig(...args);
      const entry: LogEntry = {
        id: ++logId,
        level,
        args: args.map(a => {
          try { return typeof a === "object" ? JSON.stringify(a) : String(a); }
          catch { return String(a); }
        }).join(" "),
        ts: new Date().toLocaleTimeString("en-GB", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" }),
      };
      globalListeners.forEach(fn => fn(entry));
    };
  }
}

const LEVEL_COLOR: Record<LogLevel, string> = {
  log: "text-zinc-300",
  info: "text-blue-400",
  warn: "text-yellow-400",
  error: "text-red-400",
};

export function DebugConsole() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | "all">("all");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    patchConsole();
    const handler = (entry: LogEntry) => {
      setLogs(prev => [...prev.slice(-199), entry]);
    };
    globalListeners.push(handler);
    return () => {
      const i = globalListeners.indexOf(handler);
      if (i > -1) globalListeners.splice(i, 1);
    };
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs, open]);

  if (!user || user.role !== "admin") return null;

  const filtered = filter === "all" ? logs : logs.filter(l => l.level === filter);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none">
      <div className="pointer-events-auto">
        {/* Toggle bar */}
        <div
          className="flex items-center gap-2 px-4 py-1.5 bg-zinc-900/95 border-t border-zinc-700/60 cursor-pointer select-none backdrop-blur"
          onClick={() => setOpen(o => !o)}
        >
          <Terminal className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">DEV CONSOLE</span>
          {logs.filter(l => l.level === "error").length > 0 && (
            <span className="ml-1 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-mono">
              {logs.filter(l => l.level === "error").length} errors
            </span>
          )}
          {logs.filter(l => l.level === "warn").length > 0 && (
            <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded font-mono">
              {logs.filter(l => l.level === "warn").length} warns
            </span>
          )}
          <span className="text-[10px] text-zinc-500 ml-auto font-mono">{logs.length} entries</span>
          {open
            ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
            : <ChevronUp className="w-3.5 h-3.5 text-zinc-500" />}
        </div>

        {/* Console panel */}
        {open && (
          <div className="bg-zinc-950/98 border-t border-zinc-700/40 backdrop-blur" style={{ height: 260 }}>
            {/* Toolbar */}
            <div className="flex items-center gap-1 px-3 py-1.5 border-b border-zinc-800/60">
              {(["all", "log", "info", "warn", "error"] as const).map(lvl => (
                <button
                  key={lvl}
                  onClick={() => setFilter(lvl)}
                  className={`text-[10px] px-2 py-0.5 rounded font-mono transition-colors ${
                    filter === lvl
                      ? "bg-zinc-700 text-white"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {lvl}
                </button>
              ))}
              <button
                onClick={() => setLogs([])}
                className="ml-auto flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors px-2 py-0.5"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>
            </div>

            {/* Log entries */}
            <div className="overflow-y-auto font-mono text-[11px] leading-relaxed" style={{ height: 214 }}>
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center h-full text-zinc-700">
                  No entries
                </div>
              ) : (
                filtered.map(entry => (
                  <div
                    key={entry.id}
                    className={`flex gap-2 px-3 py-0.5 hover:bg-zinc-900/50 border-b border-zinc-900/40 ${LEVEL_COLOR[entry.level]}`}
                  >
                    <span className="text-zinc-600 shrink-0 select-none">{entry.ts}</span>
                    <span className={`shrink-0 w-10 text-right select-none ${LEVEL_COLOR[entry.level]}`}>
                      [{entry.level}]
                    </span>
                    <span className="break-all whitespace-pre-wrap">{entry.args}</span>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
