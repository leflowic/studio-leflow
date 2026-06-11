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
import { Music, Play, Trophy, Clock, CheckCircle2, XCircle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

function useCountdown(targetHour: number) {
  const [minutesLeft, setMinutesLeft] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      // Belgrade time ≈ UTC+2
      const belgradHour = (now.getUTCHours() + 2) % 24;
      const belgradMin = now.getUTCMinutes();
      if (belgradHour >= targetHour) {
        setIsOpen(true);
        setMinutesLeft(0);
      } else {
        setIsOpen(false);
        setMinutesLeft((targetHour - belgradHour - 1) * 60 + (60 - belgradMin));
      }
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [targetHour]);

  return { isOpen, minutesLeft };
}

export default function IgraPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isOpen, minutesLeft } = useCountdown(17);

  const playerRef = useRef<any>(null);
  const playerDivRef = useRef<HTMLDivElement>(null);
  const [ytReady, setYtReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ correct: boolean; points: number } | null>(null);

  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/game/today"],
    enabled: !!user,
    refetchOnWindowFocus: false,
  });

  const { data: leaderboardData } = useQuery<any>({
    queryKey: ["/api/game/leaderboard"],
    enabled: !!user,
  });

  // Load YouTube IFrame API once
  useEffect(() => {
    if (window.YT?.Player) { setYtReady(true); return; }
    window.onYouTubeIframeAPIReady = () => setYtReady(true);
    if (!document.getElementById('yt-api-script')) {
      const s = document.createElement('script');
      s.id = 'yt-api-script';
      s.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(s);
    }
  }, []);

  // Create hidden player when challenge + YT API are ready
  useEffect(() => {
    const challenge = data?.challenge;
    if (!ytReady || !challenge?.youtubeVideoId || !playerDivRef.current || playerRef.current) return;

    playerRef.current = new window.YT.Player(playerDivRef.current, {
      height: '1',
      width: '1',
      videoId: challenge.youtubeVideoId,
      playerVars: { autoplay: 0, controls: 0, disablekb: 1, modestbranding: 1 },
      events: {
        onReady: () => {},
        onStateChange: () => {},
      },
    });
  }, [ytReady, data?.challenge?.youtubeVideoId]);

  const playClip = useCallback(() => {
    const challenge = data?.challenge;
    if (!playerRef.current || !challenge) return;
    setPlaying(true);
    playerRef.current.seekTo(challenge.clipStartSeconds, true);
    playerRef.current.playVideo();
    setTimeout(() => {
      playerRef.current?.pauseVideo();
      setPlaying(false);
    }, 2000);
  }, [data?.challenge]);

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
  const finalResult = result || (prevGuess ? { correct: prevGuess.correct, points: 0 } : null);

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
            ) : !isOpen ? (
              <div className="text-center py-8 space-y-3">
                <Clock className="w-12 h-12 mx-auto text-primary opacity-70" />
                <p className="text-lg font-semibold">Igra se otvara u 17:00</p>
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
                    <p className="text-sm text-muted-foreground">Više sreće sutra!</p>
                  </>
                )}
                <p className="text-sm text-muted-foreground">Vrati se sutra za novi izazov!</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* Hidden YT player div */}
                <div ref={playerDivRef} className="hidden" />

                <Button
                  onClick={playClip}
                  disabled={playing || !ytReady}
                  size="lg"
                  className="w-full gap-2 text-base"
                >
                  <Play className={cn("w-5 h-5", playing && "animate-pulse")} />
                  {playing ? "Svira..." : ytReady ? "▶ Pusti isečak (2s)" : "Učitavanje..."}
                </Button>

                <div className="space-y-2">
                  <Input
                    placeholder="Upiši naziv pesme (izvođač – naziv)..."
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
