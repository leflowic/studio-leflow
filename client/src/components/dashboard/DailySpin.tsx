import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Headphones, TrendingUp, Minus, Pin, Ticket, Copy, Check, Loader2 } from "lucide-react";

const fmtDate = (d: string) => { const x = new Date(d); const p = (n: number) => String(n).padStart(2, "0"); return `${p(x.getDate())}.${p(x.getMonth() + 1)}.${x.getFullYear()}.`; };


// "Ploča dana" - the daily spin. The server decides the reward (POST /api/spin);
// this component only animates the record to the sector holding that reward.
// Sector layout is purely visual; it does not reflect the real odds (the studio
// voucher is far rarer than 1 in 8 - see server/spin.ts).

type Reward = "studio_50" | "extra_listen" | "feature_post" | "points" | "nothing";
type SpinResult = { reward: Reward; title: string; detail: string; voucher: { code: string; expiresAt: string } | null };
type SpinToday = { date: string; spun: boolean; result: SpinResult | null; studioPrizesLeft: number; studioPrizesPerMonth: number };

const SECTORS: Reward[] = ["extra_listen", "points", "nothing", "feature_post", "extra_listen", "points", "nothing", "studio_50"];
const SECTOR_DEG = 360 / SECTORS.length;
const ICONS: Record<Reward, React.ElementType> = {
  extra_listen: Headphones, points: TrendingUp, nothing: Minus, feature_post: Pin, studio_50: Ticket,
};
const LEGEND: Array<{ reward: Reward; label: string }> = [
  { reward: "studio_50", label: "50% popusta na snimanje + mix/master" },
  { reward: "extra_listen", label: "+1 slušanje u Pogodi Pesmu" },
  { reward: "feature_post", label: "Objava na vrhu zajednice 24h" },
  { reward: "points", label: "+5 bodova za rang" },
  { reward: "nothing", label: "Prazna strana" },
];

