import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { SEO } from "@/components/SEO";
import { useToast } from "@/hooks/use-toast";
import { Music, Play, Trophy, Clock, CheckCircle2, XCircle, Lock, ChevronDown, Info, Headphones } from "lucide-react";
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

const SOUND_BAR_DELAYS = [0, 0.12, 0.24, 0.06, 0.18, 0.30, 0.09];
const SOUND_BAR_HEIGHTS = [12, 22, 16, 28, 18, 24, 14]; // px at rest (decorative)

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
    if (isOpen && data && !data.available) refetch();
  }, [isOpen, data?.available]);

  // Restore plays left from localStorage when challenge date changes (survives page refresh)
  useEffect(() => {
    const date = challenge?.challengeDate;
    if (!date || !user?.id) return;
    const stored = localStorage.getItem(`igra_plays_${user.id}_${date}`);
    setPlaysLeft(stored !== null ? Math.max(0, parseInt(stored, 10)) : 3);
  }, [challenge?.challengeDate, user?.id]);

  // Load audio via server proxy once the game is open (trigger on challengeDate, not clipUrl)
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
          <p className="text-lg font-semibold">Potvrdite email da biste igrali</p>
          <p className="text-sm text-muted-foreground">Proverite vaš inbox i kliknite na link za potvrdu.</p>
        </div>
      </div>
    );
  }

  // ── Derived state ────────────────────────────────────────────────────────────

  const alreadyPlayed = data?.alreadyPlayed || submitted;
  const prevGuess = data?.guess;
  const finalResult = result ?? (prevGuess ? { correct: prevGuess.correct, points: prevGuess.correct ? 10 : 0 } : null);
  const displayedAnswer = result ? answer : (prevGuess?.answer ?? "");
  // noClip is set to true when /api/game/clip returns 404 (or hasClip is explicitly false)
  const noClipDerived = data?.available && challenge?.hasClip === false;

  // ── Game body renderer ───────────────────────────────────────────────────────

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
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
          <div className="text-center py-8 space-y-5">
            {finalResult?.correct ? (
              <>
                <div className="w-24 h-24 rounded-full bg-green-500/10 ring-4 ring-green-500/20 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-14 h-14 text-green-500" />
                </div>
                <div>
                  <p className="text-3xl font-black text-green-500">Tačno! 🎉</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">+10 poena</p>
                </div>
              </>
            ) : (
              <>
                <div className="w-24 h-24 rounded-full bg-destructive/10 ring-4 ring-destructive/20 flex items-center justify-center mx-auto">
                  <XCircle className="w-14 h-14 text-destructive" />
                </div>
                <div>
                  <p className="text-3xl font-black text-destructive">Netačno</p>
                  <p className="text-xl font-semibold text-muted-foreground mt-1">+0 poena</p>
                </div>
                {data.correctAnswer && (
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl px-5 py-4 inline-block">
                    <p className="text-xs text-muted-foreground mb-1">Tačan odgovor</p>
                    <p className="font-black text-foreground text-xl">{data.correctAnswer}</p>
                  </div>
                )}
              </>
            )}
            {displayedAnswer && (
              <p className="text-sm text-muted-foreground">
                Tvoj odgovor: <strong className="text-foreground">{displayedAnswer}</strong>
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {finalResult?.correct ? "Sjajno! Vrati se sutra za novi izazov 🎵" : "Više sreće sutra! 💪"}
            </p>
          </div>
        );
      }

      // Active game
      const noClipFinal = noClip || noClipDerived;
      const canPlay = audioReady && !audioError && !noClipFinal && playsLeft > 0 && !playing;
      const playBtnDisabled = !canPlay;

      return (
        <div className="space-y-7">
          {/* Play section */}
          <div className="flex flex-col items-center gap-5 pt-2">
            {/* Sound bars */}
            <div className="flex items-end justify-center gap-1.5 h-9">
              {SOUND_BAR_DELAYS.map((delay, i) => (
                <div
                  key={i}
                  style={{
                    width: '4px',
                    borderRadius: '3px',
                    background: 'hsl(var(--primary))',
                    transition: 'height 0.1s',
                    ...(playing
                      ? {
                          animation: `soundBar 0.5s ease-in-out ${delay}s infinite alternate`,
                          minHeight: '6px',
                        }
                      : {
                          height: `${SOUND_BAR_HEIGHTS[i]}px`,
                          opacity: audioReady ? 0.35 : 0.15,
                        }),
                  }}
                />
              ))}
            </div>

            {/* Play button */}
            <div className="relative">
              {playing && (
                <>
                  <span className="absolute inset-0 rounded-full bg-primary/25 animate-ping" />
                  <span className="absolute inset-0 scale-125 rounded-full bg-primary/10 animate-ping [animation-delay:0.25s]" />
                </>
              )}
              <button
                onClick={playClip}
                disabled={playBtnDisabled}
                className={cn(
                  "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-200",
                  "bg-primary text-primary-foreground shadow-xl shadow-primary/30",
                  "hover:scale-105 active:scale-95",
                  "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-md",
                )}
              >
                {audioError || noClipFinal ? (
                  <XCircle className="w-9 h-9" />
                ) : !audioReady ? (
                  <div className="w-7 h-7 border-[3px] border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                ) : (
                  <Play className="w-10 h-10 fill-current ml-1" />
                )}
              </button>
            </div>

            {/* Status text */}
            <p className="text-sm text-muted-foreground text-center">
              {playing
                ? "🎵 Svira..."
                : audioError
                ? "Greška pri učitavanju audio klipa"
                : noClipFinal
                ? "Nema audio klipa za danas"
                : !audioReady
                ? "Učitavanje..."
                : playsLeft <= 0
                ? "Iskoristio si sva slušanja"
                : `Preostalo ${playsLeft} od 3 slušanja`}
            </p>

            {/* Play dots */}
            <div className="flex gap-2.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className={cn(
                    "w-3 h-3 rounded-full transition-all duration-300",
                    i < playsLeft ? "bg-primary scale-100" : "bg-muted-foreground/20 scale-90"
                  )}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-dashed" />

          {/* Answer section */}
          <div className="space-y-3 pb-1">
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
              className="text-base text-center h-12 rounded-xl border-primary/20 focus-visible:ring-primary/30"
            />
            <Button
              onClick={() => guessMutation.mutate(answer.trim())}
              disabled={!answer.trim() || guessMutation.isPending || submitted}
              className="w-full h-12 text-base font-bold rounded-xl"
              size="lg"
            >
              {guessMutation.isPending ? "Proveravam..." : "Potvrdi odgovor →"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              ⚠️ Jedan pokušaj — razmisli pre nego što odgovoriš
            </p>
          </div>
        </div>
      );
    }

    // ── CASE 2: no challenge today ───────────────────────────────────────────
    if (data.reason === "no_challenge") {
      return (
        <div className="text-center py-12 space-y-3 text-muted-foreground">
          <Music className="w-14 h-14 mx-auto opacity-20" />
          <p className="font-semibold">Nema izazova za danas</p>
          <p className="text-sm">Vrati se sutra!</p>
        </div>
      );
    }

    // ── CASE 3: countdown expired, waiting for server ────────────────────────
    if (isOpen) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      );
    }

    // ── CASE 4: countdown ────────────────────────────────────────────────────
    return (
      <div className="text-center py-10 space-y-5">
        <div className="w-20 h-20 rounded-full bg-primary/10 ring-4 ring-primary/10 flex items-center justify-center mx-auto">
          <Clock className="w-10 h-10 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-2">Igra se otvara u</p>
          <p className="text-5xl font-black tabular-nums tracking-tight">
            {String(openHour).padStart(2, "0")}
            <span className="animate-pulse">:</span>
            {String(openMinute).padStart(2, "0")}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-muted/60 rounded-full px-4 py-2 text-sm text-muted-foreground">
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
    <div className="min-h-screen py-12">
      <SEO
        title="Pogodi Pesmu — Studio LeFlow"
        description="Dnevna igra: pogodi pesmu iz 1 sekunde!"
        noIndex={false}
      />

      <style>{`
        @keyframes soundBar {
          0%   { height: 6px; }
          100% { height: 32px; }
        }
      `}</style>

      <div className="max-w-lg mx-auto px-4 space-y-5">

        {/* Hero */}
        <div className="text-center space-y-2 pb-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-3">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-black tracking-tight">Pogodi Pesmu</h1>
          <p className="text-muted-foreground">Čuješ 1 sekundu — možeš li da pogodis?</p>
        </div>

        {/* Instructions */}
        <Card className="border-primary/20 overflow-hidden">
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
          {instructionsOpen && (
            <CardContent className="pt-0 pb-5 px-5 border-t">
              <ol className="space-y-0">
                {[
                  { text: <>Svaki dan nova pesma. Igra se otvara u određeno vreme.</> },
                  { text: <>Pritisni <strong className="text-foreground">▶ Pusti</strong> — čuješ <strong className="text-foreground">1 sekundu</strong>. Imaš <strong className="text-foreground">3 slušanja</strong>.</> },
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
            </CardContent>
          )}
        </Card>

        {/* Main game card */}
        <Card className="overflow-hidden border-primary/20 shadow-2xl shadow-primary/5">
          <CardHeader className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent pb-4">
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Dnevni izazov
              {data?.available && !alreadyPlayed && (
                <Badge className="ml-auto bg-green-500 hover:bg-green-500 text-white text-xs">
                  ● Live
                </Badge>
              )}
              {alreadyPlayed && (
                <Badge variant="outline" className="ml-auto text-xs">
                  Odigrano
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {renderBody()}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        {leaderboardData && (
          <Card className="overflow-hidden border-primary/20">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Nedeljni leaderboard
                {leaderboardData.prize && (
                  <Badge variant="outline" className="ml-auto text-xs">
                    🎁 {leaderboardData.prize.prizeDescription}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {!leaderboardData.leaderboard?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Još niko nije pogodio ove sedmice</p>
                  <p className="text-xs mt-1">Budi prvi! 🎯</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {leaderboardData.leaderboard.slice(0, 10).map((entry: any, i: number) => {
                    const isMe = entry.userId === user.id;
                    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                    return (
                      <li
                        key={entry.userId}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors",
                          isMe
                            ? "bg-primary/10 ring-1 ring-primary/30"
                            : i < 3
                            ? "bg-muted/40"
                            : "hover:bg-muted/30"
                        )}
                      >
                        <span className={cn(
                          "w-7 text-center font-black text-sm flex-shrink-0",
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
                          {isMe && <span className="text-xs text-primary ml-1">(ti)</span>}
                        </span>
                        <div className="text-right flex-shrink-0">
                          <span className={cn(
                            "text-sm font-bold",
                            i === 0 ? "text-yellow-500" : i < 3 ? "text-primary" : "text-muted-foreground"
                          )}>
                            {entry.points} pt
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
}
