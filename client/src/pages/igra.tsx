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
import { Music, Play, Trophy, Clock, CheckCircle2, XCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

function getBelgradeMinutes(): number {
  const b = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Belgrade' }));
  return b.getHours() * 60 + b.getMinutes();
}

// Computes initial state synchronously so there is no flash on first render
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

export default function IgraPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [playsLeft, setPlaysLeft] = useState(3);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; points: number } | null>(null);

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
  // openHour/openMinute come from different places depending on data state
  const openHour: number = data?.openHour ?? challenge?.openHour ?? 17;
  const openMinute: number = data?.openMinute ?? challenge?.openMinute ?? 0;
  const { isOpen, minutesLeft } = useCountdown(openHour, openMinute);

  // When the client countdown expires but server hasn't confirmed yet, refetch
  useEffect(() => {
    if (isOpen && data && !data.available) refetch();
  }, [isOpen, data?.available]);

  // Reset plays when a new challenge date appears
  useEffect(() => {
    if (challenge?.challengeDate) setPlaysLeft(4);
  }, [challenge?.challengeDate]);

  // Load audio into AudioContext buffer — fetch via same-origin proxy to avoid Cloudinary CORS
  useEffect(() => {
    const clipUrl = challenge?.clipUrl;
    if (!clipUrl) return;

    setAudioReady(false);
    setAudioError(false);

    let cancelled = false;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    const token = localStorage.getItem('auth_token');
    fetch('/api/game/clip', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => { if (!r.ok) throw new Error("fetch"); return r.arrayBuffer(); })
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        if (!cancelled) {
          audioBufferRef.current = decoded;
          setAudioReady(true);
        }
      })
      .catch(() => { if (!cancelled) setAudioError(true); });

    return () => {
      cancelled = true;
      audioBufferRef.current = null;
      setAudioReady(false);
      ctx.close().catch(() => {});
    };
  }, [challenge?.clipUrl]);

  const playClip = useCallback(() => {
    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    const clipStart = challenge?.clipStartSeconds ?? 0;
    if (!ctx || !buffer || playsLeft <= 0 || playing) return;
    if (ctx.state === "suspended") ctx.resume();

    setPlaying(true);
    setPlaysLeft(p => p - 1);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0, clipStart, 1);

    setTimeout(() => setPlaying(false), 1100);
  }, [challenge?.clipStartSeconds, playsLeft, playing]);

  const guessMutation = useMutation({
    mutationFn: async (ans: string) => {
      const res = await apiRequest("POST", "/api/game/guess", { answer: ans });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Greška");
      }
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
          <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">Morate biti prijavljeni da igrate</p>
          <Button asChild><a href="/prijava">Prijavi se</a></Button>
        </div>
      </div>
    );
  }

  if (!user.emailVerified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Lock className="w-12 h-12 mx-auto text-muted-foreground" />
          <p className="text-lg font-medium">Morate potvrditi email adresu da biste igrali</p>
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
  const noClip = data?.available && !challenge?.clipUrl;

  let playBtnLabel = "▶ Pusti isečak (2s)";
  if (playing) playBtnLabel = "Svira...";
  else if (audioError) playBtnLabel = "Greška pri učitavanju";
  else if (noClip) playBtnLabel = "Nema audio klipa";
  else if (!audioReady) playBtnLabel = "Učitavanje...";
  else if (playsLeft <= 0) playBtnLabel = "Nema više puštanja";

  // ── Game body renderer ───────────────────────────────────────────────────────
  // IMPORTANT: data.available is the server's authoritative word that the game
  // is open. We check it FIRST — before any client-side isOpen countdown state —
  // so a clock difference or initial-render timing never blocks the game.

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    if (!data) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <p>Greška pri učitavanju. Osveži stranicu.</p>
        </div>
      );
    }

    // ── CASE 1: server confirmed game is open ────────────────────────────────
    if (data.available) {
      if (alreadyPlayed) {
        return (
          <div className="text-center py-6 space-y-4">
            {finalResult?.correct ? (
              <>
                <CheckCircle2 className="w-14 h-14 mx-auto text-green-500" />
                <p className="text-xl font-bold text-green-500">Tačno! 🎉</p>
                <p className="text-lg font-semibold text-green-600">+10 poena</p>
              </>
            ) : (
              <>
                <XCircle className="w-14 h-14 mx-auto text-destructive" />
                <p className="text-xl font-bold text-destructive">Netačno</p>
                {data.correctAnswer && (
                  <p className="text-sm">
                    Tačan odgovor:{" "}
                    <strong className="text-foreground">{data.correctAnswer}</strong>
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Više sreće sutra!</p>
              </>
            )}
            {displayedAnswer && (
              <p className="text-sm text-muted-foreground">
                Tvoj odgovor:{" "}
                <strong className="text-foreground">{displayedAnswer}</strong>
              </p>
            )}
            <p className="text-sm text-muted-foreground">Vrati se sutra za novi izazov!</p>
          </div>
        );
      }

      return (
        <div className="space-y-5">
          <div className="space-y-2">
            <Button
              onClick={playClip}
              disabled={playing || !audioReady || playsLeft <= 0 || audioError || noClip}
              size="lg"
              className="w-full gap-2 text-base"
            >
              <Play className={cn("w-5 h-5", playing && "animate-pulse")} />
              {playBtnLabel}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              {playsLeft > 0
                ? `Preostalo puštanja: ${playsLeft}/3`
                : "Iskoristio si sva puštanja"}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">
              Upiši samo naziv pesme (bez izvođača)
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
              className="text-base"
            />
            <Button
              onClick={() => guessMutation.mutate(answer.trim())}
              disabled={!answer.trim() || guessMutation.isPending || submitted}
              className="w-full"
            >
              {guessMutation.isPending ? "Proveravam..." : "Potvrdi odgovor"}
            </Button>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Jedan pokušaj — razmisli pre nego što odgovoriš
          </p>
        </div>
      );
    }

    // ── CASE 2: no challenge scheduled for today ─────────────────────────────
    if (data.reason === "no_challenge") {
      return (
        <div className="text-center py-8 text-muted-foreground">
          <Music className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nema izazova za danas. Vrati se sutra!</p>
        </div>
      );
    }

    // ── CASE 3: countdown expired on client, waiting for server to confirm ───
    if (isOpen) {
      return (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      );
    }

    // ── CASE 4: game not open yet, show countdown ────────────────────────────
    return (
      <div className="text-center py-8 space-y-3">
        <Clock className="w-12 h-12 mx-auto text-primary opacity-70" />
        <p className="text-lg font-semibold">
          Igra se otvara u{" "}
          {String(openHour).padStart(2, "0")}:{String(openMinute).padStart(2, "0")}
        </p>
        <p className="text-muted-foreground">
          Još{" "}
          {minutesLeft > 60
            ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}min`
            : `${minutesLeft} min`}
        </p>
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen py-12">
      <SEO
        title="Pogodi Pesmu — Studio LeFlow"
        description="Dnevna igra: pogodi pesmu iz 2 sekunde!"
        noIndex={false}
      />

      <div className="max-w-2xl mx-auto px-4 space-y-8">
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Music className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Pogodi Pesmu</h1>
          </div>
          <p className="text-muted-foreground">Čuješ 2 sekunde — možeš li da pogodis?</p>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Dnevni izazov
              {data?.available && !alreadyPlayed && (
                <Badge className="ml-auto">Otvoreno</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {renderBody()}
          </CardContent>
        </Card>

        {leaderboardData && (
          <Card>
            <CardHeader>
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
            <CardContent>
              {leaderboardData.leaderboard?.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  Još niko nije pogodio ove sedmice
                </p>
              ) : (
                <ul className="space-y-2">
                  {leaderboardData.leaderboard.slice(0, 10).map((entry: any, i: number) => (
                    <li
                      key={entry.userId}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg",
                        entry.userId === user.id && "bg-primary/10 ring-1 ring-primary/30"
                      )}
                    >
                      <span
                        className={cn(
                          "w-6 text-center font-bold text-sm",
                          i === 0 && "text-yellow-500",
                          i === 1 && "text-slate-400",
                          i === 2 && "text-amber-600"
                        )}
                      >
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`}
                      </span>
                      <AvatarWithInitials
                        src={entry.avatarUrl}
                        alt={entry.username}
                        name={entry.username}
                        userId={entry.userId}
                        className="w-7 h-7"
                      />
                      <span className="flex-1 font-medium text-sm">{entry.username}</span>
                      <span className="text-sm font-semibold text-primary">
                        {entry.points} pt
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
