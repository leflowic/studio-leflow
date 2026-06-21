import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
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
import {
  Link2, Plus, Trash2, Edit2, Copy, ExternalLink,
  Music2, Upload, X, Sparkles, Loader2, MousePointerClick, TrendingUp,
} from "lucide-react";
import { SiSpotify, SiYoutube, SiApplemusic, SiSoundcloud, SiTidal } from "react-icons/si";
import type { SmartLink } from "@shared/schema";

type SmartLinkWithStats = SmartLink & { totalClicks: number; clicksByPlatform: Record<string, number> };

const PLATFORMS = [
  { key: "spotifyUrl", label: "Spotify", color: "#1DB954", clickKey: "spotify", Icon: SiSpotify },
  { key: "youtubeUrl", label: "YouTube", color: "#FF0033", clickKey: "youtube", Icon: SiYoutube },
  { key: "appleMusicUrl", label: "Apple Music", color: "#FC3C44", clickKey: "apple_music", Icon: SiApplemusic },
  { key: "soundcloudUrl", label: "SoundCloud", color: "#FF5500", clickKey: "soundcloud", Icon: SiSoundcloud },
  { key: "tidalUrl", label: "Tidal", color: "#00CFFF", clickKey: "tidal", Icon: SiTidal },
  { key: "deezerUrl", label: "Deezer", color: "#9B59FF", clickKey: "deezer", Icon: () => <svg viewBox="0 0 24 24" fill="currentColor" width={13} height={13}><path d="M18.81 11.834h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0 6.967h3.19v1.969h-3.19zm-4.271 3.483h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm-4.27 10.45h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm-4.271 6.967h3.19v1.969H6v-1.969zm0-3.483h3.19v1.969H6v-1.969zm-4.27 3.483H5v1.969H1.73v-1.969z"/></svg> },
] as const;

