import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { Music, Heart, User, TrendingUp, Youtube } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CommunityChat } from "@/components/community/CommunityChat";

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

export default function Zajednica() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch all approved songs
  const { data: songs = [], isLoading: songsLoading } = useQuery<PublicSong[]>({
    queryKey: ["/api/user-songs/public"],
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (songId: number) => {
      return apiRequest("POST", `/api/user-songs/${songId}/vote`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-songs/public"] });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Morate biti prijavljeni da glasate",
        variant: "destructive",
      });
    },
  });

  const handleVote = (songId: number) => {
    if (!user) {
      toast({
        title: "Prijavite se",
        description: "Morate biti prijavljeni da glasate za pesme",
        variant: "destructive",
      });
      return;
    }
    voteMutation.mutate(songId);
  };

  // Extract YouTube video ID from URL
  const getYoutubeVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7] && match[7].length === 11 ? match[7] : null;
  };

  return (
    <>
      <SEO
        title="Zajednica - Top Pesme Korisnika"
        description="Muzička zajednica Studio LeFlow - pogledajte i glasajte za najbolje pesme koje korisnici dele. Podržite talente i pokažite svoju omiljenu muziku!"
        keywords={["zajednica", "top pesme", "muzika", "glasanje", "korisnici", "studio leflow", "community"]}
      />

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <FadeInWhenVisible>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-2">
                  <TrendingUp className="h-8 w-8" />
                  Muzička Zajednica
                </h1>
                <p className="text-muted-foreground">
                  Podeli svoju pesmu i glasaj za omiljene pesme iz zajednice
                </p>
              </div>
              <Link href="/moje-pesme">
                <Button variant="outline" data-testid="button-my-songs">
                  <Music className="mr-2 h-4 w-4" />
                  Moje Pesme
                </Button>
              </Link>
            </div>
          </motion.div>
        </FadeInWhenVisible>

        <Separator className="mb-8" />

        {/* Songs List */}
        <div className="space-y-6">
          {songsLoading ? (
            <>
              <Skeleton className="h-96 w-full" />
              <Skeleton className="h-96 w-full" />
            </>
          ) : songs.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Još nema odobrenih pesama</p>
                  <p className="text-sm">Budite prvi koji će podeliti pesmu!</p>
                  <Link href="/moje-pesme">
                    <Button className="mt-4" data-testid="button-submit-first-song">
                      <Youtube className="mr-2 h-4 w-4" />
                      Dodaj Pesmu
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            songs.map((song, index) => {
              const videoId = getYoutubeVideoId(song.youtubeUrl);
              const isTopSong = index === 0;
              
              return (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Card className={cn("hover-elevate active-elevate-2", isTopSong && "border-primary")}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="flex items-center gap-2 flex-wrap">
                            {song.songTitle}
                            {isTopSong && (
                              <Badge variant="default" className="gap-1" data-testid="badge-top-song">
                                <TrendingUp className="h-3 w-3" />
                                #1 Najpopularnija
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {song.artistName} • Poslao <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {song.username}
                            </span> • {format(new Date(song.submittedAt), "dd.MM.yyyy")}
                          </CardDescription>
                        </div>
                        <Button
                          variant={song.hasVoted ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleVote(song.id)}
                          disabled={voteMutation.isPending || !user}
                          className="gap-2"
                          data-testid={`button-vote-${song.id}`}
                        >
                          <Heart className={cn("h-4 w-4", song.hasVoted && "fill-current")} />
                          <span className="font-semibold">{song.votesCount}</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {videoId ? (
                        <div className="aspect-video rounded-md overflow-hidden bg-muted">
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${videoId}`}
                            title={song.songTitle}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            data-testid={`iframe-youtube-${song.id}`}
                          ></iframe>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted rounded-md">
                          <p className="text-sm text-muted-foreground">Nevažeći YouTube URL</p>
                        </div>
                      )}
                    </CardContent>
                    {!user && (
                      <CardFooter>
                        <p className="text-sm text-muted-foreground">
                          <Link href="/auth" className="underline">Prijavite se</Link> da glasate za ovu pesmu
                        </p>
                      </CardFooter>
                    )}
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        <Separator className="my-12" />

        {/* Community Chat */}
        <FadeInWhenVisible>
          <CommunityChat />
        </FadeInWhenVisible>
      </div>
    </>
  );
}
