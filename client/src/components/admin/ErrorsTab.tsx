import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Bug, Check, ChevronDown, RotateCcw } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { srLatn } from "date-fns/locale";

// Admin "Greške": grouped server + browser errors (server/error-log.ts).
// Read-mostly, no forceMount needed. Super Admin only (routes are requireAdmin).

type ErrorRow = {
  id: number; source: "server" | "client"; message: string; stack: string | null; route: string | null;
  status: number | null; count: number; lastUserId: number | null; firstSeen: string; lastSeen: string; resolvedAt: string | null;
};

export function ErrorsTab() {
  const { toast } = useToast();
  const [showAll, setShowAll] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  const key = ["/api/admin/errors", showAll ? "all" : "open"];
  const { data, isLoading, isError } = useQuery<ErrorRow[]>({
    queryKey: key,
    queryFn: async () => (await apiRequest("GET", `/api/admin/errors${showAll ? "?all=1" : ""}`)).json(),
    refetchInterval: 60_000,
  });

  const resolve = useMutation({
    mutationFn: ({ id, resolved }: { id: number; resolved: boolean }) => apiRequest("PATCH", `/api/admin/errors/${id}`, { resolved }),
    onSuccess: (_, v) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/errors"] });
      toast({ title: v.resolved ? "Označeno kao rešeno" : "Ponovo otvoreno", description: v.resolved ? "Ako se greška ponovi, sama će se vratiti na spisak." : undefined });
    },
    onError: () => toast({ title: "Izmena nije sačuvana", variant: "destructive" }),
  });

  const rows = Array.isArray(data) ? data : [];
  const unresolved = rows.filter(r => !r.resolvedAt);
  const today = unresolved.filter(r => Date.now() - new Date(r.lastSeen).getTime() < 24 * 3600_000);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Greške</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Šta je puklo na sajtu - na serveru i kod posetilaca u pregledaču. Iste greške su grupisane. Kada nešto popravite, označite kao rešeno; ako se ponovi, vratiće se na spisak.
          </p>
        </div>
        <div className="flex gap-1 rounded-full border border-border p-1">
          <Button size="sm" variant={showAll ? "ghost" : "default"} onClick={() => setShowAll(false)}>Nerešene</Button>
          <Button size="sm" variant={showAll ? "default" : "ghost"} onClick={() => setShowAll(true)}>Sve</Button>
        </div>
      </div>

      {!showAll && rows.length > 0 && (
        <p className="text-sm text-muted-foreground">
          <span className="font-mono text-foreground">{unresolved.length}</span> nerešenih
          {" · "}<span className="font-mono text-foreground">{today.length}</span> u poslednja 24 sata
        </p>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : isError ? (
        <p className="text-sm text-destructive">Spisak nije učitan. Osvežite stranicu.</p>
      ) : !rows.length ? (
        <EmptyState icon={Bug} text={showAll ? "Nema zabeleženih grešaka" : "Nema nerešenih grešaka"} sub="Kad nešto pukne, pojaviće se ovde u roku od minut." />
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <ul className="divide-y divide-border">
            {rows.map(r => {
              const expanded = open === r.id;
              return (
                <li key={r.id} className={r.resolvedAt ? "opacity-60" : ""}>
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-2 px-4 py-3">
                    <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${r.source === "server" ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground"}`}>
                      {r.source === "server" ? "Server" : "Pregledač"}
                    </span>
                    <button type="button" onClick={() => setOpen(expanded ? null : r.id)} className="flex-1 min-w-[14rem] text-left" aria-expanded={expanded}>
                      <p className="text-sm font-medium break-words">{r.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {r.route && <span className="font-mono">{r.route} · </span>}
                        poslednji put {formatDistanceToNow(new Date(r.lastSeen), { addSuffix: true, locale: srLatn })}
                        {r.lastUserId ? <> · korisnik #{r.lastUserId}</> : null}
                      </p>
                    </button>
                    <span className="font-mono text-sm shrink-0" title="Koliko puta">{r.count}×</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {r.resolvedAt ? (
                        <Button size="sm" variant="ghost" onClick={() => resolve.mutate({ id: r.id, resolved: false })}><RotateCcw className="w-3.5 h-3.5" /> Otvori</Button>
                      ) : (
                        <Button size="sm" variant="outline" className={resolve.isPending ? "opacity-60 pointer-events-none" : ""} onClick={() => resolve.mutate({ id: r.id, resolved: true })}><Check className="w-3.5 h-3.5" /> Rešeno</Button>
                      )}
                      <button type="button" onClick={() => setOpen(expanded ? null : r.id)} aria-label="Detalji" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted">
                        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="px-4 pb-4 space-y-2">
                      <p className="text-xs text-muted-foreground">
                        Prvi put <span className="font-mono">{format(new Date(r.firstSeen), "dd.MM.yyyy. HH:mm")}</span>
                        {" · "}poslednji put <span className="font-mono">{format(new Date(r.lastSeen), "dd.MM.yyyy. HH:mm")}</span>
                        {r.status ? <> · status <span className="font-mono">{r.status}</span></> : null}
                      </p>
                      {r.stack ? (
                        <pre className="text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-all rounded-xl bg-muted/50 border border-border p-3 max-h-72 overflow-auto">{r.stack}</pre>
                      ) : (
                        <p className="text-xs text-muted-foreground">Bez detalja - ova ruta je samo vratila grešku. Tačan uzrok je u Railway logovima za to vreme.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
