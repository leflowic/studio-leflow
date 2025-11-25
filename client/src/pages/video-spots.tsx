import { Video, Plus, Trash2, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { useEditMode } from "@/contexts/EditModeContext";
import { useToast } from "@/hooks/use-toast";
import { SEO } from "@/components/SEO";
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
    queryFn: () => fetch("/api/video-spots").then(r => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: async (data: VideoSpotFormData) => {
      const response = await fetch("/api/video-spots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

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
      const response = await fetch(`/api/video-spots/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

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
      const response = await fetch(`/api/video-spots/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <SEO
        title="Projekti - Studio LeFlow"
        description="Projekti u kojima je naš tim učestvovao - video spotovi, pesme i muzička produkcija. Profesionalni muzički studio u Beogradu."
        keywords={["studio leflow", "leflow studio", "leflow", "muzička produkcija", "beograd", "video spotovi", "produkcija pesama", "snimanje muzike", "muzički projekti", "leflow studio projekti"]}
      />

      <section className="py-20">
        <div className="container px-4 mx-auto">
          <FadeInWhenVisible>
            <div className="flex flex-col items-center text-center mb-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                Naši <span className="text-primary">Projekti</span>
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Projekti u kojima je naš tim učestvovao - pogledajte šta smo kreirali
              </p>
            </div>
          </FadeInWhenVisible>

          {isEditMode && (
            <div className="flex justify-center mb-8">
              <Button
                onClick={() => handleOpenDialog()}
                className="gap-2"
                size="lg"
              >
                <Plus className="w-5 h-5" />
                Dodaj Novi Projekat
              </Button>
            </div>
          )}

          {spots.length === 0 ? (
            <FadeInWhenVisible>
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {isEditMode
                    ? "Kliknite na dugme iznad da dodate prvi projekat"
                    : "Trenutno nema dostupnih projekata"}
                </p>
              </div>
            </FadeInWhenVisible>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-8">
              {spots.map((spot, index) => {
                const videoId = extractYouTubeVideoId(spot.youtubeUrl);
                
                return (
                  <FadeInWhenVisible key={spot.id} delay={index * 0.1}>
                    <Card className="overflow-visible hover-elevate active-elevate-2">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-2xl mb-2">{spot.title}</CardTitle>
                            <CardDescription className="text-base">
                              <span className="font-semibold text-primary">{spot.artist}</span>
                            </CardDescription>
                          </div>
                          {isEditMode && (
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleOpenDialog(spot)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                onClick={() => deleteMutation.mutate(spot.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {videoId ? (
                          <div className="overflow-hidden rounded-lg">
                            <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
                              <iframe
                                className="absolute top-0 left-0 w-full h-full"
                                src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                                title={spot.title}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                loading="lazy"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="bg-muted rounded-lg p-8 text-center">
                            <p className="text-muted-foreground">Nevažeći YouTube URL</p>
                          </div>
                        )}
                        
                        {spot.description && (
                          <p className="text-muted-foreground">{spot.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  </FadeInWhenVisible>
                );
              })}
            </div>
          )}
        </div>
      </section>

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
                ⚠️ Napomena: Age-restricted YouTube videi (18+) ne mogu da se prikazuju preko iframe-a. Koristite samo javne videe bez starosnih ograničenja.
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
