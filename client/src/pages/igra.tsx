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

function useCountdown(targetHour: number, targetMinute = 0) {
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const belgHour = (now.getUTCHours() + 2) % 24;
      const belgMin = now.getUTCMinutes();
      const nowTotalMins = belgHour * 60 + belgMin;
      const openTotalMins = targetHour * 60 + targetMinute;
      if (nowTotalMins >= openTotalMins) {
        setIsOpen(true);
        setMinutesLeft(0);
      } else {
        setIsOpen(false);
        setMinutesLeft(openTotalMins - nowTotalMins);
      }
    };
    update();
    const id = setInterval(update, 15000);
    return () => clearInterval(id);
  }, [targetHour, targetMinute]);

  return { isOpen, minutesLeft };
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
  const [playsLeft, setPlaysLeft] = useState(4);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; points: number } | null>(null);

  const { data, isLoading, refetch } = useQuery<any>({
    queryKey: ["/api/game/today"],
    enabled: !!user,
    refetchOnWindowFocus: true,
    staleTime: 30000,
  });

  const openHour = data?.openHour ?? data?.challenge?.openHour ?? 17;
  const openMinute = data?.openMinute ?? data?.challenge?.openMinute ?? 0;
  const { isOpen, minutesLeft } = useCountdown(openHour, openMinute);

  // When countdown hits zero (or data loads while already open), refetch to get challenge data
  useEffect(() => {
    if (isOpen && data && !data.available) {
      refetch();
    }
  }, [isOpen, data?.available]);

  const { data: leaderboardData } = useQuery<any>({
    queryKey: ["/api/game/leaderboard"],
    enabled: !!user,
  });

  // Load audio clip via AudioContext
  useEffect(() => {
    const clipUrl = data?.challenge?.clipUrl;
    if (!clipUrl) return;

    setAudioReady(false);
    setAudioError(false);

    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    fetch(clipUrl)
      .then(r => {
        if (!r.ok) throw new Error("fetch failed");
        return r.arrayBuffer();
      })
      .then(buf => ctx.decodeAudioData(buf))
      .then(decoded => {
        audioBufferRef.current = decoded;
        setAudioReady(true);
      })
      .catch(() => {
        setAudioError(true);
      });

    return () => {
      audioBufferRef.current = null;
      setAudioReady(false);
      ctx.close().catch(() => {});
    };
  }, [data?.challenge?.clipUrl]);

  const playClip = useCallback(() => {
    const ctx = audioCtxRef.current;
    const buffer = audioBufferRef.current;
    const clipStart = data?.challenge?.clipStartSeconds ?? 0;
    if (!ctx || !buffer || playsLeft <= 0 || playing) return;

    if (ctx.state === "suspended") ctx.resume();

    setPlaying(true);
    setPlaysLeft(p => p - 1);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0, clipStart, 2);

    setTimeout(() => setPlaying(false), 2000);
  }, [data?.challenge?.clipStartSeconds, playsLeft, playing]);

  const guessMutation = useMutation({
    mutationFn: async (ans: string) => {
      const res = await apiRequest("POST", "/api/game/guess", { answer: ans });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/game/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/game/leaderboard"] });
    },
    onError: (err: any) => {
      toast({ title: "Greška", description: err?.message || "Nije moguće poslati odgovor", variant: "destructive" });
    },
  });

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

  const alreadyPlayed = data?.alreadyPlayed || submitted;
  const prevGuess = data?.guess;
  const finalResult = result || (prevGuess ? { correct: prevGuess.correct, points: prevGuess.correct ? 10 : 0 } : null);
  const displayedAnswer = result ? answer : prevGuess?.answer ?? "";

  const noClip = data?.available && !data?.challenge?.clipUrl;

  let playBtnLabel = `▶ Pusti isečak (2s)`;
  if (playing) playBtnLabel = "Svira...";
  else if (audioError) playBtnLabel = "Greška pri učitavanju";
  else if (noClip) playBtnLabel = "Nema audio klipa";
  else if (!audioReady) playBtnLabel = "Učitavanje...";
  else if (playsLeft <= 0) playBtnLabel = "Nema više puštanja";

  return (
    <div className="min-h-screen py-12">
      <SEO title="Pogodi Pesmu — Studio LeFlow" description="Dnevna igra: pogodi pesmu iz 2 sekunde!" noIndex={false} />

      <div className="max-w-2xl mx-auto px-4 space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Music className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Pogodi Pesmu</h1>
          </div>
          <p className="text-muted-foreground">Čuješ 2 sekunde — možeš li da pogodis?</p>
        </div>

        {/* Game Card */}
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent">
            <CardTitle className="flex items-center gap-2">
              <Music className="w-5 h-5 text-primary" />
              Dnevni izazov
              {isOpen && !alreadyPlayed && <Badge className="ml-auto">Otvoreno</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : !data?.available && data?.reason === 'no_challenge' ? (
              <div className="text-center py-8 text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>Nema izazova za danas. Vrati se sutra!</p>
              </div>
            ) : isOpen && data && !data.available ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : !isOpen ? (
              <div className="text-center py-8 space-y-3">
                <Clock className="w-12 h-12 mx-auto text-primary opacity-70" />
                <p className="text-lg font-semibold">Igra se otvara u {String(openHour).padStart(2,'0')}:{String(openMinute).padStart(2,'0')}</p>
                <p className="text-muted-foreground">
                  Još {minutesLeft > 60
                    ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}min`
                    : `${minutesLeft} min`}
                </p>
              </div>
            ) : alreadyPlayed ? (
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
                    {data?.correctAnswer && (
                      <p className="text-sm">
                        Tačan odgovor: <strong className="text-foreground">{data.correctAnswer}</strong>
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">Više sreće sutra!</p>
                  </>
                )}
                {displayedAnswer && (
                  <p className="text-sm text-muted-foreground">
                    Tvoj odgovor: <strong className="text-foreground">{displayedAnswer}</strong>
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Vrati se sutra za novi izazov!</p>
              </div>
            ) : (
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
                    {playsLeft > 0 ? `Preostalo puštanja: ${playsLeft}/4` : "Iskoristio si sva puštanja"}
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Upiši samo naziv pesme (bez izvođača)</p>
                  <Input
                    placeholder="npr. Mufasa"
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && answer.trim()) guessMutation.mutate(answer); }}
                    disabled={guessMutation.isPending}
                    className="text-base"
                  />
                  <Button
                    onClick={() => guessMutation.mutate(answer)}
                    disabled={!answer.trim() || guessMutation.isPending}
                    className="w-full"
                  >
                    {guessMutation.isPending ? "Proveravam..." : "Potvrdi odgovor"}
                  </Button>
                </div>
                <p className="text-xs text-center text-muted-foreground">Jedan pokušaj — razmisli pre nego što odgovoriš</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
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
                <p className="text-center text-muted-foreground py-4 text-sm">Još niko nije pogodio ove sedmice</p>
              ) : (
                <ul className="space-y-2">
                  {leaderboardData.leaderboard.slice(0, 10).map((entry: any, i: number) => (
                    <li key={entry.userId} className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg",
                      entry.userId === user.id && "bg-primary/10 ring-1 ring-primary/30"
                    )}>
                      <span className={cn(
                        "w-6 text-center font-bold text-sm",
                        i === 0 && "text-yellow-500",
                        i === 1 && "text-slate-400",
                        i === 2 && "text-amber-600",
                      )}>
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
                      <span className="text-sm font-semibold text-primary">{entry.points} pt</span>
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
