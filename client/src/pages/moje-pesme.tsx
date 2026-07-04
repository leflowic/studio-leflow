import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Music, Trash2, CheckCircle2, Clock, AlertCircle, Youtube, Plus, ExternalLink } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

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

function getYoutubeVideoId(url: string): string | null {
  const match = url.match(/^.*((youtu\.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/);
  return match && match[7]?.length === 11 ? match[7] : null;
}

export default function MojePesme() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [songToDelete, setSongToDelete] = useState<number | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  const form = useForm<SongFormData>({
    resolver: zodResolver(songFormSchema),
    defaultValues: { songTitle: "", artistName: "", youtubeUrl: "" },
  });

  const { data: songs = [], isLoading } = useQuery<UserSong[]>({
    queryKey: ["/api/user-songs"],
    enabled: !!user,
  });

  const submitSongMutation = useMutation({
    mutationFn: (data: SongFormData) => apiRequest("POST", "/api/user-songs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-songs"] });
      setSubmitDialogOpen(false);
      form.reset();
      toast({ title: "Pesma dodata", description: "Vaša pesma je uspešno poslata na odobrenje." });
    },
    onError: (error: any) => {
      toast({
        title: error.hoursRemaining ? "Sačekajte" : "Greška",
        description: error.message || "Greška pri dodavanju pesme",
        variant: "destructive",
      });
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: (songId: number) => apiRequest("DELETE", `/api/user-songs/${songId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-songs"] });
      setDeleteDialogOpen(false);
      setSongToDelete(null);
      toast({ title: "Pesma obrisana", description: "Pesma je uspešno uklonjena." });
    },
    onError: () => {
      toast({ title: "Greška", description: "Greška pri brisanju pesme", variant: "destructive" });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <Music className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h2 className="text-xl font-bold">Prijavite se</h2>
          <p className="text-sm text-muted-foreground">Morate biti prijavljeni da biste postavili pesme.</p>
          <Link href="/prijava">
            <Button data-testid="button-login">Prijavi se</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Moje Pesme"
        description="Podelite vaše omiljene YouTube pesme sa Studio LeFlow zajednicom"
        keywords={["pesme", "muzika", "youtube", "studio leflow"]}
      />

      <div className="min-h-screen">
        {/* Hero */}
        <div className="relative overflow-hidden border-b border-border/40 bg-gradient-to-br from-primary/10 via-background to-muted/20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.12),transparent_60%)]" />
          <div className="relative container mx-auto px-4 max-w-4xl py-10 md:py-12">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Youtube className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-widest">Moje Pesme</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">Moje Pesme</h1>
                <p className="text-muted-foreground text-sm max-w-md">
                  Podelite vaše omiljene YouTube pesme sa zajednicom - jedna pesma na 36 sati
                </p>
              </div>
              <Button
                onClick={() => setSubmitDialogOpen(true)}
                className="gap-2 rounded-xl"
                data-testid="button-submit-song"
              >
                <Plus className="w-4 h-4" />
                Dodaj Pesmu
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 max-w-4xl py-8">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map(i => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
            </div>
          ) : songs.length === 0 ? (
            <div className="rounded-2xl border border-border/60 bg-card p-14 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Music className="w-8 h-8 text-muted-foreground/40" />
              </div>
              <p className="font-semibold text-lg mb-1">Niste još dodali nijednu pesmu</p>
              <p className="text-sm text-muted-foreground mb-5">Kliknite na "Dodaj Pesmu" da počnete</p>
              <Button
                onClick={() => setSubmitDialogOpen(true)}
                className="gap-2 rounded-xl"
                data-testid="button-submit-first-song"
              >
                <Plus className="w-4 h-4" />
                Dodaj Prvu Pesmu
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {songs.map((song, index) => {
                  const videoId = getYoutubeVideoId(song.youtubeUrl);
                  const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;

                  return (
                    <motion.div
                      key={song.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-border hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-4 p-4">
                        {/* Thumbnail */}
                        {thumb ? (
                          <div className="w-20 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted">
                            <img src={thumb} alt={song.songTitle} className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-20 h-14 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                            <Music className="w-6 h-6 text-muted-foreground/40" />
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <p className="font-semibold truncate" data-testid={`song-title-${song.id}`}>{song.songTitle}</p>
                            {song.approved ? (
                              <Badge className="gap-1 bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/10 text-[11px] px-2 py-0.5" data-testid={`badge-approved-${song.id}`}>
                                <CheckCircle2 className="h-3 w-3" />
                                Odobreno
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1 text-[11px] px-2 py-0.5" data-testid={`badge-pending-${song.id}`}>
                                <Clock className="h-3 w-3" />
                                Na čekanju
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {song.artistName} · {format(new Date(song.submittedAt), "dd.MM.yyyy")}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {videoId && (
                            <a
                              href={song.youtubeUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                          <button
                            onClick={() => { setSongToDelete(song.id); setDeleteDialogOpen(true); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                            data-testid={`button-delete-${song.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Expanded YouTube embed - only for invalid URL */}
                      {!videoId && (
                        <div className="mx-4 mb-4 p-3 bg-muted/40 rounded-xl flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <p className="text-sm text-muted-foreground">Nevažeći YouTube URL</p>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Link to community to see songs in voting */}
              <div className="pt-2 text-center">
                <Link href="/zajednica">
                  <Button variant="outline" className="gap-2 text-sm">
                    <Youtube className="w-4 h-4" />
                    Pogledaj glasanje u zajednici
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submit Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[460px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Dodaj Novu Pesmu</DialogTitle>
            <DialogDescription>
              Unesite YouTube link pesme koju želite da podelite. Možete dodati novu pesmu svakih 36 sati.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(d => submitSongMutation.mutate(d))} className="space-y-4">
              <FormField
                control={form.control}
                name="songTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naslov pesme</FormLabel>
                    <FormControl>
                      <Input placeholder="npr. One More Time" {...field} data-testid="input-song-title" />
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
                      <Input placeholder="npr. Daft Punk" {...field} data-testid="input-artist-name" />
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
                    <FormDescription>Kopirajte link YouTube videa</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter className="gap-2">
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

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Obriši pesmu?</AlertDialogTitle>
            <AlertDialogDescription>
              Ova akcija ne može biti poništena. Pesma će biti trajno uklonjena.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-delete-cancel">Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => songToDelete && deleteSongMutation.mutate(songToDelete)}
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
