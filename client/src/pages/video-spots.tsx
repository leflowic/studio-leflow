import { Video, Plus, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { useEditMode } from "@/contexts/EditModeContext";
import { useToast } from "@/hooks/use-toast";
import { SEO, pageStructuredData } from "@/components/SEO";
import { apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { VideoSpot } from "@shared/schema";

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/,
    /youtube\.com\/embed\/([^&\s]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) return match[1];
  }

  return null;
}

interface VideoSpotFormData {
  title: string;
  description: string;
  artist: string;
  youtubeUrl: string;
}

export default function VideoSpots() {
  const { isEditMode } = useEditMode();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSpot, setEditingSpot] = useState<VideoSpot | null>(null);
  const [formData, setFormData] = useState<VideoSpotFormData>({
    title: "",
    description: "",
    artist: "",
    youtubeUrl: "",
  });

  const { data: spots = [] } = useQuery<VideoSpot[]>({
    queryKey: ["/api/video-spots"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: VideoSpotFormData) => {
      const response = await apiRequest("POST", "/api/video-spots", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška pri dodavanju spota");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/video-spots"] });
      toast({
        title: "Uspešno dodato",
        description: "Novi projekat je dodat",
      });
      setIsDialogOpen(false);
      setFormData({ title: "", description: "", artist: "", youtubeUrl: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: VideoSpotFormData }) => {
      const response = await apiRequest("PUT", `/api/video-spots/${id}`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Greška pri ažuriranju spota");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/video-spots"] });
      toast({
        title: "Uspešno ažurirano",
        description: "Projekat je ažuriran",
      });
      setIsDialogOpen(false);
      setEditingSpot(null);
      setFormData({ title: "", description: "", artist: "", youtubeUrl: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Greška",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/video-spots/${id}`);
      if (!response.ok) {
        throw new Error("Greška pri brisanju spota");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/video-spots"] });
      toast({
        title: "Uspešno obrisano",
        description: "Projekat je obrisan",
      });
    },
    onError: () => {
      toast({
        title: "Greška",
        description: "Došlo je do greške pri brisanju spota",
        variant: "destructive",
      });
    },
  });

  const handleOpenDialog = (spot?: VideoSpot) => {
    if (spot) {
      setEditingSpot(spot);
      setFormData({
        title: spot.title,
        description: spot.description,
        artist: spot.artist,
        youtubeUrl: spot.youtubeUrl,
      });
    } else {
      setEditingSpot(null);
      setFormData({ title: "", description: "", artist: "", youtubeUrl: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingSpot) {
      updateMutation.mutate({ id: editingSpot.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="min-h-screen">
      <SEO
        title="Projekti - Studio LeFlow"
        description="Projekti u kojima je naš tim učestvovao - video spotovi, pesme i muzička produkcija. Profesionalni muzički studio u Beogradu."
        keywords={["studio leflow", "leflow studio", "leflow", "muzička produkcija", "beograd", "video spotovi", "produkcija pesama", "snimanje muzike", "muzički projekti", "leflow studio projekti"]}
        structuredData={pageStructuredData.portfolio}
      />

      {/* Hero */}
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 text-center relative">
          <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3">Video Produkcija</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Video Spotovi
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Pogledajte produkciju Studio LeFlow-a
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4">

          {/* Admin add button */}
          {isEditMode && (
            <div className="flex justify-end mb-8">
              <Button
                onClick={() => handleOpenDialog()}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Dodaj Novi Spot
              </Button>
            </div>
          )}

          {spots.length === 0 ? (
            <FadeInWhenVisible>
              <div className="text-center py-24">
                <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                  <Video className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">
                  {isEditMode ? "Dodajte prvi spot" : "Spotovi dolaze uskoro"}
                </h3>
                <p className="text-muted-foreground">
                  {isEditMode
                    ? "Kliknite na dugme u gornjem desnom uglu da dodate prvi projekat"
                    : "Pratite nas na Instagramu za najnovije projekte."}
                </p>
              </div>
            </FadeInWhenVisible>
          ) : (
            <FadeInWhenVisible>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {spots.map((spot) => {
                  const videoId = extractYouTubeVideoId(spot.youtubeUrl);

                  return (
                    <div
                      key={spot.id}
                      className="group relative rounded-2xl border border-white/[0.07] bg-card/40 backdrop-blur-sm overflow-hidden hover:border-primary/30 hover:shadow-[0_0_30px_-8px] hover:shadow-primary/20 transition-all duration-500"
                    >
                      {/* Admin controls — appear on hover */}
                      {isEditMode && (
                        <div className="absolute top-3 right-3 z-10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            variant="outline"
                            size="icon"
                            className="w-8 h-8 bg-background/80 backdrop-blur-sm"
                            onClick={() => handleOpenDialog(spot)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            className="w-8 h-8"
                            onClick={() => deleteMutation.mutate(spot.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}

                      {/* YouTube embed */}
                      <div className="aspect-video">
                        {videoId ? (
                          <iframe
                            src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                            title={spot.title}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                            <p className="text-sm text-muted-foreground">Nevažeći YouTube URL</p>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-5">
                        <h3 className="font-bold text-lg mb-1">{spot.title}</h3>
                        {spot.artist && (
                          <p className="text-primary text-sm font-medium mb-2">{spot.artist}</p>
                        )}
                        {spot.description && (
                          <p className="text-muted-foreground text-sm">{spot.description}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </FadeInWhenVisible>
          )}
        </div>
      </section>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {editingSpot ? "Izmeni Projekat" : "Dodaj Novi Projekat"}
            </DialogTitle>
            <DialogDescription>
              Popunite informacije o projektu. Unesite YouTube URL videa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Naslov</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Unesite naslov projekta"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="artist">Izvođač</Label>
              <Input
                id="artist"
                value={formData.artist}
                onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                placeholder="Unesite ime izvođača"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="youtubeUrl">YouTube URL</Label>
              <Input
                id="youtubeUrl"
                value={formData.youtubeUrl}
                onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="text-xs text-muted-foreground">
                Napomena: Age-restricted YouTube videi (18+) ne mogu da se prikazuju preko iframe-a. Koristite samo javne videe bez starosnih ograničenja.
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Opis</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Unesite opis projekta (opciono)"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Otkaži
            </Button>
            <Button onClick={handleSubmit}>
              {editingSpot ? "Sačuvaj Izmene" : "Dodaj Projekat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
