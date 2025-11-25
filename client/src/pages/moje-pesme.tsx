import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { Music, Trash2, CheckCircle2, Clock, AlertCircle, Youtube } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const songFormSchema = z.object({
  songTitle: z.string().min(3, "Naslov pesme mora imati najmanje 3 karaktera").max(100, "Naslov pesme može imati najviše 100 karaktera"),
  artistName: z.string().min(2, "Ime izvođača mora imati najmanje 2 karaktera").max(100, "Ime izvođača može imati najviše 100 karaktera"),
  youtubeUrl: z.string().url("Unesite validan YouTube URL").regex(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//, "URL mora biti sa YouTube-a"),
});

type SongFormData = z.infer<typeof songFormSchema>;

type UserSong = {
  id: number;
  userId: number;
  songTitle: string;
  artistName: string;
  youtubeUrl: string;
  submittedAt: string;
  approved: boolean;
};

export default function MojePesme() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [songToDelete, setSongToDelete] = useState<number | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const form = useForm<SongFormData>({
    resolver: zodResolver(songFormSchema),
    defaultValues: {
      songTitle: "",
      artistName: "",
      youtubeUrl: "",
    },
  });

  // Fetch user's songs
  const { data: songs = [], isLoading: songsLoading } = useQuery<UserSong[]>({
    queryKey: ["/api/user-songs"],
    enabled: !!user,
  });

  // Submit new song mutation
  const submitSongMutation = useMutation({
    mutationFn: async (data: SongFormData) => {
      return apiRequest("POST", "/api/user-songs", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-songs"] });
      setSubmitDialogOpen(false);
      form.reset();
      toast({
        title: "Pesma dodata",
        description: "Vaša pesma je uspešno poslata na odobrenje.",
      });
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Greška pri dodavanju pesme";
      
      // Handle rate limiting error
      if (error.hoursRemaining) {
        toast({
          title: "Sačekajte",
          description: errorMessage,
          variant: "destructive",
        });
      } else if (errorMessage.includes("već postavljena")) {
        toast({
          title: "Duplikat",
          description: "Ova pesma je već postavljena.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Greška",
          description: errorMessage,
          variant: "destructive",
        });
      }
    },
  });

  // Delete song mutation
  const deleteSongMutation = useMutation({
    mutationFn: async (songId: number) => {
      return apiRequest("DELETE", `/api/user-songs/${songId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-songs"] });
      setDeleteDialogOpen(false);
      setSongToDelete(null);
      toast({
        title: "Pesma obrisana",
        description: "Pesma je uspešno uklonjena.",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Greška pri brisanju pesme",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: SongFormData) => {
    submitSongMutation.mutate(data);
  };

  const handleDelete = (songId: number) => {
    setSongToDelete(songId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (songToDelete) {
      deleteSongMutation.mutate(songToDelete);
    }
  };

  // Extract YouTube video ID from URL
  const getYoutubeVideoId = (url: string): string | null => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7] && match[7].length === 11 ? match[7] : null;
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-16">
        <Card>
          <CardHeader>
            <CardTitle>Prijavite se</CardTitle>
            <CardDescription>
              Morate biti prijavljeni da biste postavili pesme.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Link href="/auth">
              <Button data-testid="button-login">Prijavi se</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Moje Pesme"
        description="Podelite vaše omiljene YouTube pesme sa Studio LeFlow zajednicom"
        keywords={["pesme", "muzika", "youtube", "studija", "studio leflow"]}
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
                  <Music className="h-8 w-8" />
                  Moje Pesme
                </h1>
                <p className="text-muted-foreground">
                  Podelite vaše omiljene YouTube pesme (1 pesma na 36 sati)
                </p>
              </div>
              <Button
                onClick={() => setSubmitDialogOpen(true)}
                size="lg"
                data-testid="button-submit-song"
              >
                <Youtube className="mr-2 h-5 w-5" />
                Dodaj Pesmu
              </Button>
            </div>
          </motion.div>
        </FadeInWhenVisible>

        <Separator className="mb-8" />

        {/* User's Songs List */}
        <div className="space-y-4">
          {songsLoading ? (
            <>
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </>
          ) : songs.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center text-muted-foreground">
                  <Music className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">Niste još dodali nijednu pesmu</p>
                  <p className="text-sm">Kliknite na "Dodaj Pesmu" da počnete</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            songs.map((song) => {
              const videoId = getYoutubeVideoId(song.youtubeUrl);
              
              return (
                <motion.div
                  key={song.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <CardTitle className="flex items-center gap-2 flex-wrap">
                            {song.songTitle}
                            {song.approved ? (
                              <Badge variant="default" className="gap-1" data-testid={`badge-approved-${song.id}`}>
                                <CheckCircle2 className="h-3 w-3" />
                                Odobreno
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1" data-testid={`badge-pending-${song.id}`}>
                                <Clock className="h-3 w-3" />
                                Na čekanju
                              </Badge>
                            )}
                          </CardTitle>
                          <CardDescription>
                            {song.artistName} • Poslato {format(new Date(song.submittedAt), "dd.MM.yyyy HH:mm")}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(song.id)}
                          data-testid={`button-delete-${song.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
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
                        <div className="p-4 bg-muted rounded-md flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">Nevažeći YouTube URL</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Submit Song Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Dodaj Novu Pesmu</DialogTitle>
            <DialogDescription>
              Unesite YouTube link pesme koja želite da podelite. Možete dodati novu pesmu svakih 36 sati.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="songTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naslov pesme</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="npr. One More Time"
                        {...field}
                        data-testid="input-song-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="artistName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Izvođač</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="npr. Daft Punk"
                        {...field}
                        data-testid="input-artist-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="youtubeUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube URL</FormLabel>
                    <FormControl>
                      <Input
                        type="url"
                        placeholder="https://www.youtube.com/watch?v=..."
                        {...field}
                        data-testid="input-youtube-url"
                      />
                    </FormControl>
                    <FormDescription>
                      Kopirajte link YouTube videa
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSubmitDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Otkaži
                </Button>
                <Button
                  type="submit"
                  disabled={submitSongMutation.isPending}
                  data-testid="button-submit-form"
                >
                  {submitSongMutation.isPending ? "Dodavanje..." : "Dodaj Pesmu"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši pesmu?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija ne može biti poništena. Pesma će biti trajno uklonjena.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              data-testid="button-delete-confirm"
              disabled={deleteSongMutation.isPending}
            >
              {deleteSongMutation.isPending ? "Brisanje..." : "Obriši"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
