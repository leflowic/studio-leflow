import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Link2, Plus, Trash2, Edit2, Copy, ExternalLink, BarChart2, Music2, Upload, X } from "lucide-react";
import type { SmartLink } from "@shared/schema";

type SmartLinkWithStats = SmartLink & { totalClicks: number; clicksByPlatform: Record<string, number> };

const PLATFORMS = [
  { key: "spotifyUrl", label: "Spotify", color: "#1DB954", clickKey: "spotify" },
  { key: "youtubeUrl", label: "YouTube", color: "#FF0000", clickKey: "youtube" },
  { key: "appleMusicUrl", label: "Apple Music", color: "#FC3C44", clickKey: "apple_music" },
  { key: "soundcloudUrl", label: "SoundCloud", color: "#FF5500", clickKey: "soundcloud" },
  { key: "tidalUrl", label: "Tidal", color: "#00D4FF", clickKey: "tidal" },
  { key: "deezerUrl", label: "Deezer", color: "#A04FFF", clickKey: "deezer" },
] as const;

const emptyForm = {
  slug: "",
  title: "",
  artist: "",
  coverUrl: "",
  spotifyUrl: "",
  youtubeUrl: "",
  appleMusicUrl: "",
  soundcloudUrl: "",
  tidalUrl: "",
  deezerUrl: "",
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function SmartLinksTab() {
  const { toast } = useToast();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: links, isLoading } = useQuery<SmartLinkWithStats[]>({
    queryKey: ["/api/admin/smart-links"],
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const clean: Record<string, string | null> = { ...data };
      for (const key of ["spotifyUrl", "youtubeUrl", "appleMusicUrl", "soundcloudUrl", "tidalUrl", "deezerUrl"]) {
        if (!clean[key]) clean[key] = null;
      }
      if (editingId !== null) {
        return apiRequest("PATCH", `/api/admin/smart-links/${editingId}`, clean);
      }
      return apiRequest("POST", "/api/admin/smart-links", clean);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smart-links"] });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      toast({ title: editingId !== null ? "Link ažuriran" : "Link kreiran" });
    },
    onError: async (e: any) => {
      const msg = await e?.response?.json?.().catch(() => null);
      toast({ title: "Greška", description: msg?.error ?? "Greška na serveru", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/smart-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smart-links"] });
      toast({ title: "Link obrisan" });
    },
    onError: () => toast({ title: "Greška", description: "Brisanje nije uspelo", variant: "destructive" }),
  });

  function openCreate() {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(link: SmartLinkWithStats) {
    setForm({
      slug: link.slug,
      title: link.title,
      artist: link.artist,
      coverUrl: link.coverUrl ?? "",
      spotifyUrl: link.spotifyUrl ?? "",
      youtubeUrl: link.youtubeUrl ?? "",
      appleMusicUrl: link.appleMusicUrl ?? "",
      soundcloudUrl: link.soundcloudUrl ?? "",
      tidalUrl: link.tidalUrl ?? "",
      deezerUrl: link.deezerUrl ?? "",
    });
    setEditingId(link.id);
    setDialogOpen(true);
  }

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = localStorage.getItem("auth_token");
      const r = await fetch("/api/upload/smart-link-cover", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setForm(f => ({ ...f, coverUrl: data.url }));
    } catch (e: any) {
      toast({ title: "Greška", description: e.message ?? "Upload nije uspeo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/l/${slug}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link kopiran!" });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold">Smart Links</h2>
          <Badge variant="secondary" className="text-xs">{links?.length ?? 0} linkova</Badge>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Novi link
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId !== null ? "Uredi link" : "Novi smart link"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {/* Cover image */}
              <div className="space-y-2">
                <Label>Cover slika</Label>
                <div
                  className="relative w-full h-36 rounded-xl border border-border/40 bg-muted/30 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-primary/40 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  {form.coverUrl ? (
                    <>
                      <img src={form.coverUrl} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-6 h-6 text-white" />
                      </div>
                      <button
                        className="absolute top-2 right-2 bg-black/70 rounded-full p-1 z-10"
                        onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, coverUrl: "" })); }}
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      {uploading ? (
                        <div className="animate-spin w-5 h-5 rounded-full border-2 border-primary border-t-transparent" />
                      ) : (
                        <>
                          <Music2 className="w-8 h-8 opacity-40" />
                          <span className="text-xs">Klikni za upload slike</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }}
                />
                <Input
                  placeholder="Ili unesite URL slike..."
                  value={form.coverUrl}
                  onChange={e => setForm(f => ({ ...f, coverUrl: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Naslov</Label>
                  <Input
                    placeholder="Ime pesme"
                    value={form.title}
                    onChange={e => {
                      const title = e.target.value;
                      setForm(f => ({ ...f, title, slug: f.slug || slugify(title) }));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Izvođač</Label>
                  <Input
                    placeholder="Ime izvođača"
                    value={form.artist}
                    onChange={e => setForm(f => ({ ...f, artist: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Slug (URL)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">/l/</span>
                  <Input
                    placeholder="moja-pesma"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Platforme</p>
                {PLATFORMS.map(p => (
                  <div key={p.key} className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <Label className="w-28 text-sm flex-shrink-0">{p.label}</Label>
                    <Input
                      placeholder={`URL za ${p.label}...`}
                      value={form[p.key as keyof typeof emptyForm]}
                      onChange={e => setForm(f => ({ ...f, [p.key]: e.target.value }))}
                      className="text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Otkaži</Button>
                <Button
                  onClick={() => saveMutation.mutate(form)}
                  disabled={saveMutation.isPending || !form.title || !form.artist || !form.slug}
                >
                  {saveMutation.isPending ? "Čuvam..." : editingId !== null ? "Sačuvaj" : "Kreiraj"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : !links?.length ? (
        <Card className="border-dashed border-border/40">
          <CardContent className="py-16 flex flex-col items-center gap-3 text-muted-foreground">
            <Link2 className="w-10 h-10 opacity-30" />
            <p className="text-sm">Nema smart linkova</p>
            <Button variant="outline" size="sm" onClick={openCreate} className="gap-2 mt-1">
              <Plus className="w-4 h-4" /> Kreiraj prvi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {links.map(link => (
            <Card key={link.id} className="border-border/40 bg-card overflow-hidden hover:border-primary/20 transition-colors">
              <CardContent className="p-0">
                <div className="flex items-stretch gap-0">
                  {/* Cover */}
                  <div className="w-20 h-20 flex-shrink-0 bg-muted/40 relative overflow-hidden">
                    {link.coverUrl ? (
                      <img src={link.coverUrl} alt={link.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music2 className="w-6 h-6 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 px-4 py-3 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{link.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{link.artist}</p>
                        <p className="text-xs text-primary/70 mt-0.5 font-mono">/l/{link.slug}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <BarChart2 className="w-3 h-3" />
                          {link.totalClicks}
                        </Badge>
                      </div>
                    </div>

                    {/* Platform clicks */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {PLATFORMS.filter(p => link[p.key as keyof SmartLink]).map(p => (
                        <span key={p.key} className="text-xs rounded-full px-2 py-0.5 font-medium" style={{ background: `${p.color}20`, color: p.color }}>
                          {p.label}: {link.clicksByPlatform[p.clickKey] ?? 0}
                        </span>
                      ))}
                      {PLATFORMS.every(p => !link[p.key as keyof SmartLink]) && (
                        <span className="text-xs text-muted-foreground">Nema platformi</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col items-center justify-center gap-1.5 pr-3 pl-1 border-l border-border/30">
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => copyLink(link.slug)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7" asChild>
                      <a href={`/l/${link.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => openEdit(link)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:text-destructive">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Obriši link?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Link za &quot;{link.title}&quot; i svi podaci o klikovima biće trajno obrisani.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Otkaži</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteMutation.mutate(link.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Obriši
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
