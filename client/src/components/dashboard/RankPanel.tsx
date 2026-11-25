import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, ChevronDown } from "lucide-react";
import { PanelCard } from "@/components/ui/panel-card";

// Earned-rank progress. Points are computed server-side from real activity
// (server/activity.ts); the rank itself is upgraded by an hourly job, so the
// bar can briefly show "full" before the new rank lands - say so plainly.

type Activity = {
  points: number;
  rank: string;
  earnedRank: string;
  next: { rank: string; label: string; at: number } | null;
  rules: Array<{ label: string; points: number }>;
};

const RANK_LABEL: Record<string, string> = { user: "Korisnik", vip: "VIP", legend: "Legenda", admin: "Administrator" };

export function RankPanel() {
  const { data } = useQuery<Activity>({ queryKey: ["/api/me/activity"] });
  const [open, setOpen] = useState(false);
  if (!data) return null;

  const pct = data.next ? Math.min(100, Math.round((data.points / data.next.at) * 100)) : 100;
  const pending = data.next && data.points >= data.next.at;

  return (
    <PanelCard
      icon={Award}
      iconBg="bg-primary/10"
      iconColor="text-primary"
      title="Tvoj rang"
      desc="Zarađuje se aktivnošću na sajtu"
    >
      <div className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-2xl font-bold">{RANK_LABEL[data.rank] ?? data.rank}</p>
            <p className="text-sm text-muted-foreground tabular-nums">{data.points} bodova</p>
          </div>
          {data.next && (
            <p className="text-sm text-muted-foreground text-right">
              {pending
                ? <>Rang <strong className="text-foreground">{data.next.label}</strong> stiže u roku od sat vremena</>
                : <>Još <strong className="text-foreground tabular-nums">{data.next.at - data.points}</strong> do ranga {data.next.label}</>}
            </p>
          )}
        </div>
        {data.next && (
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex items-center gap-1 text-sm text-primary hover:underline underline-offset-4"
          aria-expanded={open}
        >
          Kako se zarađuju bodovi
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <ul className="text-sm divide-y divide-border/50">
            {data.rules.map(r => (
              <li key={r.label} className="flex justify-between gap-4 py-2">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-semibold tabular-nums">+{r.points}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PanelCard>
  );
}
