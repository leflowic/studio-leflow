import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Check, X, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { getPushState, enablePush, type PushState } from "@/lib/push";

// "Prvi koraci" - a short checklist for new accounts that walks people into the
// features they would otherwise never find. Every step is checked against real
// data (never a self-reported tick), the card disappears for good once all
// steps are done, and it can be dismissed. State that can flip back (the daily
// game) is latched in localStorage so a finished step never "un-finishes".

type Step = { key: string; title: string; detail: string; done: boolean; href?: string; action?: () => void; busy?: boolean };

const lsKey = (userId: number, k: string) => `onb_${k}_${userId}`;
function lsGet(k: string) { try { return localStorage.getItem(k) === "1"; } catch { return false; } }
function lsSet(k: string) { try { localStorage.setItem(k, "1"); } catch {} }

export function GettingStarted({ gameData }: { gameData: any }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? 0;
  const [dismissed, setDismissed] = useState(() => lsGet(lsKey(userId, "dismissed")) || lsGet(lsKey(userId, "complete")));
  const [push, setPush] = useState<PushState | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  const { data: posts } = useQuery<unknown[]>({
    queryKey: [`/api/posts/user/${userId}`],
    enabled: !!userId && !dismissed && !!user?.emailVerified,
  });

  useEffect(() => {
    if (dismissed) return;
    getPushState().then(setPush).catch(() => setPush("unsupported"));
  }, [dismissed]);

  const playedNow = !!gameData?.alreadyPlayed || (gameData?.streak?.current ?? 0) > 0;
  useEffect(() => { if (userId && playedNow) lsSet(lsKey(userId, "game")); }, [userId, playedNow]);

  if (!user || dismissed || !user.emailVerified) return null;
  // Wait for the async facts so the card doesn't flash "undone" and then tick itself.
  if (push === null || posts === undefined) return null;

  async function turnOnPush() {
    setPushBusy(true);
    try {
      const s = await enablePush();
      setPush(s);
      if (s === "denied") toast({ title: "Obaveštenja su blokirana", description: "Dozvolite ih u podešavanjima browsera." });
    } catch (e: any) {
      toast({ title: "Obaveštenja nisu uključena", description: e?.message, variant: "destructive" });
    } finally {
      setPushBusy(false);
    }
  }

  const steps: Step[] = [
    {
      key: "avatar", title: "Dodajte profilnu sliku", detail: "Da vas ljudi prepoznaju u zajednici i porukama.",
      done: !!user.avatarUrl, href: "/settings",
    },
  ];
  if (push !== "unsupported" && push !== "denied") {
    steps.push({
      key: "push", title: "Uključite obaveštenja",
      detail: push === "ios-needs-install" ? "Na iPhone-u prvo dodajte sajt na početni ekran." : "Javljamo kad vam neko piše, kad pesma pređe u sledeću fazu i kad igra počne.",
      done: push === "on",
      ...(push === "ios-needs-install" ? { href: "/settings#obavestenja" } : { action: turnOnPush, busy: pushBusy }),
    });
  }
  steps.push(
    {
      key: "game", title: "Odigrajte Pogodi Pesmu", detail: "Svaki dan nova pesma, dve sekunde da je prepoznate.",
      done: playedNow || lsGet(lsKey(userId, "game")), href: "/igra",
    },
    {
      key: "post", title: "Objavite nešto u zajednici", detail: "Pesmu na kojoj radite, beat ili poziv na saradnju.",
      done: (posts?.length ?? 0) > 0, href: "/zajednica",
    },
  );
  if ((user as any).isVerifiedArtist) {
    steps.push({
      key: "profile", title: "Uključite javni profil izvođača", detail: "Stranica sa vašim pesmama, za link u Instagram biografiji.",
      done: !!(user as any).publicProfile, href: "/settings#javni-profil",
    });
  }

  const doneCount = steps.filter(s => s.done).length;
  if (doneCount === steps.length) {
    lsSet(lsKey(userId, "complete"));
    return null;
  }

  function dismiss() { lsSet(lsKey(userId, "dismissed")); setDismissed(true); }

  return (
    <section className="rounded-2xl border border-border/60 bg-card overflow-hidden" aria-labelledby="getting-started-title">
      <div className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5 pb-4">
        <div>
          <h2 id="getting-started-title" className="font-semibold">Prvi koraci</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-mono text-foreground">{doneCount}/{steps.length}</span> završeno
          </p>
        </div>
        <button
          type="button" onClick={dismiss} aria-label="Sakrij prve korake" title="Sakrij"
          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="h-1 bg-muted mx-5 sm:mx-6 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-[width] duration-500" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
      </div>
      <ul className="mt-3 divide-y divide-border/60">
        {steps.map(step => {
          const inner = (
            <>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border ${step.done ? "bg-primary border-primary text-primary-foreground" : "border-border"}`}>
                {step.done ? <Check className="w-3.5 h-3.5" /> : step.busy ? <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" /> : null}
              </span>
              <span className="flex-1 min-w-0">
                <span className={`block text-sm font-medium ${step.done ? "text-muted-foreground line-through decoration-muted-foreground/40" : ""}`}>{step.title}</span>
                {!step.done && <span className="block text-xs text-muted-foreground mt-0.5">{step.detail}</span>}
              </span>
              {!step.done && <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary shrink-0" />}
            </>
          );
          const cls = "group flex items-center gap-3 px-5 sm:px-6 py-3.5 w-full text-left transition-colors";
          if (step.done) return <li key={step.key}><div className={cls}>{inner}</div></li>;
          if (step.action) {
            return (
              <li key={step.key}>
                <button type="button" onClick={step.action} aria-busy={step.busy} className={`${cls} hover:bg-muted/30 ${step.busy ? "pointer-events-none" : ""}`}>{inner}</button>
              </li>
            );
          }
          return <li key={step.key}><Link href={step.href!} className={`${cls} hover:bg-muted/30`}>{inner}</Link></li>;
        })}
      </ul>
    </section>
  );
}
