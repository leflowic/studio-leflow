import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Trophy, Clock, CheckCircle2, XCircle, Lock, Info, ChevronDown, Headphones, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

function getBelgradeMinutes(): number {
  const b = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }));
  return b.getHours() * 60 + b.getMinutes();
}

function useCountdown(targetHour: number, targetMinute: number) {
  const compute = useCallback(() => {
    const nowMins = getBelgradeMinutes();
    const openMins = targetHour * 60 + targetMinute;
    if (nowMins >= openMins) return { isOpen: true, minutesLeft: 0 };
    return { isOpen: false, minutesLeft: openMins - nowMins };
  }, [targetHour, targetMinute]);

  const [state, setState] = useState(compute);

  useEffect(() => {
    setState(compute());
    const id = setInterval(() => {
      const next = compute();
      setState(next);
      if (next.isOpen) clearInterval(id);
    }, 15000);
    return () => clearInterval(id);
  }, [compute]);

  return state;
}

const SOUND_BAR_DELAYS = [0, 0.12, 0.24, 0.06, 0.18, 0.30, 0.09, 0.15, 0.21];
const SOUND_BAR_HEIGHTS = [14, 28, 20, 36, 22, 32, 16, 26, 18];

export default function IgraPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [noClip, setNoClip] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playsLeft, setPlaysLeft] = useState(3);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; points: number } | null>(null);
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/game/today"],
    enabled: !!user && user.emailVerified === true,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const { data: leaderboardData } = useQuery<any>({
    queryKey: ["/api/game/leaderboard"],
    enabled: !!user && user.emailVerified === true,
  });

  const challenge = data?.challenge;
  const openHour: number = data?.openHour ?? challenge?.openHour ?? 17;
  const openMinute: number = data?.openMinute ?? challenge?.openMinute ?? 0;
  const { isOpen, minutesLeft } = useCountdown(openHour, openMinute);

  useEffect(() => {
    if (!isOpen || data?.available) return;
    refetch();
    const id = setInterval(refetch, 5000);
    return () => clearInterval(id);
  }, [isOpen, data?.available]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const date = challenge?.challengeDate;
    if (!date || !user?.id) return;
    const stored = localStorage.getItem(`igra_plays_${user.id}_${date}`);
    setPlaysLeft(stored !== null ? Math.max(0, parseInt(stored, 10)) : 3);
  }, [challenge?.challengeDate, user?.id]);

  useEffect(() => {
    if (!data?.available || !challenge?.challengeDate) return;

    setAudioReady(false);
    setAudioError(false);
    setNoClip(false);

    let cancelled = false;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const token = localStorage.getItem('auth_token');
    fetch('/api/game/clip', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => {
        if (r.status === 404) { if (!cancelled) setNoClip(true); return null; }
        if (r.status === 429) { if (!cancelled) setAudioError(true); return null; }
        if (!r.ok) throw new Error("fetch");
        return r.arrayBuffer();
      })
      .then(buf => {
        if (!buf || cancelled) return;
        return ctx.decodeAudioData(buf);
      })
      .then(decoded => {
        if (!decoded || cancelled) return;
        audioBufferRef.current = decoded;
        setAudioReady(true);
      })
      .catch(() => { if (!cancelled) setAudioError(true); });

    return () => {
      cancelled = true;
      audioBufferRef.current = null;
      setAudioReady(false);
      ctx.close().catch(() => {});
    };
  }, [data?.available, challenge?.challengeDate]);

  const playClip = useCallback(() => {
    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    const clipStart = challenge?.clipStartSeconds ?? 0;
    const date = challenge?.challengeDate;
    if (!ctx || !buffer || playsLeft <= 0 || playing) return;
    if (ctx.state === "suspended") ctx.resume();

    const newPlaysLeft = playsLeft - 1;
    setPlaying(true);
    setPlaysLeft(newPlaysLeft);
    if (user?.id && date) {
      localStorage.setItem(`igra_plays_${user.id}_${date}`, String(newPlaysLeft));
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0, clipStart, 1);

    setTimeout(() => setPlaying(false), 1100);
  }, [challenge?.clipStartSeconds, challenge?.challengeDate, playsLeft, playing, user?.id]);

  const guessMutation = useMutation({
    mutationFn: async (ans: string) => {
      const res = await apiRequest("POST", "/api/game/guess", { answer: ans });
      return res.json();
    },
    onSuccess: (responseData) => {
      setResult(responseData);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/game/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game/leaderboard"] });
    },
    onError: (err: any) => {
      toast({
        title: "Greška",
        description: err?.message || "Nije moguće poslati odgovor",
        variant: "destructive",
      });
    },
  });

  // ── Auth guards ──────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">Morate biti prijavljeni da igrate</p>
          <Button asChild size="lg"><a href="/prijava">Prijavi se</a></Button>
        </div>
      </div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm px-4">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-semibold">Verifikuj email da bi igrao</p>
          <p className="text-sm text-muted-foreground">
            Poslali smo ti email na <span className="text-foreground font-medium">{user.email}</span>.
            <br />Otvori ga i klikni na link za potvrdu, pa osvježi ovu stranicu.
          </p>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Osvježi stranicu
          </Button>
        </div>
      </div>
    );
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const alreadyPlayed = data?.alreadyPlayed || submitted;
  const prevGuess = data?.guess;
  const finalResult = result ?? (prevGuess ? { correct: prevGuess.correct, points: prevGuess.correct ? 10 : 0 } : null);
  const displayedAnswer = result ? answer : (prevGuess?.answer ?? "");
  const noClipDerived = data?.available && challenge?.hasClip === false;

  // ── Game body renderer ───────────────────────────────────────────────────────

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      );
    }

    if (!data) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <p>Greška pri učitavanju. Osveži stranicu.</p>
        </div>
      );
    }

    // ── CASE 1: game is open ─────────────────────────────────────────────────
    if (data.available) {
      if (alreadyPlayed) {
        return (
          <AnimatePresence mode="wait">
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-center py-10 space-y-6"
            >
              {finalResult?.correct ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-28 h-28 rounded-full bg-green-500/15 ring-4 ring-green-500/30 flex items-center justify-center mx-auto"
                  >
                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                  </motion.div>
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                    <p className="text-4xl font-black text-green-500">Tačno! 🎉</p>
                    <div className="inline-flex items-center gap-2 mt-3 bg-green-500/10 border border-green-500/20 rounded-full px-5 py-2">
                      <Zap className="w-4 h-4 text-green-500" />
                      <span className="font-bold text-green-500 text-lg">+10 poena</span>
                    </div>
                  </motion.div>
                </>
              ) : (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    className="w-28 h-28 rounded-full bg-destructive/10 ring-4 ring-destructive/20 flex items-center justify-center mx-auto"
                  >
                    <XCircle className="w-16 h-16 text-destructive" />
                  </motion.div>
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                    <p className="text-4xl font-black text-destructive">Netačno</p>
                    <p className="text-muted-foreground mt-1">Bolje sreće sutra 💪</p>
                  </motion.div>
                </>
              )}
              {displayedAnswer && (
                <p className="text-sm text-muted-foreground">
                  Tvoj odgovor: <strong className="text-foreground">{displayedAnswer}</strong>
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                {finalResult?.correct ? "Sjajno! Vrati se sutra za novi izazov 🎵" : "Vrati se sutra!"}
              </p>
            </motion.div>
          </AnimatePresence>
        );
      }

      // Active game
      const noClipFinal = noClip || noClipDerived;
      const canPlay = audioReady && !audioError && !noClipFinal && playsLeft > 0 && !playing;

      return (
        <div className="space-y-8">
          {/* Play section */}
          <div className="flex flex-col items-center gap-6 pt-4">
            {/* Sound bars - bigger and more dramatic */}
            <div className="flex items-end justify-center gap-1.5 h-12">
              {SOUND_BAR_DELAYS.map((delay, i) => (
                <div
                  key={i}
                  style={{
                    width: '5px',
                    borderRadius: '4px',
                    background: playing
                      ? `hsl(var(--primary))`
                      : `hsl(var(--primary) / ${audioReady ? 0.4 : 0.15})`,
                    transition: 'all 0.15s',
                    ...(playing
                      ? {
                          animation: `soundBar 0.5s ease-in-out ${delay}s infinite alternate`,
                          minHeight: '6px',
                        }
                      : {
                          height: `${SOUND_BAR_HEIGHTS[i]}px`,
                        }),
                  }}
                />
              ))}
            </div>

            {/* Play button */}
            <div className="relative">
              {playing && (
                <>
                  <span className="absolute inset-0 rounded-full bg-primary/20 animate-ping" style={{ margin: '-16px' }} />
                  <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping [animation-delay:0.3s]" style={{ margin: '-28px' }} />
                </>
              )}
              <button
                onClick={playClip}
                disabled={!canPlay}
                className={cn(
                  "relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-200",
                  "bg-primary text-primary-foreground",
                  "shadow-2xl shadow-primary/40",
                  "hover:scale-105 active:scale-95",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-lg",
                )}
              >
                {audioError || noClipFinal ? (
                  <XCircle className="w-12 h-12" />
                ) : !audioReady ? (
                  <div className="w-9 h-9 border-[3px] border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Play className="w-14 h-14 fill-current ml-2" />
                )}
              </button>
            </div>

            {/* Status */}
            <p className="text-sm text-muted-foreground text-center">
              {playing
                ? "🎵 Svira..."
                : audioError
                ? "Greška pri učitavanju klipa"
                : noClipFinal
                ? "Nema audio klipa za danas"
                : !audioReady
                ? "Učitavanje..."
                : playsLeft <= 0
                ? "Iskoristio si sva slušanja"
                : `Preostalo ${playsLeft} od 3 slušanja`}
            </p>

            {/* Play dots */}
            <div className="flex gap-3">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  animate={{ scale: i < playsLeft ? 1 : 0.8, opacity: i < playsLeft ? 1 : 0.25 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "w-3.5 h-3.5 rounded-full",
                    i < playsLeft ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-dashed border-border/50" />

          {/* Answer section */}
          <div className="space-y-3 pb-2">
            <p className="text-sm text-muted-foreground text-center font-medium">
              Upiši naziv pesme (bez izvođača)
            </p>
            <Input
              placeholder="npr. Mufasa"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && answer.trim() && !submitted && !guessMutation.isPending)
                  guessMutation.mutate(answer.trim());
              }}
              disabled={guessMutation.isPending || submitted}
              className="text-base text-center h-13 rounded-xl border-primary/20 focus-visible:ring-primary/30 bg-muted/30"
            />
            <Button
              onClick={() => guessMutation.mutate(answer.trim())}
              disabled={!answer.trim() || guessMutation.isPending || submitted}
              className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20"
              size="lg"
            >
              {guessMutation.isPending ? "Proveravam..." : "Potvrdi odgovor →"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              ⚠️ Jedan pokušaj - razmisli pre nego što odgovoriš
            </p>
          </div>
        </div>
      );
    }

    // ── CASE 2: no challenge today ───────────────────────────────────────────
    if (data.reason === "no_challenge") {
      return (
        <div className="text-center py-16 space-y-3 text-muted-foreground">
          <Headphones className="w-16 h-16 mx-auto opacity-20" />
          <p className="font-semibold text-lg">Nema izazova za danas</p>
          <p className="text-sm">Vrati se sutra!</p>
        </div>
      );
    }

    // ── CASE 3: countdown expired, waiting for server ────────────────────────
    if (isOpen) {
      return (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      );
    }

    // ── CASE 4: countdown ────────────────────────────────────────────────────
    return (
      <div className="text-center py-12 space-y-6">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-full bg-primary/10 ring-4 ring-primary/15 flex items-center justify-center mx-auto"
        >
          <Clock className="w-12 h-12 text-primary" />
        </motion.div>
        <div>
          <p className="text-sm text-muted-foreground mb-3">Igra se otvara u</p>
          <p className="text-6xl font-black tabular-nums tracking-tight">
            {String(openHour).padStart(2, "0")}
            <motion.span
              animate={{ opacity: [1, 0.2, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
            >:</motion.span>
            {String(openMinute).padStart(2, "0")}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-muted/60 rounded-full px-5 py-2.5 text-sm text-muted-foreground">
          <Clock className="w-3.5 h-3.5" />
          Još {minutesLeft > 60
            ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}min`
            : `${minutesLeft} min`}
        </div>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen">
      <SEO
        title="Pogodi Pesmu - Studio LeFlow"
        description="Dnevna igra: pogodi pesmu iz 1 sekunde!"
        noIndex={false}
      />

      <style>{`
        @keyframes soundBar {
          0%   { height: 6px; }
          100% { height: 48px; }
        }
      `}</style>

      {/* Dark atmospheric hero */}
      <div className="relative overflow-hidden bg-gradient-to-b from-black/80 via-primary/5 to-background border-b border-border/30">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_60%)]" />
        {/* Ambient sound bar decoration */}
        <div className="absolute inset-0 flex items-end justify-center pb-0 opacity-10 pointer-events-none">
          <div className="flex items-end gap-1 h-32 w-full max-w-2xl px-8">
            {Array.from({ length: 40 }, (_, i) => (
              <div
                key={i}
                className="flex-1 bg-primary rounded-t-sm"
                style={{ height: `${20 + Math.sin(i * 0.7) * 15 + Math.cos(i * 0.4) * 10}%` }}
              />
            ))}
          </div>
        </div>
        <div className="relative container mx-auto px-4 max-w-4xl py-10 md:py-14 text-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 mb-4"
          >
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-green-400 uppercase tracking-widest">Dnevna igra</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-4xl md:text-5xl font-black tracking-tight mb-3 text-white"
          >
            Pogodi Pesmu
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-white/60 text-base md:text-lg"
          >
            Čuješ 1 sekundu - možeš li da pogodiš?
          </motion.p>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-4xl py-8">
        <div className="grid lg:grid-cols-5 gap-6">

          {/* Left: game - 3/5 */}
          <div className="lg:col-span-3 space-y-4">

            {/* Instructions accordion */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
                onClick={() => setInstructionsOpen(o => !o)}
              >
                <span className="flex items-center gap-2 font-semibold text-sm">
                  <Info className="w-4 h-4 text-primary" />
                  Kako igrati?
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  instructionsOpen && "rotate-180"
                )} />
              </button>
              <AnimatePresence>
                {instructionsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-5 border-t border-border/40">
                      <ol className="space-y-0">
                        {[
                          { text: <>Svaki dan nova pesma. Igra se otvara u određeno vreme.</> },
                          { text: <>Pritisni <strong className="text-foreground">▶ Pusti</strong> - čuješ <strong className="text-foreground">1 sekundu</strong>. Imaš <strong className="text-foreground">3 slušanja</strong>.</> },
                          { text: <>Upiši naziv pesme i potvrdi. Imaš samo <strong className="text-foreground">1 pokušaj</strong>.</> },
                          { text: <>Tačno = <strong className="text-foreground">+10 poena</strong>. Nedeljni lider osvaja nagradu!</> },
                        ].map(({ text }, i) => (
                          <li key={i} className="flex gap-3 items-start pt-4">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                              {i + 1}
                            </span>
                            <p className="text-sm text-muted-foreground leading-relaxed pt-0.5">{text}</p>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Main game card */}
            <div className="rounded-2xl border border-primary/25 bg-card shadow-2xl shadow-primary/5 overflow-hidden">
              {/* Card header */}
              <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-6 py-4 flex items-center justify-between border-b border-border/40">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Headphones className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-bold text-sm">Dnevni izazov</span>
                </div>
                {data?.available && !alreadyPlayed && (
                  <Badge className="bg-green-500 hover:bg-green-500 text-white text-xs gap-1.5">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    Live
                  </Badge>
                )}
                {alreadyPlayed && (
                  <Badge variant="outline" className="text-xs">Odigrano</Badge>
                )}
              </div>
              <div className="p-6">
                {renderBody()}
              </div>
            </div>
          </div>

          {/* Right: leaderboard - 2/5, sticky */}
          <div className="lg:col-span-2">
            <div className="sticky top-20">
              {leaderboardData ? (
                <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
                  <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold text-sm">Nedeljni leaderboard</span>
                    </div>
                    {leaderboardData.prize && (
                      <span className="text-[11px] text-muted-foreground bg-muted/60 rounded-full px-2.5 py-1 font-medium">
                        🎁 {leaderboardData.prize.prizeDescription}
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    {!leaderboardData.leaderboard?.length ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
                        <p className="text-sm font-medium">Još niko nije pogodio</p>
                        <p className="text-xs mt-1">Budi prvi! 🎯</p>
                      </div>
                    ) : (
                      <ul className="space-y-0.5">
                        {leaderboardData.leaderboard.slice(0, 10).map((entry: any, i: number) => {
                          const isMe = entry.userId === user.id;
                          const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                          return (
                            <motion.li
                              key={entry.userId}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.04 }}
                              className={cn(
                                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors",
                                isMe
                                  ? "bg-primary/10 ring-1 ring-primary/25"
                                  : i < 3
                                  ? "bg-muted/40"
                                  : "hover:bg-muted/30"
                              )}
                            >
                              <span className={cn(
                                "w-6 text-center font-black text-sm flex-shrink-0",
                                i === 0 && "text-yellow-500",
                                i === 1 && "text-slate-400",
                                i === 2 && "text-amber-600",
                                i >= 3 && "text-muted-foreground text-xs"
                              )}>
                                {medal ?? `${i + 1}.`}
                              </span>
                              <AvatarWithInitials
                                src={entry.avatarUrl}
                                alt={entry.username}
                                name={entry.username}
                                userId={entry.userId}
                                className="w-7 h-7 flex-shrink-0"
                              />
                              <span className={cn("flex-1 font-medium text-sm truncate", isMe && "font-bold")}>
                                {entry.username}
                                {isMe && <span className="text-[10px] text-primary ml-1">(ti)</span>}
                              </span>
                              <span className={cn(
                                "text-sm font-bold flex-shrink-0",
                                i === 0 ? "text-yellow-500" : i < 3 ? "text-primary" : "text-muted-foreground"
                              )}>
                                {entry.points}
                                <span className="text-xs font-normal ml-0.5">pt</span>
                              </span>
                            </motion.li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-border/40 bg-card/50 p-5 text-center text-muted-foreground text-sm">
                  Leaderboard se učitava...
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
