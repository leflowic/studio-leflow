import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Check, X, RotateCcw, Users } from "lucide-react";
import { format } from "date-fns";

// Admin "Zaštita igara": today's Pogodi Pesmu players and Ploča dana spins,
// the one-per-network switches, and accounts sharing an IP (a multi-account
// hint, not proof). Read-mostly, so no forceMount needed on its TabsContent.

type Overview = {
  date: string;
  hasChallenge: boolean;
  players: Array<{ userId: number; username: string; listensUsed: number; answered: boolean; correct: boolean | null; answer: string | null; guessedAt: string | null }>;
  spins: Array<{ userId: number; username: string; reward: string; title: string; createdAt: string }>;
  sharedIps: Array<{ ip: string; lastSeen: string; users: Array<{ id: number; username: string }> }>;
  switches: { gameIpLimit: boolean; spinIpLimit: boolean; phoneRequired?: boolean; phoneConfigured?: boolean };
};

const KEY = ["/api/admin/anti-abuse/overview"];

export function AntiAbuseTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data, isLoading, isError } = useQuery<Overview>({ queryKey: KEY, refetchInterval: 60_000 });
  const [confirmGuess, setConfirmGuess] = useState<{ userId: number; username: string } | null>(null);

  const switchMut = useMutation({
    mutationFn: async (patch: Partial<Overview["switches"]>) => (await apiRequest("PUT", "/api/admin/anti-abuse/settings", patch)).json(),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: KEY }); toast({ title: "Sačuvano" }); },
    onError: () => toast({ title: "Izmena nije sačuvana", variant: "destructive" }),
  });
  const resetListens = useMutation({
    mutationFn: (userId: number) => apiRequest("POST", "/api/admin/anti-abuse/reset-listens", { userId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: KEY }); toast({ title: "Slušanja su vraćena" }); },
    onError: () => toast({ title: "Akcija nije uspela", variant: "destructive" }),
  });
  const deleteGuess = useMutation({
    mutationFn: (userId: number) => apiRequest("POST", "/api/admin/anti-abuse/delete-guess", { userId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: KEY }); setConfirmGuess(null); toast({ title: "Odgovor je poništen", description: "Igrač može ponovo da igra danas." }); },
    onError: (e: any) => toast({ title: "Akcija nije uspela", description: e?.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>;
  if (isError || !data) return <p className="text-sm text-destructive">Podaci nisu učitani. Osvežite stranicu.</p>;

  const answered = data.players.filter(p => p.answered);
  const correct = answered.filter(p => p.correct).length;
  const isSuper = user?.role === "admin";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Zaštita igara</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Pogodi Pesmu i Ploča dana za <span className="font-mono">{data.date.split("-").reverse().join(".")}.</span> Osvežava se svakog minuta.
        </p>
      </div>

      {/* Switches */}
      <section className="rounded-2xl border border-border bg-card divide-y divide-border">
        {([
          { key: "gameIpLimit", title: "Pogodi Pesmu: jedan odgovor po mreži", desc: "Sprečava da neko proba više odgovora preko dodatnih naloga. Isključite ako se javljaju ljudi sa iste kućne mreže." },
          { key: "spinIpLimit", title: "Ploča dana: jedno okretanje po mreži", desc: "Sprečava vrtenje ploče sa više naloga iz iste kuće ili telefona." },
          { key: "phoneRequired", title: "Nagradne igre samo za naloge potvrđene preko WhatsApp-a", desc: data.switches.phoneConfigured
            ? "Ploča dana i Pogodi Pesmu traže da korisnik jednom potvrdi nalog porukom na WhatsApp. Jedan broj = jedan nalog."
            : "WhatsApp još nije povezan sa sajtom - dok se ne poveže, ovaj prekidač ne blokira nikoga." },
        ] as const).map(r => (
          <label key={r.key} className={`flex items-start justify-between gap-6 px-5 py-4 ${isSuper ? "cursor-pointer" : ""}`}>
            <span>
              <span className="block text-sm font-medium">{r.title}</span>
              <span className="block text-xs text-muted-foreground mt-0.5 max-w-xl">{r.desc}</span>
            </span>
            <Switch
              checked={!!data.switches[r.key]} disabled={!isSuper || switchMut.isPending}
              onCheckedChange={v => switchMut.mutate({ [r.key]: v })} aria-label={r.title}
            />
          </label>
        ))}
        {!isSuper && <p className="px-5 py-3 text-xs text-muted-foreground">Prekidače menja samo Super Admin.</p>}
      </section>

      {/* Game today */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-semibold">Pogodi Pesmu danas</h3>
          {data.hasChallenge
            ? <p className="text-xs text-muted-foreground"><span className="font-mono text-foreground">{answered.length}</span> odgovora · <span className="font-mono text-foreground">{correct}</span> tačnih · <span className="font-mono text-foreground">{data.players.length - answered.length}</span> sluša bez odgovora</p>
            : <p className="text-xs text-muted-foreground">Za danas nema postavljene pesme.</p>}
        </div>
        {data.players.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border px-5 py-6">Danas još niko nije igrao.</p>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <ul className="divide-y divide-border">
              {data.players.map(p => (
                <li key={p.userId} className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
                  <span className="text-sm font-medium w-36 truncate">{p.username}</span>
                  <span className="text-xs text-muted-foreground font-mono w-24">{p.listensUsed} slušanja</span>
                  <span className="flex-1 min-w-[10rem] text-sm truncate">
                    {p.answered ? (
                      <span className="inline-flex items-center gap-1.5">
                        {p.correct ? <Check className="w-4 h-4 text-primary" /> : <X className="w-4 h-4 text-muted-foreground" />}
                        <span className={p.correct ? "" : "text-muted-foreground"}>{p.answer}</span>
                        {p.guessedAt && <span className="text-xs text-muted-foreground font-mono ml-1">{format(new Date(p.guessedAt), "HH:mm")}</span>}
                      </span>
                    ) : <span className="text-muted-foreground text-xs">Još nije odgovorio</span>}
                  </span>
                  <div className="flex gap-1">
                    {!p.answered && p.listensUsed > 0 && (
                      <Button size="sm" variant="ghost" className={resetListens.isPending ? "opacity-60 pointer-events-none" : ""} onClick={() => resetListens.mutate(p.userId)}>
                        <RotateCcw className="w-3.5 h-3.5" /> Vrati slušanja
                      </Button>
                    )}
                    {p.answered && (
                      <Button size="sm" variant="ghost" onClick={() => setConfirmGuess({ userId: p.userId, username: p.username })}>
                        Poništi odgovor
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Spins today */}
      <section className="space-y-3">
        <h3 className="font-semibold">Ploča dana danas <span className="text-muted-foreground font-normal text-sm">· <span className="font-mono">{data.spins.length}</span> okretanja</span></h3>
        {data.spins.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border px-5 py-6">Danas još niko nije vrteo ploču.</p>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <ul className="divide-y divide-border">
              {data.spins.map(s => (
                <li key={s.userId} className="flex items-center gap-5 px-4 py-2.5 text-sm">
                  <span className="font-mono text-xs text-muted-foreground w-12">{format(new Date(s.createdAt), "HH:mm")}</span>
                  <span className="w-36 truncate font-medium">{s.username}</span>
                  <span className={s.reward === "studio_50" ? "text-primary font-medium" : s.reward === "nothing" ? "text-muted-foreground" : ""}>{s.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Shared IPs */}
      <section className="space-y-3">
        <div>
          <h3 className="font-semibold">Nalozi sa iste mreže (30 dana)</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Više naloga koji su igrali ili vrteli ploču sa iste IP adrese. To može biti ista osoba sa više naloga, ali i ukućani ili ista mobilna mreža - proverite pre nego što nekoga kaznite.
          </p>
        </div>
        {data.sharedIps.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border px-5 py-6">Nema naloga koji dele mrežu.</p>
        ) : (
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <ul className="divide-y divide-border">
              {data.sharedIps.map(g => (
                <li key={g.ip + g.lastSeen} className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-4 py-3">
                  <span className="font-mono text-xs text-muted-foreground w-36">{g.ip}</span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="w-3.5 h-3.5" /><span className="font-mono">{g.users.length}</span></span>
                  <span className="flex-1 min-w-[12rem] text-sm">{g.users.map(u => u.username).join(", ")}</span>
                  <span className="font-mono text-xs text-muted-foreground">{g.lastSeen.split("-").reverse().join(".")}.</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <AlertDialog open={!!confirmGuess} onOpenChange={o => { if (!o) setConfirmGuess(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Poništiti odgovor?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmGuess?.username} će moći ponovo da igra današnju pesmu, sa svim slušanjima. Bodovi za ovaj odgovor se brišu. Ako je igrač već video tačan odgovor, drugi pokušaj nije fer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (confirmGuess && !deleteGuess.isPending) deleteGuess.mutate(confirmGuess.userId); }}>
              Poništi odgovor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