const SPIN_MS = 4200;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/** Rotation (deg, clockwise) that puts the given sector under the needle at 12 o'clock. */
function rotationFor(reward: Reward, from: number, turns: number, jitter: number) {
  const indices = SECTORS.map((r, i) => (r === reward ? i : -1)).filter(i => i >= 0);
  const idx = indices[Math.floor(Math.random() * indices.length)] ?? 0;
  const center = idx * SECTOR_DEG + SECTOR_DEG / 2;
  const target = (360 - center + jitter + 360) % 360;
  const base = from - (from % 360);
  return base + turns * 360 + target + (target <= from % 360 && turns === 0 ? 360 : 0);
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

export function DailySpin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const enabled = !!user?.emailVerified;
  const { data, isLoading } = useQuery<SpinToday>({ queryKey: ["/api/spin/today"], enabled });
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [revealed, setRevealed] = useState<SpinResult | null>(null);
  const [copied, setCopied] = useState(false);
  const settledRef = useRef(false);
  const countdown = useMidnightCountdown();
  const jitter = useMemo(() => Math.random() * SECTOR_DEG * 0.6 - SECTOR_DEG * 0.3, []);

  // Already spun today: park the record on the result without animating.
  useEffect(() => {
    if (!data?.spun || !data.result || settledRef.current || spinning) return;
    settledRef.current = true;
    setRotation(rotationFor(data.result.reward, 0, 0, jitter));
    setRevealed(data.result);
  }, [data, spinning, jitter]);

  const spinMutation = useMutation({
    mutationFn: async () => (await apiRequest("POST", "/api/spin")).json() as Promise<{ created: boolean; result: SpinResult }>,
    onSuccess: ({ result }) => {
      settledRef.current = true;
      const reduced = prefersReducedMotion();
      setSpinning(true);
      setRotation(r => rotationFor(result.reward, r, reduced ? 1 : 6, jitter));
      window.setTimeout(() => {
        setSpinning(false);
        setRevealed(result);
        queryClient.invalidateQueries({ queryKey: ["/api/spin/today"] });
        queryClient.invalidateQueries({ queryKey: ["/api/game/today"] });
        if (result.reward === "studio_50") queryClient.invalidateQueries({ queryKey: ["/api/me/vouchers"] });
        if (result.reward === "points") queryClient.invalidateQueries({ queryKey: ["/api/me/activity"] });
      }, reduced ? 700 : SPIN_MS + 150);
    },
    onError: (e: any) => toast({ title: "Ploča nije zavrtena", description: e?.message || "Pokušajte ponovo za minut.", variant: "destructive" }),
  });

  if (!enabled || isLoading || !data) return null;

  const canSpin = !data.spun && !revealed && !spinning && !spinMutation.isPending;
  const reduced = prefersReducedMotion();
  const result = revealed;

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section id="ploca" className="scroll-mt-24 rounded-2xl border border-border/60 bg-card overflow-hidden" aria-labelledby="spin-title">
      <div className="grid md:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-6 md:gap-8 p-5 sm:p-6 items-center">
        {/* Record */}
        <div className="relative mx-auto w-full max-w-[300px] aspect-square">
          {/* Needle */}
          <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-10 flex flex-col items-center" aria-hidden="true">
            <div className="w-3 h-3 rounded-full bg-primary shadow" />
            <div className="w-0 h-0 border-l-[7px] border-r-[7px] border-t-[12px] border-l-transparent border-r-transparent border-t-primary -mt-0.5" />
          </div>
          <svg
            viewBox="-150 -150 300 300"
            className="w-full h-full drop-shadow-xl"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? `transform ${reduced ? 600 : SPIN_MS}ms cubic-bezier(0.12, 0.7, 0.12, 1)` : "none",
            }}
            role="img"
            aria-label="Ploča dana"
          >
            <circle r="148" fill="#111214" />
            {/* grooves */}
            {Array.from({ length: 16 }, (_, i) => (
              <circle key={i} r={60 + i * 5.5} fill="none" stroke="#ffffff" strokeOpacity={i % 3 === 0 ? 0.07 : 0.035} strokeWidth="1" />
            ))}
            {/* sector dividers */}
            {SECTORS.map((_, i) => {
              const a = (i * SECTOR_DEG - 90) * (Math.PI / 180);
              return <line key={i} x1={Math.cos(a) * 56} y1={Math.sin(a) * 56} x2={Math.cos(a) * 146} y2={Math.sin(a) * 146} stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />;
            })}
            {/* highlighted winning sector once revealed */}
            {result && !spinning && SECTORS.map((r, i) => {
              if (r !== result.reward) return null;
              const a0 = (i * SECTOR_DEG - 90) * (Math.PI / 180);
              const a1 = ((i + 1) * SECTOR_DEG - 90) * (Math.PI / 180);
              const R = 146, r0 = 56;
              const d = `M ${Math.cos(a0) * r0} ${Math.sin(a0) * r0} L ${Math.cos(a0) * R} ${Math.sin(a0) * R} A ${R} ${R} 0 0 1 ${Math.cos(a1) * R} ${Math.sin(a1) * R} L ${Math.cos(a1) * r0} ${Math.sin(a1) * r0} A ${r0} ${r0} 0 0 0 ${Math.cos(a0) * r0} ${Math.sin(a0) * r0} Z`;
              return <path key={i} d={d} fill="hsl(var(--primary))" fillOpacity="0.14" />;
            })}
            {/* sector icons */}
            {SECTORS.map((r, i) => {
              const Icon = ICONS[r];
              const mid = (i * SECTOR_DEG + SECTOR_DEG / 2) - 90;
              const a = mid * (Math.PI / 180);
              const x = Math.cos(a) * 112, y = Math.sin(a) * 112;
              const special = r === "studio_50";
              return (
                <g key={i} transform={`translate(${x} ${y}) rotate(${mid + 90})`}>
                  <foreignObject x="-11" y="-11" width="22" height="22">
                    <Icon width={22} height={22} strokeWidth={1.75} color={special ? "hsl(32 42% 62%)" : "rgba(255,255,255,0.55)"} />
                  </foreignObject>
                </g>
              );
            })}
            {/* label */}
            <circle r="52" fill="hsl(32 42% 62%)" />
            <circle r="50" fill="none" stroke="#000" strokeOpacity="0.15" />
            <text y="-6" textAnchor="middle" fontSize="13" fontWeight="600" fill="#1b1c1e" fontFamily="Geist, system-ui, sans-serif">Studio</text>
            <text y="10" textAnchor="middle" fontSize="13" fontWeight="600" fill="#1b1c1e" fontFamily="Geist, system-ui, sans-serif">LeFlow</text>
            <circle r="4" fill="#111214" />
          </svg>
        </div>

        {/* Copy + result */}
        <div className="min-w-0">
          <h2 id="spin-title" className="text-lg font-semibold">Ploča dana</h2>

          {!result ? (
            <>
              <p className="text-sm text-muted-foreground mt-1">
                Jednom dnevno zavrti ploču. Igla bira nagradu.
              </p>
              <Button
                className={`mt-5 ${!canSpin ? "opacity-60 pointer-events-none" : ""}`}
                aria-busy={spinning || spinMutation.isPending}
                onClick={() => canSpin && spinMutation.mutate()}
              >
                {(spinning || spinMutation.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
                {spinning || spinMutation.isPending ? "Ploča se vrti..." : "Zavrti ploču"}
              </Button>
            </>
          ) : (
            <div className="mt-2" aria-live="polite">
              <p className={`text-xl font-semibold ${result.reward === "studio_50" ? "text-primary" : ""}`}>{result.title}</p>
              <p className="text-sm text-muted-foreground mt-1">{result.detail}</p>

              {result.voucher && (
                <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-4">
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
              {result.reward === "extra_listen" && <Link href="/igra"><Button size="sm" variant="outline" className="mt-4">Idi na Pogodi Pesmu</Button></Link>}
              {result.reward === "feature_post" && <Link href="/zajednica"><Button size="sm" variant="outline" className="mt-4">Pogledaj zajednicu</Button></Link>}

              {countdown && <p className="text-xs text-muted-foreground mt-4">Nova ploča za <span className="font-mono">{countdown}</span></p>}
            </div>
          )}

          <ul className="mt-6 space-y-1.5">
            {LEGEND.map(({ reward, label }) => {
              const Icon = ICONS[reward];
              const soldOut = reward === "studio_50" && data.studioPrizesLeft <= 0;
              return (
                <li key={reward} className={`flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-xs ${soldOut ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${reward === "studio_50" && !soldOut ? "text-primary" : ""}`} />
                  <span className={soldOut ? "line-through" : ""}>{label}</span>
                  {reward === "studio_50" && (
                    <span className="font-mono text-[11px] text-muted-foreground/70">
                      {soldOut ? "osvojeno ovog meseca" : `${data.studioPrizesLeft}/${data.studioPrizesPerMonth} ovog meseca, retko`}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-muted-foreground/70 mt-3">
            <Link href="/pravila#ploca-dana" className="hover:text-foreground underline underline-offset-4">Pravila Ploče dana</Link>
          </p>
        </div>
      </div>
    </section>
  );
}
