import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MONTHS_SR = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
];
const DAYS_SR = ["Pon", "Uto", "Sre", "Čet", "Pet", "Sub", "Ned"];

type Status = "green" | "red" | "yellow" | "blue" | null;

interface CalendarDay {
  date: string;
  status: Status;
  note: string | null;
}

const STATUS_CONFIG: Record<NonNullable<Status>, { label: string; bg: string; border: string; text: string; dot: string }> = {
  green: {
    label: "Slobodan",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
    text: "text-emerald-400",
    dot: "bg-emerald-400",
  },
  red: {
    label: "Zauzet",
    bg: "bg-red-500/15",
    border: "border-red-500/40",
    text: "text-red-400",
    dot: "bg-red-400",
  },
  yellow: {
    label: "Delimično",
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
    text: "text-amber-400",
    dot: "bg-amber-400",
  },
  blue: {
    label: "Posebno",
    bg: "bg-blue-500/15",
    border: "border-blue-500/40",
    text: "text-blue-400",
    dot: "bg-blue-400",
  },
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  // 0=Sun,1=Mon,...6=Sat → convert to Mon-first (0=Mon,...6=Sun)
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function CalendarTab() {
  const { toast } = useToast();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [selected, setSelected] = useState<{ date: string; day: CalendarDay | null } | null>(null);
  const [noteInput, setNoteInput] = useState("");

  const queryKey = ["/api/admin/calendar", year, month];

  const { data: days = [], isLoading } = useQuery<CalendarDay[]>({
    queryKey,
    queryFn: () =>
      apiRequest("GET", `/api/admin/calendar?year=${year}&month=${month}`).then((r) => r.json()),
  });

  const dayMap = Object.fromEntries(days.map((d) => [d.date, d]));

  const mutation = useMutation({
    mutationFn: ({ date, status, note }: { date: string; status: Status; note: string }) =>
      apiRequest("PUT", `/api/admin/calendar/${date}`, { status, note }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setSelected(null);
    },
    onError: () => toast({ title: "Greška", description: "Nije moguće sačuvati dan", variant: "destructive" }),
  });

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const openDay = useCallback((dateStr: string) => {
    const existing = dayMap[dateStr] ?? null;
    setSelected({ date: dateStr, day: existing });
    setNoteInput(existing?.note ?? "");
  }, [dayMap]);

  const applyStatus = (status: Status) => {
    if (!selected) return;
    mutation.mutate({ date: selected.date, status, note: noteInput });
  };

  const totalDays = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayDate = todayStr();

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
        {/* Gradient header */}
        <div className="bg-gradient-to-r from-[#130826] via-[#1a1040] to-[#0c1a4a] px-6 py-5 flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white/70" />
          </button>

          <div className="text-center">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {MONTHS_SR[month - 1]}
            </h2>
            <p className="text-sm text-white/40 mt-0.5">{year}</p>
          </div>

          <button
            onClick={nextMonth}
            className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Calendar grid */}
        <div className="bg-[#0a0a0a] p-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_SR.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-white/30 py-2 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          {isLoading ? (
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-lg bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((day, i) => {
                if (!day) return <div key={i} />;
                const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const existing = dayMap[dateStr];
                const status = existing?.status as Status ?? null;
                const isToday = dateStr === todayDate;
                const cfg = status ? STATUS_CONFIG[status] : null;

                return (
                  <button
                    key={i}
                    onClick={() => openDay(dateStr)}
                    className={cn(
                      "aspect-square rounded-xl border flex flex-col items-center justify-center gap-1 transition-all duration-150 group relative",
                      "hover:scale-105 hover:z-10",
                      cfg
                        ? `${cfg.bg} ${cfg.border}`
                        : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07] hover:border-white/20",
                      isToday && !cfg && "border-violet-500/50 bg-violet-500/10",
                    )}
                  >
                    <span className={cn(
                      "text-sm font-semibold leading-none",
                      cfg ? cfg.text : isToday ? "text-violet-300" : "text-white/60",
                    )}>
                      {day}
                    </span>
                    {cfg && (
                      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                    )}
                    {existing?.note && (
                      <span className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-white/30" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="bg-[#0a0a0a] border-t border-white/5 px-4 pb-4">
          <div className="flex flex-wrap gap-4 pt-3">
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
                <span className="text-xs text-white/40">{cfg.label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400" />
              <span className="text-xs text-white/40">Danas</span>
            </div>
          </div>
        </div>
      </div>

      {/* Day editor panel */}
      {selected && (
        <div className="rounded-2xl border border-white/10 bg-[#0f0f0f] overflow-hidden shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div>
              <p className="text-xs text-white/40 uppercase tracking-widest mb-0.5">Izabrani dan</p>
              <p className="text-white font-semibold">
                {new Date(selected.date + "T12:00:00").toLocaleDateString("sr-RS", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-white/50" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Status picker */}
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Status</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(Object.entries(STATUS_CONFIG) as [NonNullable<Status>, typeof STATUS_CONFIG[keyof typeof STATUS_CONFIG]][]).map(([key, cfg]) => {
                  const isActive = (selected.day?.status ?? null) === key;
                  return (
                    <button
                      key={key}
                      disabled={mutation.isPending}
                      onClick={() => applyStatus(key)}
                      className={cn(
                        "px-3 py-2.5 rounded-xl border text-sm font-medium transition-all flex items-center gap-2",
                        isActive
                          ? `${cfg.bg} ${cfg.border} ${cfg.text} ring-1 ring-inset ${cfg.border}`
                          : "bg-white/[0.03] border-white/10 text-white/50 hover:bg-white/[0.07]",
                      )}
                    >
                      <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div>
              <p className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-2">Napomena (opciono)</p>
              <div className="flex gap-2">
                <input
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Npr. Snimanje benda, Mix projekt..."
                  className="flex-1 bg-white/[0.04] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-violet-500/50 focus:bg-white/[0.06] transition-colors"
                  onKeyDown={(e) => { if (e.key === "Enter") applyStatus(selected.day?.status as Status ?? null); }}
                />
                <button
                  disabled={mutation.isPending}
                  onClick={() => applyStatus(selected.day?.status as Status ?? null)}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {mutation.isPending ? "..." : "Sačuvaj"}
                </button>
              </div>
            </div>

            {/* Clear */}
            {selected.day?.status && (
              <button
                disabled={mutation.isPending}
                onClick={() => applyStatus(null)}
                className="text-xs text-white/30 hover:text-white/50 transition-colors underline underline-offset-2"
              >
                Ukloni status
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
