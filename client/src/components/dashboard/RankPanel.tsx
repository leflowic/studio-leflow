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
  perks: Record<string, { gameListens: number; giveawayUploads: number }>;
  rankLocked: boolean;
};

const PERK_ROWS: Array<{ rank: "user" | "vip" | "legend"; label: string }> = [
  { rank: "user", label: "Korisnik" },
  { rank: "vip", label: "VIP" },
  { rank: "legend", label: "Legenda" },
];

const RANK_LABEL: Record<string, string> = { user: "Korisnik", vip: "VIP", legend: "Legenda", admin: "Administrator" };

export function RankPanel() {
  const { data } = useQuery<Activity>({ queryKey: ["/api/me/activity"] });
  const [open, setOpen] = useState(false);
  if (!data) return null;

  // A rank set by hand by the studio isn't driven by points - don't show a
  // progress bar that would never move it.
  const next = data.rankLocked ? null : data.next;
  const pct = next ? Math.min(100, Math.round((data.points / next.at) * 100)) : 100;
  const pending = next && data.points >= next.at;

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
          {next && (
            <p className="text-sm text-muted-foreground text-right">
              {pending
                ? <>Rang <strong className="text-foreground">{next.label}</strong> stiže u roku od sat vremena</>
                : <>Još <strong className="text-foreground tabular-nums">{next.at - data.points}</strong> do ranga {next.label}</>}
            </p>
          )}
          {data.rankLocked && <p className="text-sm text-muted-foreground text-right">Rang ti je dodelio studio</p>}
        </div>
        {next && (
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
          Bodovi i prednosti rangova
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open && (
          <div className="space-y-5">
            <ul className="text-sm divide-y divide-border/50">
              {data.rules.map(r => (
                <li key={r.label} className="flex justify-between gap-4 py-2">
                  <span className="text-muted-foreground">{r.label}</span>
                  <span className="font-semibold tabular-nums">+{r.points}</span>
                </li>
              ))}
            </ul>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="font-medium py-2 pr-4">Rang</th>
                    <th className="font-medium py-2 pr-4">Slušanja u igri</th>
                    <th className="font-medium py-2">Projekata mesečno na giveaway-u</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {PERK_ROWS.map(row => {
                    const p = data.perks[row.rank];
                    const mine = data.rank === row.rank;
                    return (
                      <tr key={row.rank} className={mine ? "text-foreground font-semibold" : "text-muted-foreground"}>
                        <td className="py-2 pr-4">{row.label}{row.rank === "vip" ? " (150)" : row.rank === "legend" ? " (600)" : ""}</td>
                        <td className="py-2 pr-4 tabular-nums">{p?.gameListens}</td>
                        <td className="py-2 tabular-nums">{p?.giveawayUploads}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </PanelCard>
  );
}
