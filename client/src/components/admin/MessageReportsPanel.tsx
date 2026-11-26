import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Check, Flag, RotateCcw, Ban, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { srLatn } from "date-fns/locale";

// User reports from chat ("Prijavi korisnika"). Shown at the top of admin → Poruke.
// Server: GET/PATCH /api/admin/reports (requireRole("producer")).

type Report = {
  id: number; reason: string; note: string | null; createdAt: string; resolvedAt: string | null;
  reporter: { id: number; username: string };
  reported: { id: number; username: string; banned: boolean };
  reportsAgainst: number;
};

const REASON: Record<string, string> = {
  harassment: "Uznemiravanje ili pretnje",
  spam: "Spam ili reklame",
  inappropriate: "Neprimeren sadržaj",
  scam: "Prevara ili lažno predstavljanje",
  other: "Nešto drugo",
};

export function MessageReportsPanel() {
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const key = ["/api/admin/reports", showAll ? "all" : "open"];
  const { data, isLoading } = useQuery<Report[]>({
    queryKey: key,
    queryFn: async () => (await apiRequest("GET", `/api/admin/reports${showAll ? "?all=1" : ""}`)).json(),
  });
  const rows = Array.isArray(data) ? data : [];

  const resolve = useMutation({
    mutationFn: ({ id, resolved }: { id: number; resolved: boolean }) => apiRequest("PATCH", `/api/admin/reports/${id}`, { resolved }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] }),
    onError: () => toast({ title: "Izmena nije sačuvana", variant: "destructive" }),
  });

  const ban = useMutation({
    mutationFn: (userId: number) => apiRequest("POST", `/api/admin/users/${userId}/ban`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Korisnik je banovan" });
    },
    onError: (e: any) => toast({ title: "Ban nije uspeo", description: e?.message, variant: "destructive" }),
  });

  if (isLoading) return null;
  if (!showAll && rows.length === 0) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-2"><Flag className="w-4 h-4" /> Nema otvorenih prijava korisnika.</span>
        <Button size="sm" variant="ghost" onClick={() => setShowAll(true)}>Sve prijave</Button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-border">
        <div>
          <h3 className="font-semibold text-sm inline-flex items-center gap-2"><Flag className="w-4 h-4 text-destructive" /> Prijave korisnika</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Prijavljeni korisnik ne zna ko ga je prijavio.</p>
        </div>
        <div className="flex gap-1 rounded-full border border-border p-1">
          <Button size="sm" variant={showAll ? "ghost" : "default"} onClick={() => setShowAll(false)}>Otvorene</Button>
          <Button size="sm" variant={showAll ? "default" : "ghost"} onClick={() => setShowAll(true)}>Sve</Button>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">Još nema prijava.</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(r => (
            <li key={r.id} className={`px-4 py-3 flex flex-wrap items-start gap-x-4 gap-y-2 ${r.resolvedAt ? "opacity-60" : ""}`}>
              <div className="flex-1 min-w-[15rem]">
                <p className="text-sm">
                  <a href={`/u/${r.reported.username}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline inline-flex items-center gap-1">
                    {r.reported.username} <ExternalLink className="w-3 h-3 opacity-60" />
                  </a>
                  <span className="text-muted-foreground"> - {REASON[r.reason] ?? r.reason}</span>
                  {r.reported.banned && <span className="ml-2 text-xs text-destructive">banovan</span>}
                </p>
                {r.note && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap break-words">"{r.note}"</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  prijavio {r.reporter.username} · {formatDistanceToNow(new Date(r.createdAt), { addSuffix: true, locale: srLatn })}
                  {r.reportsAgainst > 1 && <span className="text-destructive"> · prijavilo ga je <span className="font-mono">{r.reportsAgainst}</span> različitih korisnika</span>}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!r.reported.banned && !r.resolvedAt && (
                  <Button size="sm" variant="ghost" className={`text-destructive ${ban.isPending ? "opacity-60 pointer-events-none" : ""}`}
                    onClick={() => { if (window.confirm(`Banovati ${r.reported.username}?`)) ban.mutate(r.reported.id); }}>
                    <Ban className="w-3.5 h-3.5" /> Banuj
                  </Button>
                )}
                {r.resolvedAt ? (
                  <Button size="sm" variant="ghost" onClick={() => resolve.mutate({ id: r.id, resolved: false })}><RotateCcw className="w-3.5 h-3.5" /> Otvori</Button>
                ) : (
                  <Button size="sm" variant="outline" className={resolve.isPending ? "opacity-60 pointer-events-none" : ""} onClick={() => resolve.mutate({ id: r.id, resolved: true })}>
                    <Check className="w-3.5 h-3.5" /> Rešeno
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
