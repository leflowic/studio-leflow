import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowRight, Trophy } from "lucide-react";

// Monthly challenge (theme/prize/deadline set by staff in the admin Projekti
// tab, on top of the giveaway). Hidden when no theme is set. Deadline is a
// date; the challenge closes at the end of that day, Belgrade time.

export type MonthlyChallenge = {
  theme: string;
  description: string;
  prize: string;
  deadline: string;  // YYYY-MM-DD or ""
  isActive: boolean;
};

// End of the deadline day in Belgrade, as a real instant. Belgrade is UTC+1/+2;
// resolve the offset for that specific date instead of hardcoding it.
function deadlineInstant(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const guess = new Date(`${date}T23:59:59Z`);
  const belgrade = new Date(guess.toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
  const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
  return guess.getTime() - (belgrade.getTime() - utc.getTime());
}

export function useChallengeCountdown(deadline: string | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const end = deadline ? deadlineInstant(deadline) : null;
  if (!end) return { label: null as string | null, ended: false };
  const ms = end - now;
  if (ms <= 0) return { label: "Izazov je završen", ended: true };
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days >= 1) return { label: `Još ${days} ${days === 1 ? "dan" : "dana"} i ${hours}h`, ended: false };
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return { label: `Još ${hours}h ${mins}min`, ended: false };
}

export function useMonthlyChallenge() {
  return useQuery<MonthlyChallenge | null>({ queryKey: ["/api/challenge"] });
}

export function ChallengeBanner({ linkToGiveaway = false }: { linkToGiveaway?: boolean }) {
  const { data } = useMonthlyChallenge();
  const { label, ended } = useChallengeCountdown(data?.deadline);
  if (!data) return null;

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary mb-1 flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5" /> Izazov meseca
          </p>
          <p className="text-lg font-bold">{data.theme}</p>
          {data.description && <p className="text-sm text-muted-foreground mt-1">{data.description}</p>}
          {data.prize && <p className="text-sm mt-2"><span className="text-muted-foreground">Nagrada:</span> {data.prize}</p>}
        </div>
        <div className="flex flex-col sm:items-end gap-2 flex-shrink-0">
          {label && <p className={`text-sm font-semibold tabular-nums ${ended ? "text-muted-foreground" : ""}`}>{label}</p>}
          {linkToGiveaway && !ended && (
            <Link href="/giveaway" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline underline-offset-4">
              Učestvuj <ArrowRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
