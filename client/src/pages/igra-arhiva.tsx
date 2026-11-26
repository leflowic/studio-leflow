import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Play, Loader2, Check, X } from "lucide-react";

// Pogodi Pesmu archive: replay past days for practice. No points, no coins,
// no limit on listens (the snippet is the same 1s slice the server cut for
// that day). The answer is revealed after a guess.

type ArchiveDay = { date: string; number: number };
type GuessResult = { correct: boolean; answer: string };

const fmt = (d: string) => d.split("-").reverse().join(".") + ".";

function ArchivePlayer({ day }: { day: ArchiveDay }) {
  const ctxRef = useRef<AudioContext | null>(null);
  const bufRef = useRef<AudioBuffer | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [playing, setPlaying] = useState(false);
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<GuessResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    setState("loading"); setResult(null); setAnswer("");
    const ctx = new AudioContext();
    ctxRef.current = ctx;
    const token = localStorage.getItem("auth_token");
    fetch(`/api/game/archive/${day.date}/clip`, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then(r => { if (!r.ok) throw new Error(String(r.status)); return r.arrayBuffer(); })
      .then(b => ctx.decodeAudioData(b))
      .then(decoded => { if (!cancelled) { bufRef.current = decoded; setState("ready"); } })
      .catch(() => { if (!cancelled) setState("error"); });
    return () => { cancelled = true; bufRef.current = null; ctx.close().catch(() => {}); };
  }, [day.date]);

  function play() {
    const ctx = ctxRef.current, buf = bufRef.current;
    if (!ctx || !buf || playing) return;
    if (ctx.state === "suspended") ctx.resume();
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(ctx.destination); src.start(0);
    setPlaying(true);
    setTimeout(() => setPlaying(false), Math.ceil(buf.duration * 1000) + 100);
  }

  const guess = useMutation({
    mutationFn: async () => (await apiRequest("POST", `/api/game/archive/${day.date}/guess`, { answer })).json() as Promise<GuessResult>,
    onSuccess: setResult,
  });

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-6">
      <p className="text-xs text-muted-foreground font-mono">#{day.number} · {fmt(day.date)}</p>
      <div className="mt-5 flex items-center gap-4">
        <Button size="lg" onClick={play} className={state !== "ready" || playing ? "opacity-60 pointer-events-none" : ""} aria-busy={playing}>
          {state === "loading" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          {state === "error" ? "Snimak nije dostupan" : playing ? "Pušta se..." : "Pusti"}
        </Button>
        <span className="text-xs text-muted-foreground">Slušaj koliko god puta hoćeš.</span>
      </div>

      {!result ? (
        <form className="mt-6 flex gap-2" onSubmit={e => { e.preventDefault(); if (answer.trim() && !guess.isPending) guess.mutate(); }}>
          <Input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Naziv pesme" className="h-10" />
          <Button type="submit" className={!answer.trim() || guess.isPending ? "opacity-50 pointer-events-none" : ""}>Proveri</Button>
        </form>
      ) : (
        <div className="mt-6" aria-live="polite">
          <p className={`flex items-center gap-2 font-semibold ${result.correct ? "text-primary" : ""}`}>
            {result.correct ? <Check className="w-5 h-5" /> : <X className="w-5 h-5 text-muted-foreground" />}
            {result.correct ? "Tačno!" : "Nije to"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">Pesma je bila: <span className="text-foreground font-medium">{result.answer}</span></p>
        </div>
      )}
    </div>
  );
}

export default function IgraArhivaPage() {
  const { data, isLoading } = useQuery<ArchiveDay[]>({ queryKey: ["/api/game/archive"] });
  const [selected, setSelected] = useState<ArchiveDay | null>(null);
  const current = selected ?? data?.[0] ?? null;

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Arhiva - Pogodi Pesmu - Studio LeFlow" description="Vežbaj na pesmama iz prethodnih dana." noIndex />
      <div className="container mx-auto px-4 max-w-4xl py-10 md:py-14 space-y-8">
        <div>
          <Link href="/igra" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Današnja igra</Link>
          <h1 className="text-3xl md:text-4xl font-semibold mt-3">Arhiva</h1>
          <p className="text-muted-foreground mt-2">Pesme iz prethodnih dana, za vežbu. Ovde nema bodova ni coina - samo proveri koliko ih prepoznaješ.</p>
        </div>

        {isLoading ? (
          <Skeleton className="h-48 rounded-2xl" />
        ) : !data?.length ? (
          <p className="text-sm text-muted-foreground rounded-2xl border border-dashed border-border px-5 py-8">Arhiva je još prazna - pojaviće se posle prve odigrane igre.</p>
        ) : (
          <div className="grid md:grid-cols-[minmax(0,1fr)_14rem] gap-6 items-start">
            {current && <ArchivePlayer key={current.date} day={current} />}
            <ul className="rounded-2xl border border-border/60 bg-card divide-y divide-border/60 max-h-[28rem] overflow-y-auto">
              {data.map(d => (
                <li key={d.date}>
                  <button type="button" onClick={() => setSelected(d)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left hover:bg-muted/40 ${current?.date === d.date ? "bg-muted/50 font-medium" : ""}`}>
                    <span className="font-mono">#{d.number}</span>
                    <span className="font-mono text-xs text-muted-foreground">{fmt(d.date)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
