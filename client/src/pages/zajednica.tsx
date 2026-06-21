import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { Music, Heart, User, TrendingUp, Youtube, Trophy, Flame, Plus, LayoutList, Gamepad2, Users } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CommunityChat } from "@/components/community/CommunityChat";
import { CommunityFeed } from "@/components/community/CommunityFeed";

type PublicSong = {
  id: number;
  userId: number;
  username: string;
  songTitle: string;
  artistName: string;
  youtubeUrl: string;
  submittedAt: string;
  approved: boolean;
  votesCount: number;
  hasVoted: boolean;
};

function getYoutubeVideoId(url: string): string | null {
  const match = url.match(/^.*((youtu\.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/);
  return match && match[7]?.length === 11 ? match[7] : null;
}

function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
}

function RankMedal({ index }: { index: number }) {
  if (index === 0) return <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-md"><Trophy className="w-3.5 h-3.5" /></div>;
  if (index === 1) return <div className="w-7 h-7 rounded-full bg-slate-400 flex items-center justify-center text-white text-xs font-bold shadow-sm"><span>#2</span></div>;
  if (index === 2) return <div className="w-7 h-7 rounded-full bg-amber-700 flex items-center justify-center text-white text-xs font-bold shadow-sm"><span>#3</span></div>;
  return <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold">#{index + 1}</div>;
}

type LeaderboardEntry = { userId: number; username: string; avatarUrl: string | null; totalPoints: number; correctAnswers: number };
type CollabUser = { id: number; username: string; avatarUrl: string | null; isVerifiedArtist: boolean };

function GameLeaderboardWidget() {
  const { data } = useQuery<{ leaderboard: LeaderboardEntry[] }>({ queryKey: ["/api/game/leaderboard"] });
  const entries = data?.leaderboard ?? [];
  if (entries.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gamepad2 className="w-4 h-4 text-primary" />
        <h2 className="font-semibold text-sm">Top igrači sedmice</h2>
      </div>
      <div className="space-y-2">
        {entries.slice(0, 5).map((entry, i) => (
          <Link key={entry.userId} href={`/u/${entry.username}`} className="flex items-center gap-2.5 hover:bg-muted/50 rounded-xl px-2 py-1.5 transition-colors">
            <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
              i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-slate-400 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"
            )}>{i + 1}</span>
            <span className="flex-1 text-sm font-medium truncate">{entry.username}</span>
            <span className="text-xs text-muted-foreground font-semibold">{entry.totalPoints}pt</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function CollabUsersWidget() {
  const { data = [] } = useQuery<CollabUser[]>({ queryKey: ["/api/collab-users"] });
  if (data.length === 0) return null;
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-violet-500" />
        <h2 className="font-semibold text-sm">Traže saradnju</h2>
      </div>
      <div className="flex flex-wrap gap-2">
        {data.slice(0, 8).map(u => (
          <Link key={u.id} href={`/u/${u.username}`} className="flex items-center gap-1.5 bg-muted/60 hover:bg-muted rounded-xl px-2.5 py-1.5 transition-colors">
            <span className="text-xs font-medium">{u.username}</span>
            {u.isVerifiedArtist && <span className="text-primary text-[10px]">✓</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}

type TabKey = "feed" | "ranglista";

export default function Zajednica() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("feed");

  const { data: songs = [], isLoading: songsLoading } = useQuery<PublicSong[]>({
    queryKey: ["/api/user-songs/public"],
  });

  const voteMutation = useMutation({
    mutationFn: (songId: number) => apiRequest("POST", `/api/user-songs/${songId}/vote`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/user-songs/public"] }),
    onError: () => toast({ title: "Greška", description: "Morate biti prijavljeni da glasate", variant: "destructive" }),
  });

  const handleVote = (songId: number) => {
    if (!user) {
      toast({ title: "Prijavite se", description: "Morate biti prijavljeni da glasate", variant: "destructive" });
      return;
    }
    voteMutation.mutate(songId);
  };

  return (
    <>
      <SEO
        title="Zajednica - Studio LeFlow"
        description="Muzička zajednica Studio LeFlow - delite demoe, statusove, tražite kolaboratore i glasajte za pesme."
        keywords={["zajednica", "feed", "demo", "muzika", "glasanje", "korisnici", "studio leflow"]}
      />

      <div className="min-h-screen bg-background">

        {/* Hero */}
        <FadeInWhenVisible>
          <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/10 via-background to-muted/20">
            <div className="absolute inset-0 bg-grid-white/5 [mask-image:radial-gradient(ellipse_at_top,white,transparent_70%)]" />
            <div className="relative container mx-auto px-4 max-w-6xl py-10 md:py-14">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-5 h-5 text-primary" />
                    <span className="text-xs font-semibold text-primary uppercase tracking-widest">Muzička Zajednica</span>
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Zajednica</h1>
                  <p className="text-muted-foreground text-sm md:text-base max-w-md">
                    Delite demoe, statusove, tražite kolaboratore i glasajte za omiljene pesme
                  </p>
                </div>
                <Link href="/moje-pesme">
                  <Button className="gap-2 rounded-xl" data-testid="button-my-songs">
                    <Plus className="w-4 h-4" /> Dodaj pesmu
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </FadeInWhenVisible>

        <div className="container mx-auto px-4 max-w-6xl py-8">
          <div className="grid lg:grid-cols-5 gap-8">

            {/* Main column — 3/5 width */}
            <div className="lg:col-span-3 space-y-4">

              {/* Tab switcher */}
              <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit">
                <button
                  onClick={() => setActiveTab("feed")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    activeTab === "feed" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <LayoutList className="w-4 h-4" />
                  Feed
                </button>
                <button
                  onClick={() => setActiveTab("ranglista")}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all",
                    activeTab === "ranglista" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <TrendingUp className="w-4 h-4" />
                  Rang lista
                </button>
              </div>

              {/* Feed tab */}
              {activeTab === "feed" && (
                <motion.div
                  key="feed"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <CommunityFeed />
                </motion.div>
              )}

              {/* Rang lista tab */}
              {activeTab === "ranglista" && (
                <motion.div
                  key="ranglista"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <h2 className="font-semibold">Rang lista</h2>
                    {!songsLoading && songs.length > 0 && (
                      <span className="text-xs text-muted-foreground ml-auto">{songs.length} pesam{songs.length === 1 ? "a" : songs.length < 5 ? "e" : "a"}</span>
                    )}
                  </div>

                  {songsLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
                    </div>
                  ) : songs.length === 0 ? (
                    <div className="rounded-2xl border border-border/60 bg-card p-10 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                        <Music className="w-7 h-7 text-muted-foreground/50" />
                      </div>
                      <p className="font-medium mb-1">Još nema pesama</p>
                      <p className="text-sm text-muted-foreground mb-4">Budite prvi koji će podeliti pesmu!</p>
                      <Link href="/moje-pesme">
                        <Button size="sm" className="gap-2" data-testid="button-submit-first-song">
                          <Youtube className="w-4 h-4" /> Dodaj Pesmu
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    songs.map((song, index) => {
                      const videoId = getYoutubeVideoId(song.youtubeUrl);
                      const isTop = index === 0;

                      return (
                        <motion.div
                          key={song.id}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25, delay: index * 0.04 }}
                        >
                          {isTop ? (
                            <div className="rounded-2xl border-2 border-primary/30 bg-card overflow-hidden shadow-md">
                              {videoId && (
                                <div className="aspect-video bg-black">
                                  <iframe
                                    width="100%" height="100%"
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title={song.songTitle}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    data-testid={`iframe-youtube-${song.id}`}
                                  />
                                </div>
                              )}
                              <div className="p-4 flex items-center gap-3">
                                <RankMedal index={0} />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold truncate">{song.songTitle}</p>
                                  <p className="text-xs text-muted-foreground">{song.artistName} · <span className="inline-flex items-center gap-1"><User className="w-3 h-3" />{song.username}</span></p>
                                </div>
                                <button
                                  onClick={() => handleVote(song.id)}
                                  disabled={voteMutation.isPending || !user}
                                  className={cn(
                                    "flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all",
                                    song.hasVoted ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-primary/10 text-foreground"
                                  )}
                                  data-testid={`button-vote-${song.id}`}
                                >
                                  <Heart className={cn("w-4 h-4", song.hasVoted && "fill-current")} />
                                  {song.votesCount}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-border/60 bg-card hover:border-border hover:shadow-sm transition-all flex items-center gap-3 p-3 pr-4">
                              <RankMedal index={index} />
                              {videoId ? (
                                <div className="w-16 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                                  <img src={getYoutubeThumbnail(videoId)} alt={song.songTitle} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-16 h-12 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                                  <Music className="w-5 h-5 text-muted-foreground/40" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-sm truncate">{song.songTitle}</p>
                                <p className="text-xs text-muted-foreground truncate">{song.artistName} · {song.username}</p>
                              </div>
                              <button
                                onClick={() => handleVote(song.id)}
                                disabled={voteMutation.isPending || !user}
                                className={cn(
                                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-semibold transition-all flex-shrink-0",
                                  song.hasVoted ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
                                )}
                                data-testid={`button-vote-${song.id}`}
                              >
                                <Heart className={cn("w-3.5 h-3.5", song.hasVoted && "fill-current text-primary")} />
                                {song.votesCount}
                              </button>
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </motion.div>
              )}
            </div>

            {/* Sidebar — 2/5 width, sticky */}
            <div className="lg:col-span-2">
              <div className="sticky top-20 space-y-5">

                {/* Live Chat */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <h2 className="font-semibold text-sm">Live Chat</h2>
                  </div>
                  <FadeInWhenVisible>
                    <CommunityChat />
                  </FadeInWhenVisible>
                </div>

                {/* Game leaderboard widget */}
                <FadeInWhenVisible>
                  <GameLeaderboardWidget />
                </FadeInWhenVisible>

                {/* Collab users widget */}
                <FadeInWhenVisible>
                  <CollabUsersWidget />
                </FadeInWhenVisible>

              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
