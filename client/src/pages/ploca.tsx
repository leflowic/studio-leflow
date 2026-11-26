import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MyVouchersPanel } from "@/components/dashboard/MyVouchersPanel";
import { Copy, Check, Loader2, ArrowRight } from "lucide-react";
import {
  RecordDisc, PRIZES, ICONS, sectorsFor, rotationFor, fmtDate,
  type SpinResult, type SpinToday, type Reward,
} from "@/components/spin/spin-shared";

const SPIN_MS = 4200;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

function useMidnightCountdown() {
  const [label, setLabel] = useState("");
  useEffect(() => {
    const tick = () => {
      const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Europe/Belgrade" }));
      const mins = (23 - now.getHours()) * 60 + (59 - now.getMinutes()) + 1;
      setLabel(mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}min` : `${mins}min`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);
  return label;
}

export default function PlocaPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const verified = !!user?.emailVerified;

  const { data, isLoading } = useQuery<SpinToday>({ queryKey: ["/api/spin/today"], enabled: verified });
  const { data: history } = useQuery<Array<{ date: string; reward: Reward; title: string }>>({ queryKey: ["/api/spin/history"], enabled: verified });

  const on = data && data.enabled ? data : null;
  const sectors = useMemo(() => sectorsFor(on ? on.studioPrizeEnabled : true), [on?.studioPrizeEnabled]); // eslint-disable-line react-hooks/exhaustive-deps

  const [rotation, setRotation] = useState(0);
  const [landed, setLanded] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState<SpinResult | null>(null);
  const [copied, setCopied] = useState(false);
  const settledRef = useRef(false);
  const jitter = useMemo(() => Math.random() * 13 - 6.5, []);
  const countdown = useMidnightCountdown();
  const reduced = prefersReducedMotion();

  // Already spun today: park the record on the result.
  useEffect(() => {
    if (!on?.spun || !on.result || settledRef.current || spinning) return;
    settledRef.current = true;
    const { rotation: r, index } = rotationFor(sectors, on.result.reward, 0, 0, jitter);
    setRotation(r);
    setLanded(index);
    setRevealed(on.result);
  }, [on, spinning, jitter, sectors]);

  const spin = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/spin")).json() as Promise<{ created: boolean; result: SpinResult }>,
    onSuccess: ({ result }) => {
      settledRef.current = true;
      setSpinning(true);
      const { rotation: next, index } = rotationFor(sectors, result.reward, rotation, reduced ? 1 : 6, jitter);
      setRotation(next);
      setLanded(index);
      window.setTimeout(() => {
        setSpinning(false);
        setRevealed(result);
        for (const k of ["/api/spin/today", "/api/spin/history", "/api/game/today", "/api/me/vouchers"]) queryClient.invalidateQueries({ queryKey: [k] });
      }, reduced ? 700 : SPIN_MS + 150);
    },
    onError: (e: any) => toast({ title: "Ploča nije zavrtena", description: e?.message || "Pokušajte ponovo za minut.", variant: "destructive" }),
  });

  const busy = spinning || spin.isPending;
  const canSpin = !!on && !on.spun && !revealed && !busy;
  const result = revealed;

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  // ── Right-hand panel, by state ──
  let panel: React.ReactNode;
  if (authLoading || (verified && isLoading)) {
    panel = <div className="space-y-3 mt-6"><Skeleton className="h-10 w-40 rounded-full" /><Skeleton className="h-4 w-64" /></div>;
  } else if (!user) {
    panel = (
      <div className="mt-6">
        <p className="text-sm text-muted-foreground">Ploču vrte korisnici sa nalogom. Nalog je besplatan.</p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link href="/registracija"><Button>Napravite nalog</Button></Link>
          <Link href="/prijava"><Button variant="outline">Prijava</Button></Link>
        </div>
      </div>
    );
  } else if (!verified) {
    panel = <p className="mt-6 text-sm text-muted-foreground">Potvrdite email adresu (link je stigao u inbox) i ploča je vaša.</p>;
  } else if (data && !data.enabled) {
    panel = <p className="mt-6 text-sm text-muted-foreground">Ploča dana je trenutno pauzirana. Vratite se uskoro.</p>;
  } else if (!result) {
    panel = (
      <div className="mt-6">
        <Button
          size="lg" className={!canSpin ? "opacity-60 pointer-events-none" : ""} aria-busy={busy}
          onClick={() => canSpin && spin.mutate()}
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? "Ploča se vrti..." : "Zavrti ploču"}
        </Button>
        {on?.studioNote && <p className="text-xs text-muted-foreground mt-3">{on.studioNote}</p>}
      </div>
    );
  } else {
    panel = (
      <div className="mt-6" aria-live="polite">
        <p className="text-xs text-muted-foreground">Danas ti je palo</p>
        <p className={`text-2xl font-semibold mt-1 ${result.reward === "studio_50" ? "text-primary" : ""}`}>{result.title}</p>
        <p className="text-sm text-muted-foreground mt-1">{result.detail}</p>

        {result.voucher && (
          <div className="mt-5 rounded-xl border border-primary/40 bg-primary/5 p-4">
            <p className="text-xs text-muted-foreground">Kod vaučera</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-lg tracking-wider">{result.voucher.code}</span>
              <button type="button" onClick={() => copyCode(result.voucher!.code)} aria-label="Kopiraj kod" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted">
                {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Navedite kod kad zakazujete termin. Važi do <span className="font-mono">{fmtDate(result.voucher.expiresAt)}</span>
            </p>
            <Link href="/kontakt"><Button size="sm" className="mt-3">Zakažite termin</Button></Link>
          </div>
        )}
        {result.reward === "extra_listen" && <Link href="/igra"><Button variant="outline" className="mt-5">Idi na Pogodi Pesmu <ArrowRight className="w-4 h-4" /></Button></Link>}
        {result.reward === "feature_post" && <Link href="/zajednica"><Button variant="outline" className="mt-5">Pogledaj zajednicu <ArrowRight className="w-4 h-4" /></Button></Link>}

        {countdown && <p className="text-sm text-muted-foreground mt-6">Nova ploča za <span className="font-mono text-foreground">{countdown}</span></p>}
      </div>
    );
  }

  const studioOn = on ? on.studioPrizeEnabled : true;
  const prizes = PRIZES.filter(p => !p.studio || studioOn);

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Ploča dana - Studio LeFlow" description="Jednom dnevno zavrti ploču i osvoji nagradu - do 50% popusta na snimanje i mix/master." noIndex />

      <div className="container mx-auto px-4 max-w-5xl">
        {/* Stage */}
        <section className="grid md:grid-cols-2 gap-10 md:gap-14 items-center py-10 md:py-16">
          <div className="mx-auto w-full max-w-[420px]">
            <RecordDisc sectors={sectors} rotation={rotation} spinMs={spinning ? (reduced ? 600 : SPIN_MS) : null} highlight={result && !spinning ? landed : null} />
          </div>
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold">Ploča dana</h1>
            <p className="text-lg text-muted-foreground mt-3 max-w-md">
              Jednom dnevno zavrti ploču. Igla bira nagradu - od dodatnog slušanja u igri do 50% popusta u studiju.
            </p>
            {panel}
          </div>
        </section>

        {/* Prizes */}
        <section className="py-10 border-t border-border/60" aria-labelledby="prizes-title">
          <h2 id="prizes-title" className="text-xl font-semibold">Šta može da padne</h2>
          <ul className="mt-6 grid sm:grid-cols-2 gap-3">
            {prizes.map(p => {
              const Icon = ICONS[p.reward];
              const soldOut = p.studio && on && on.studioPrizesLeft <= 0;
              return (
                <li key={p.reward} className={`rounded-xl border p-4 flex gap-3 ${p.studio ? "border-primary/40 bg-primary/5 sm:col-span-2" : "border-border/60 bg-card"}`}>
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${p.studio ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="min-w-0">
                    <p className="font-medium">{p.title}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{p.detail}</p>
                    {p.studio && on && (
                      <p className="text-xs font-mono mt-2 text-muted-foreground">
                        {soldOut ? "Ovog meseca su oba osvojena - novi od prvog u mesecu" : `Ovog meseca još ${on.studioPrizesLeft} od ${on.studioPrizesPerMonth}`}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Personal history */}
        {verified && (history?.length || 0) > 0 && (
          <section className="py-10 border-t border-border/60 space-y-6" aria-labelledby="history-title">
            <h2 id="history-title" className="text-xl font-semibold">Tvoja ploča</h2>
            <MyVouchersPanel />
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <ul className="divide-y divide-border/60">
                {history!.map(h => {
                  const Icon = ICONS[h.reward] ?? ICONS.nothing;
                  return (
                    <li key={h.date} className="flex items-center gap-3 px-5 py-3">
                      <span className="font-mono text-xs text-muted-foreground w-24 shrink-0">{h.date.split("-").reverse().join(".")}.</span>
                      <Icon className={`w-4 h-4 shrink-0 ${h.reward === "studio_50" ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm ${h.reward === "nothing" ? "text-muted-foreground" : ""}`}>{h.title}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        )}

        {/* Rules in short */}
        <section className="py-10 border-t border-border/60 mb-10" aria-labelledby="rules-title">
          <h2 id="rules-title" className="text-xl font-semibold">Pravila ukratko</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground max-w-2xl list-disc pl-5">
            <li>Jedno okretanje dnevno po nalogu i po mreži (IP adresi). Nova ploča u ponoć.</li>
            <li>Nagradu bira server u trenutku okretanja. Polja na ploči su samo prikaz, ne stvarne šanse.</li>
            <li>Studijski popust mogu da osvoje nalozi stari bar 7 dana, najviše jednom godišnje po osobi.</li>
            <li>Vaučer je vezan za nalog, ne prenosi se i ne menja se za novac.</li>
          </ul>
          <Link href="/pravila#ploca-dana" className="inline-flex items-center gap-1 text-sm text-primary hover:underline underline-offset-4 mt-4">
            Sva pravila <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </section>
      </div>
    </div>
  );
}