const emptyForm = {
  slug: "", title: "", artist: "", coverUrl: "",
  spotifyUrl: "", youtubeUrl: "", appleMusicUrl: "",
  soundcloudUrl: "", tidalUrl: "", deezerUrl: "",
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
  const [autoUrl, setAutoUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: links, isLoading } = useQuery<SmartLinkWithStats[]>({
    queryKey: ["/api/admin/smart-links"],
  });

  const totalClicks = links?.reduce((s, l) => s + l.totalClicks, 0) ?? 0;

  const saveMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const clean: Record<string, string | null> = { ...data };
      for (const key of ["spotifyUrl", "youtubeUrl", "appleMusicUrl", "soundcloudUrl", "tidalUrl", "deezerUrl"]) {
        if (!clean[key]) clean[key] = null;
      }
      return editingId !== null
        ? apiRequest("PATCH", `/api/admin/smart-links/${editingId}`, clean)
        : apiRequest("POST", "/api/admin/smart-links", clean);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smart-links"] });
      closeDialog();
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

  const fetchMetaMutation = useMutation({
    mutationFn: async (url: string) => {
      const r = await apiRequest("POST", "/api/admin/smart-links/fetch-meta", { url });
      return r.json();
    },
    onSuccess: (data) => {
      setForm(f => ({
        ...f,
        title: data.title || f.title,
        artist: data.artist || f.artist,
        coverUrl: data.coverUrl || f.coverUrl,
        slug: f.slug || slugify(data.title || ""),
        spotifyUrl: data.spotifyUrl || f.spotifyUrl,
        youtubeUrl: data.youtubeUrl || f.youtubeUrl,
        appleMusicUrl: data.appleMusicUrl || f.appleMusicUrl,
        soundcloudUrl: data.soundcloudUrl || f.soundcloudUrl,
        tidalUrl: data.tidalUrl || f.tidalUrl,
        deezerUrl: data.deezerUrl || f.deezerUrl,
      }));
      setAutoUrl("");
      toast({ title: "Pronađeno!", description: "Proveri podatke i sačuvaj link." });
    },
    onError: async (e: any) => {
      const msg = await e?.response?.json?.().catch(() => null);
      toast({ title: "Greška", description: msg?.error ?? "Nije moguće pronaći pesmu", variant: "destructive" });
    },
  });

  function closeDialog() {
    setDialogOpen(false);
    setForm(emptyForm);
    setAutoUrl("");
    setEditingId(null);
  }

  function openCreate() {
    setForm(emptyForm);
    setAutoUrl("");
    setEditingId(null);
    setDialogOpen(true);
  }

  function openEdit(link: SmartLinkWithStats) {
    setAutoUrl("");
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
    navigator.clipboard.writeText(`${window.location.origin}/l/${slug}`);
    toast({ title: "Link kopiran!" });
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2.5 mb-0.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-primary" />
            </div>
            <h2 className="text-xl font-bold">Smart Links</h2>
          </div>
          <p className="text-xs text-muted-foreground ml-10.5">Tvoji li.sten.to linkovi — jedna pesma, sve platforme</p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { if (open) setDialogOpen(true); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4" />
              Novi link
            </Button>
          </DialogTrigger>

          <DialogContent
            className="max-w-lg max-h-[90vh] overflow-y-auto bg-[#0f0f0f] border-border/40"
            onFocusOutside={(e) => e.preventDefault()}
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={closeDialog}
          >
            <DialogHeader>
              <DialogTitle className="text-base">
                {editingId !== null ? "Uredi smart link" : "Novi smart link"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 pt-1">
              {/* Auto-fill box */}
              <div className="rounded-2xl overflow-hidden border border-primary/15 bg-gradient-to-br from-primary/8 to-primary/3">
                <div className="px-4 py-3 border-b border-primary/10 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">Auto-popuni</span>
                </div>
                <div className="px-4 py-3 space-y-2.5">
                  <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                    Ubaci link pesme sa <span className="text-foreground/70">bilo koje platforme</span> — Spotify, YouTube, Apple Music... i mi ćemo naći sve ostalo automatski.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://open.spotify.com/track/..."
                      value={autoUrl}
                      onChange={e => setAutoUrl(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && autoUrl) fetchMetaMutation.mutate(autoUrl); }}
                      className="text-xs h-9 bg-background/50 border-border/30 focus:border-primary/40"
                    />
                    <Button
                      size="sm"
                      onClick={() => fetchMetaMutation.mutate(autoUrl)}
                      disabled={!autoUrl || fetchMetaMutation.isPending}
                      className="h-9 px-4 shrink-0 gap-1.5"
                    >
                      {fetchMetaMutation.isPending
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <Sparkles className="w-3.5 h-3.5" />}
                      {fetchMetaMutation.isPending ? "Tražim..." : "Nađi"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Cover + preview */}
              <div className="flex gap-4 items-start">
                {/* Cover upload */}
                <div
                  className="relative w-24 h-24 rounded-2xl border border-border/30 bg-muted/20 flex-shrink-0 flex items-center justify-center cursor-pointer overflow-hidden group hover:border-primary/30 transition-all"
                  onClick={() => fileRef.current?.click()}
                >
                  {form.coverUrl ? (
                    <>
                      <img src={form.coverUrl} alt="cover" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-5 h-5 text-white" />
                      </div>
                      <button
                        className="absolute top-1.5 right-1.5 bg-black/80 rounded-full p-0.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={e => { e.stopPropagation(); setForm(f => ({ ...f, coverUrl: "" })); }}
                      >
                        <X className="w-2.5 h-2.5 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-muted-foreground/50">
                      {uploading
                        ? <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        : <>
                          <Music2 className="w-6 h-6" />
                          <span className="text-[9px] text-center leading-tight">Cover<br />slika</span>
                        </>
                      }
                    </div>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }} />

                {/* Title + artist + slug */}
                <div className="flex-1 space-y-2.5">
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Naslov pesme</Label>
                    <Input
                      placeholder="Naslov pesme"
                      value={form.title}
                      onChange={e => {
                        const title = e.target.value;
                        setForm(f => ({ ...f, title, slug: f.slug || slugify(title) }));
                      }}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] text-muted-foreground">Izvođač</Label>
                    <Input
                      placeholder="Ime izvođača"
                      value={form.artist}
                      onChange={e => setForm(f => ({ ...f, artist: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Cover URL input */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">URL cover slike</Label>
                <Input
                  placeholder="https://..."
                  value={form.coverUrl}
                  onChange={e => setForm(f => ({ ...f, coverUrl: e.target.value }))}
                  className="h-9 text-xs"
                />
              </div>

              {/* Slug */}
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">URL slug</Label>
                <div className="flex items-center h-9 rounded-lg border border-border/40 bg-muted/20 overflow-hidden focus-within:border-primary/40 transition-colors">
                  <span className="px-3 text-xs text-muted-foreground border-r border-border/30 h-full flex items-center bg-muted/20 shrink-0">
                    /l/
                  </span>
                  <input
                    className="flex-1 px-3 text-sm bg-transparent outline-none text-foreground placeholder:text-muted-foreground/50"
                    placeholder="naziv-pesme"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  />
                </div>
              </div>

              {/* Platforms */}
              <div className="space-y-1.5">
                <Label className="text-[11px] text-muted-foreground uppercase tracking-wider">Platforme</Label>
                <div className="rounded-xl border border-border/30 overflow-hidden divide-y divide-border/20">
                  {PLATFORMS.map(p => (
                    <div key={p.key} className="flex items-center gap-3 px-3 py-2.5 bg-muted/5 hover:bg-muted/10 transition-colors">
                      <p.Icon size={13} style={{ color: p.color }} className="flex-shrink-0" />
                      <span className="text-xs font-medium w-24 shrink-0 text-foreground/70">{p.label}</span>
                      <input
                        className="flex-1 bg-transparent outline-none text-xs text-foreground placeholder:text-muted-foreground/40 py-0.5"
                        placeholder={`URL za ${p.label}...`}
                        value={form[p.key as keyof typeof emptyForm]}
                        onChange={e => setForm(f => ({ ...f, [p.key]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" onClick={closeDialog} className="h-9">
                  Otkaži
                </Button>
                <Button
                  onClick={() => saveMutation.mutate(form)}
                  disabled={saveMutation.isPending || !form.title || !form.artist || !form.slug}
                  className="h-9 px-5 shadow-lg shadow-primary/20"
                >
                  {saveMutation.isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />Čuvam...</> : editingId !== null ? "Sačuvaj" : "Kreiraj link"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      {!!links?.length && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border/30 bg-card px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Link2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-black leading-none">{links.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Smart linkova</p>
            </div>
          </div>
          <div className="rounded-2xl border border-border/30 bg-card px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <MousePointerClick className="w-4 h-4 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-black leading-none">{totalClicks}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ukupno klikova</p>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[88px] w-full rounded-2xl" />)}
        </div>
      ) : !links?.length ? (
        <div className="rounded-2xl border border-dashed border-border/30 py-16 flex flex-col items-center gap-3 text-muted-foreground">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center">
            <Link2 className="w-6 h-6 opacity-40" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">Nema smart linkova</p>
            <p className="text-xs text-muted-foreground/60 mt-0.5">Kreiraj prvi link i podeli muziku na svim platformama</p>
          </div>
          <Button variant="outline" size="sm" onClick={openCreate} className="gap-2 mt-1">
            <Plus className="w-3.5 h-3.5" /> Kreiraj prvi
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {links.map(link => (
            <div
              key={link.id}
              className="group rounded-2xl border border-border/30 bg-card overflow-hidden hover:border-primary/20 hover:bg-card/80 transition-all duration-200"
            >
              <div className="flex items-stretch">
                {/* Cover */}
                <div className="w-[88px] h-[88px] flex-shrink-0 relative overflow-hidden bg-muted/30">
                  {link.coverUrl ? (
                    <img src={link.coverUrl} alt={link.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-7 h-7 text-muted-foreground/25" />
                    </div>
                  )}
                  {/* Gradient overlay on cover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/20" />
                </div>

                {/* Info */}
                <div className="flex-1 px-4 py-3.5 min-w-0 flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-sm leading-tight truncate">{link.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{link.artist}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-mono text-primary/50 bg-primary/5 px-2 py-0.5 rounded-md border border-primary/10">
                      /l/{link.slug}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      {link.totalClicks} klikova
                    </div>
                  </div>
                  {/* Platform dots */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {PLATFORMS.filter(p => link[p.key as keyof SmartLink]).map(p => (
                      <div
                        key={p.key}
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: p.color }}
                        title={`${p.label}: ${link.clicksByPlatform[p.clickKey] ?? 0} klikova`}
                      />
                    ))}
                    {PLATFORMS.every(p => !link[p.key as keyof SmartLink]) && (
                      <span className="text-[10px] text-muted-foreground/50">Nema platformi</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center justify-center gap-0.5 px-3 border-l border-border/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost" size="icon"
                    className="w-7 h-7 hover:bg-primary/10 hover:text-primary"
                    onClick={() => copyLink(link.slug)}
                    title="Kopiraj link"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7" asChild title="Otvori stranicu">
                    <a href={`/l/${link.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="w-7 h-7 hover:bg-primary/10 hover:text-primary"
                    onClick={() => openEdit(link)}
                    title="Uredi"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-7 h-7 hover:bg-destructive/10 hover:text-destructive" title="Obriši">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Obriši link?</AlertDialogTitle>
                        <AlertDialogDescription>
                          &ldquo;{link.title}&rdquo; i svi podaci o klikovima biće trajno obrisani.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Otkaži</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteMutation.mutate(link.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Obriši
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
