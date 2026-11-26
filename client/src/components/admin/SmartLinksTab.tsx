import { useState, useRef, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Link2, Plus, Trash2, Pencil, Copy, Check, ExternalLink, Music2, Upload, X, Wand2, Loader2,
  UserPlus, Search, MoreHorizontal, ChevronDown, ArrowUpRight,
} from "lucide-react";
import { SMART_LINK_PLATFORMS as PLATFORMS, SMART_LINK_HUB as HUB, PlatformBars, nfSr as nf, type SmartLinkPlatformKey as PlatformKey } from "@/lib/smart-link-platforms";
import { Modal } from "./AdminModal";
import type { SmartLink } from "@shared/schema";

type SmartLinkWithStats = SmartLink & { totalClicks: number; clicksByPlatform: Record<string, number>; uniqueClicks: number };

const emptyForm = {
  slug: "", title: "", artist: "", coverUrl: "",
  spotifyUrl: "", youtubeUrl: "", appleMusicUrl: "",
  soundcloudUrl: "", tidalUrl: "", deezerUrl: "",
};
type FormState = typeof emptyForm;

type SortKey = "newest" | "clicks" | "unique" | "title";

function slugify(t: string) {
  return t.toLowerCase()
    .replace(/đ/g, "dj")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").replace(/-+/g, "-");
}

function formatDate(d: string | Date) {
  const date = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(date.getDate())}.${p(date.getMonth() + 1)}.${date.getFullYear()}.`;
}

// ── sessionStorage helpers (form survives a remount, see CLAUDE.md) ─────────────
function ssGet<T>(key: string, fallback: T): T {
  try { const v = sessionStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function ssSet(key: string, val: unknown) { try { sessionStorage.setItem(key, JSON.stringify(val)); } catch {} }

// ── Main component ────────────────────────────────────────────────────────────
export function SmartLinksTab() {
  const { toast } = useToast();
  const [form, setFormRaw] = useState<FormState>(() => ssGet("sl_form", emptyForm));
  const [editingId, setEditingIdRaw] = useState<number | null>(() => ssGet("sl_editing_id", null));
  const [open, setOpenRaw] = useState(() => ssGet("sl_open", false));
  const [slugTouched, setSlugTouchedRaw] = useState(() => ssGet("sl_slug_touched", false));
  const [uploading, setUploading] = useState(false);
  const [autoUrl, setAutoUrl] = useState("");
  const [autoFillPending, setAutoFillPending] = useState(false);
  const [assigningLink, setAssigningLink] = useState<SmartLinkWithStats | null>(null);
  const [deletingLink, setDeletingLink] = useState<SmartLinkWithStats | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("null");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>(() => ssGet("sl_sort", "newest"));
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const setForm = (f: FormState) => { ssSet("sl_form", f); setFormRaw(f); };
  const setEditingId = (id: number | null) => { ssSet("sl_editing_id", id); setEditingIdRaw(id); };
  const setOpen = (v: boolean) => { ssSet("sl_open", v); setOpenRaw(v); };
  const setSlugTouched = (v: boolean) => { ssSet("sl_slug_touched", v); setSlugTouchedRaw(v); };

  const { data: links, isLoading, isError } = useQuery<SmartLinkWithStats[]>({ queryKey: ["/api/admin/smart-links"] });
  const { data: assignableUsers = [] } = useQuery<Array<{ id: number; username: string }>>({
    queryKey: ["/api/admin/smart-links/assignable-users"],
  });
  const usernameById = useMemo(() => new Map(assignableUsers.map(u => [u.id, u.username])), [assignableUsers]);

  // ── Derived stats ──
  const totals = useMemo(() => {
    const byPlatform: Record<string, number> = {};
    let clicks = 0, unique = 0;
    for (const l of links ?? []) {
      clicks += l.totalClicks;
      unique += l.uniqueClicks;
      for (const [k, v] of Object.entries(l.clicksByPlatform)) byPlatform[k] = (byPlatform[k] ?? 0) + v;
    }
    const top = [...(links ?? [])].sort((a, b) => b.totalClicks - a.totalClicks)[0];
    return { clicks, unique, byPlatform, top: top && top.totalClicks > 0 ? top : null };
  }, [links]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = (links ?? []).filter(l =>
      !q || l.title.toLowerCase().includes(q) || l.artist.toLowerCase().includes(q) || l.slug.includes(q),
    );
    const sorted = [...list];
    if (sort === "clicks") sorted.sort((a, b) => b.totalClicks - a.totalClicks);
    else if (sort === "unique") sorted.sort((a, b) => b.uniqueClicks - a.uniqueClicks);
    else if (sort === "title") sorted.sort((a, b) => a.title.localeCompare(b.title, "sr"));
    else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted;
  }, [links, query, sort]);

  // ── Mutations ──
  const assignMutation = useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: number | null }) =>
      apiRequest("PATCH", `/api/admin/smart-links/${id}`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smart-links"] });
      setAssigningLink(null);
      toast({ title: "Vlasnik ažuriran" });
    },
    onError: () => toast({ title: "Vlasnik nije sačuvan", description: "Pokušajte ponovo.", variant: "destructive" }),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: FormState) => {
      const clean: Record<string, string | null> = { ...data };
      for (const p of PLATFORMS) if (!clean[p.key]?.trim()) clean[p.key] = null;
      return editingId !== null
        ? apiRequest("PATCH", `/api/admin/smart-links/${editingId}`, clean)
        : apiRequest("POST", "/api/admin/smart-links", clean);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smart-links"] });
      const wasEditing = editingId !== null;
      const slug = form.slug;
      closeDialog();
      setTimeout(() => toast({
        title: wasEditing ? "Izmene sačuvane" : "Link je napravljen",
        description: wasEditing ? undefined : `${HUB}/${slug}`,
      }), 50);
    },
    onError: (e: any) => {
      toast({ title: "Link nije sačuvan", description: e?.message || "Greška na serveru", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/smart-links/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smart-links"] });
      setDeletingLink(null);
      toast({ title: "Link je obrisan" });
    },
    onError: () => toast({ title: "Brisanje nije uspelo", variant: "destructive" }),
  });

  async function handleAutoFill() {
    if (!autoUrl.trim() || autoFillPending) return;
    setAutoFillPending(true);
    try {
      const token = localStorage.getItem("auth_token");
      const r = await fetch("/api/admin/smart-links/fetch-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: autoUrl.trim() }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error ?? "Pesma nije pronađena");
      const next: FormState = {
        ...form,
        title: data.title || form.title,
        artist: data.artist || form.artist,
        coverUrl: data.coverUrl || form.coverUrl,
        slug: slugTouched ? form.slug : slugify(data.title || form.title),
      };
      let found = 0;
      for (const p of PLATFORMS) {
        if (data[p.key]) { next[p.key] = data[p.key]; found++; }
      }
      setForm(next);
      setAutoUrl("");
      toast({ title: `Pronađeno platformi: ${found}`, description: "Proverite podatke pre čuvanja." });
    } catch (e: any) {
      toast({ title: "Pretraga nije uspela", description: e.message ?? "Nije moguće pronaći pesmu", variant: "destructive" });
    } finally {
      setAutoFillPending(false);
    }
  }

  function openCreate() {
    setForm(emptyForm); setEditingId(null); setSlugTouched(false); setAutoUrl(""); setOpen(true);
  }
  function openEdit(l: SmartLinkWithStats) {
    setForm({
      slug: l.slug, title: l.title, artist: l.artist, coverUrl: l.coverUrl ?? "",
      spotifyUrl: l.spotifyUrl ?? "", youtubeUrl: l.youtubeUrl ?? "", appleMusicUrl: l.appleMusicUrl ?? "",
      soundcloudUrl: l.soundcloudUrl ?? "", tidalUrl: l.tidalUrl ?? "", deezerUrl: l.deezerUrl ?? "",
    });
    setEditingId(l.id); setSlugTouched(true); setAutoUrl(""); setOpen(true);
  }
  function closeDialog() { setOpen(false); setForm(emptyForm); setEditingId(null); setSlugTouched(false); setAutoUrl(""); }

  function openAssign(link: SmartLinkWithStats) {
    setSelectedUserId(link.userId != null ? String(link.userId) : "null");
    setAssigningLink(link);
  }

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const token = localStorage.getItem("auth_token");
      const r = await fetch("/api/upload/smart-link-cover", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error ?? "Otpremanje nije uspelo");
      setForm({ ...form, coverUrl: data.url });
    } catch (e: any) {
      toast({ title: "Cover nije otpremljen", description: e.message, variant: "destructive" });
    } finally { setUploading(false); }
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`https://${HUB}/${slug}`);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(s => (s === slug ? null : s)), 1600);
  }

  const filledPlatforms = PLATFORMS.filter(p => form[p.key].trim()).length;
  const slugTaken = !!links?.some(l => l.slug === form.slug && l.id !== editingId);
  const canSave = !!form.title.trim() && !!form.artist.trim() && !!form.slug && !slugTaken && !saveMutation.isPending;

  return (
    <>
      {/* ── Create / edit modal ──────────────────────────────────────────── */}
      <Modal open={open} onClose={closeDialog} themed wide>
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border">
          <div>
            <h2 className="text-base font-semibold">{editingId !== null ? "Uredi smart link" : "Novi smart link"}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {editingId !== null ? "Izmene se odmah vide na javnoj stranici." : "Jedna adresa koja vodi na sve platforme."}
            </p>
          </div>
          <button
            type="button" onClick={closeDialog} aria-label="Zatvori"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-6">
          {/* Auto-fill */}
          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Wand2 className="w-4 h-4 text-primary" />
              <p className="text-sm font-medium">Popuni automatski</p>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Nalepite link pesme sa bilo koje platforme - naslov, izvođač, cover i ostale platforme se popunjavaju same.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="https://open.spotify.com/track/..."
                value={autoUrl}
                onChange={e => setAutoUrl(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAutoFill(); } }}
                className="h-9 text-sm"
              />
              <Button
                type="button" size="sm" variant="secondary" onClick={handleAutoFill}
                aria-busy={autoFillPending}
                className={`shrink-0 h-9 ${!autoUrl.trim() || autoFillPending ? "opacity-50 pointer-events-none" : ""}`}
              >
                {autoFillPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                {autoFillPending ? "Tražim..." : "Pronađi"}
              </Button>
            </div>
          </div>

          {/* Cover + basics */}
          <div className="flex gap-4">
            <div className="shrink-0">
              <div
                role="button" tabIndex={0} aria-label="Promeni cover sliku"
                className="relative w-28 h-28 rounded-xl overflow-hidden cursor-pointer group border border-border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => fileRef.current?.click()}
                onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
              >
                {form.coverUrl ? (
                  <>
                    <img src={form.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Upload className="w-5 h-5 text-white" />}
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Upload className="w-5 h-5" /><span className="text-[11px]">Otpremi cover</span></>}
                  </div>
                )}
              </div>
              {form.coverUrl && (
                <button
                  type="button" onClick={() => setForm({ ...form, coverUrl: "" })}
                  className="mt-1.5 w-full text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Ukloni cover
                </button>
              )}
              <input
                ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }}
              />
            </div>

            <div className="flex-1 min-w-0 space-y-3">
              <Field label="Naslov pesme">
                <Input
                  placeholder="Naslov" value={form.title} className="h-9"
                  onChange={e => {
                    const title = e.target.value;
                    setForm({ ...form, title, slug: slugTouched ? form.slug : slugify(title) });
                  }}
                />
              </Field>
              <Field label="Izvođač">
                <Input placeholder="Ime izvođača" value={form.artist} className="h-9" onChange={e => setForm({ ...form, artist: e.target.value })} />
              </Field>
            </div>
          </div>

          {/* Slug */}
          <Field
            label="Adresa"
            hint={slugTaken ? <span className="text-destructive">Ova adresa je već zauzeta.</span> : !slugTouched && form.slug ? "Pravi se iz naslova dok je ne izmenite." : undefined}
          >
            <div className={`flex items-center h-9 rounded-md border bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring ${slugTaken ? "border-destructive" : "border-input"}`}>
              <span className="pl-3 pr-1 text-xs font-mono text-muted-foreground shrink-0 select-none">{HUB}/</span>
              <input
                type="text" placeholder="naziv-pesme" value={form.slug}
                onChange={e => { setSlugTouched(true); setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }); }}
                className="flex-1 min-w-0 h-full pr-3 text-xs font-mono bg-transparent outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </Field>

          {/* Cover URL - for pasting an existing image link */}
          <Field label="Cover kao link" hint="Opcionalno, ako slika već postoji negde na internetu.">
            <Input type="url" placeholder="https://..." value={form.coverUrl} className="h-9" onChange={e => setForm({ ...form, coverUrl: e.target.value })} />
          </Field>

          {/* Platforms */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <p className="text-xs font-medium text-muted-foreground">Platforme</p>
              <p className="text-xs font-mono text-muted-foreground">{filledPlatforms}/{PLATFORMS.length}</p>
            </div>
            <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
              {PLATFORMS.map(p => {
                const val = form[p.key];
                return (
                  <label key={p.key} className="flex items-center gap-3 px-3 h-11 bg-background focus-within:bg-muted/40 transition-colors cursor-text">
                    <p.Icon size={15} style={{ color: val ? p.color : undefined }} className={val ? "" : "text-muted-foreground/40"} />
                    <span className="text-xs font-medium w-[5.5rem] shrink-0 text-muted-foreground">{p.label}</span>
                    <input
                      type="url" placeholder={p.placeholder} value={val}
                      onChange={e => setForm({ ...form, [p.key]: e.target.value })}
                      className="flex-1 min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground/40"
                    />
                    {val && (
                      <button
                        type="button" aria-label={`Obriši ${p.label} link`}
                        onClick={() => setForm({ ...form, [p.key]: "" })}
                        className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-card sticky bottom-0">
          <Button type="button" variant="ghost" onClick={closeDialog}>Otkaži</Button>
          <Button
            type="button" aria-busy={saveMutation.isPending}
            onClick={() => canSave && saveMutation.mutate(form)}
            className={!canSave ? "opacity-50 pointer-events-none" : ""}
          >
            {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saveMutation.isPending ? "Čuvam..." : editingId !== null ? "Sačuvaj izmene" : "Napravi link"}
          </Button>
        </div>
      </Modal>

      {/* ── Assign owner modal ──────────────────────────────────────────── */}
      <Modal open={!!assigningLink} onClose={() => setAssigningLink(null)} themed>
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border">
          <div className="min-w-0">
            <h2 className="text-base font-semibold">Dodeli vlasnika</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Vlasnik vidi link na svom nalogu i može da menja cover, naslov i linkove platformi.
            </p>
          </div>
          <button
            type="button" onClick={() => setAssigningLink(null)} aria-label="Zatvori"
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {assigningLink && (
            <div className="flex items-center gap-3">
              <Cover url={assigningLink.coverUrl} title={assigningLink.title} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{assigningLink.title}</p>
                <p className="text-xs text-muted-foreground truncate">{assigningLink.artist}</p>
              </div>
            </div>
          )}
          <Field label="Korisnik">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger><SelectValue placeholder="Izaberite korisnika" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="null">Bez vlasnika</SelectItem>
                {assignableUsers.map(u => <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/30">
          <Button variant="ghost" onClick={() => setAssigningLink(null)}>Otkaži</Button>
          <Button
            aria-busy={assignMutation.isPending}
            className={assignMutation.isPending ? "opacity-60 pointer-events-none" : ""}
            onClick={() => {
              if (!assigningLink) return;
              assignMutation.mutate({ id: assigningLink.id, userId: selectedUserId === "null" ? null : parseInt(selectedUserId, 10) });
            }}
          >
            {assignMutation.isPending ? "Čuvam..." : "Sačuvaj"}
          </Button>
        </div>
      </Modal>

      {/* ── Delete confirm ──────────────────────────────────────────────── */}
      <AlertDialog open={!!deletingLink} onOpenChange={o => { if (!o) setDeletingLink(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Obrisati link?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingLink?.title}" i svi podaci o klikovima biće trajno obrisani. Adresa {HUB}/{deletingLink?.slug} će prestati da radi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Otkaži</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deletingLink && !deleteMutation.isPending) deleteMutation.mutate(deletingLink.id); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Obriši
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Page ─────────────────────────────────────────────────────────── */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Smart linkovi</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Jedna adresa po pesmi na{" "}
              <a href={`https://${HUB}`} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-foreground hover:text-primary underline-offset-4 hover:underline">
                {HUB}
              </a>
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" /> Novi link
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-32 rounded-2xl" />
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : isError ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 px-6 py-10 text-center">
            <p className="text-sm font-medium">Linkovi nisu učitani</p>
            <p className="text-xs text-muted-foreground mt-1">Proverite vezu i osvežite stranicu.</p>
          </div>
        ) : !links?.length ? (
          <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Link2 className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Još nema smart linkova</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              Nalepite link pesme sa Spotify-ja ili YouTube-a i ostale platforme će se pronaći same.
            </p>
            <Button className="mt-5" size="sm" onClick={openCreate}><Plus className="w-3.5 h-3.5" /> Napravi prvi link</Button>
          </div>
        ) : (
          <>
            {/* Overview */}
            <div className="grid gap-3 lg:grid-cols-5">
              <div className="lg:col-span-2 rounded-2xl border border-border bg-card grid grid-cols-3 lg:grid-cols-1 divide-x lg:divide-x-0 lg:divide-y divide-border">
                <Metric label="Linkova" value={links.length} />
                <Metric label="Klikova ukupno" value={totals.clicks} />
                <Metric label="Jedinstvenih posetilaca" value={totals.unique} hint="Po IP adresi" />
              </div>

              <div className="lg:col-span-3 rounded-2xl border border-border bg-card p-5">
                <div className="flex items-baseline justify-between mb-4">
                  <p className="text-sm font-medium">Klikovi po platformi</p>
                  {totals.top && (
                    <p className="hidden sm:block text-xs text-muted-foreground truncate ml-4">
                      Najslušanije: <span className="text-foreground">{totals.top.title}</span>
                    </p>
                  )}
                </div>
                {totals.clicks === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">Klikovi će se pojaviti kad neko otvori link i izabere platformu.</p>
                ) : (
                  <PlatformBars byPlatform={totals.byPlatform} total={totals.clicks} />
                )}
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Pretraga po naslovu, izvođaču ili adresi" value={query}
                  onChange={e => setQuery(e.target.value)} className="pl-9 h-10"
                />
              </div>
              <Select value={sort} onValueChange={v => { setSort(v as SortKey); ssSet("sl_sort", v); }}>
                <SelectTrigger className="sm:w-52 h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Najnovije prvo</SelectItem>
                  <SelectItem value="clicks">Najviše klikova</SelectItem>
                  <SelectItem value="unique">Najviše posetilaca</SelectItem>
                  <SelectItem value="title">Po naslovu (A-Ž)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* List */}
            {visible.length === 0 ? (
              <div className="rounded-2xl border border-border px-6 py-10 text-center">
                <p className="text-sm text-muted-foreground">Nijedan link ne odgovara pretrazi "{query}".</p>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="hidden md:grid grid-cols-[minmax(0,1fr)_9rem_6rem_6rem_8.5rem] gap-4 px-4 py-2.5 border-b border-border text-xs text-muted-foreground">
                  <span>Pesma</span>
                  <span>Platforme</span>
                  <span className="text-right">Klikovi</span>
                  <span className="text-right">Posetioci</span>
                  <span />
                </div>
                <ul className="divide-y divide-border">
                  {visible.map(link => {
                    const expanded = expandedId === link.id;
                    const owner = link.userId != null ? usernameById.get(link.userId) ?? "korisnik" : null;
                    return (
                      <li key={link.id}>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_9rem_6rem_6rem_8.5rem] gap-x-4 gap-y-2 items-center px-4 py-3 hover:bg-muted/30 transition-colors">
                          {/* Song */}
                          <button
                            type="button" onClick={() => setExpandedId(expanded ? null : link.id)}
                            aria-expanded={expanded}
                            className="flex items-center gap-3 min-w-0 text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <Cover url={link.coverUrl} title={link.title} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{link.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {link.artist}
                                {owner && <span className="text-muted-foreground/70"> · vlasnik {owner}</span>}
                              </p>
                              <p className="text-[11px] font-mono text-muted-foreground/70 truncate mt-0.5">/{link.slug}</p>
                            </div>
                          </button>

                          {/* Platforms */}
                          <div className="hidden md:flex items-center gap-1.5">
                            {PLATFORMS.map(p => {
                              const has = !!link[p.key as PlatformKey];
                              return (
                                <span key={p.key} title={has ? p.label : `${p.label} - nije dodat`} className={has ? "" : "opacity-20"}>
                                  <p.Icon size={14} style={has ? { color: p.color } : undefined} />
                                </span>
                              );
                            })}
                          </div>

                          <span className="hidden md:block text-right text-sm font-mono tabular-nums">{nf.format(link.totalClicks)}</span>
                          <span className="hidden md:block text-right text-sm font-mono tabular-nums text-muted-foreground">{nf.format(link.uniqueClicks)}</span>

                          {/* Actions */}
                          <div className="flex items-center justify-end gap-0.5">
                            <IconBtn label={copiedSlug === link.slug ? "Kopirano" : "Kopiraj link"} onClick={() => copyLink(link.slug)}>
                              {copiedSlug === link.slug ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                            </IconBtn>
                            <IconBtn label="Uredi" onClick={() => openEdit(link)}><Pencil className="w-4 h-4" /></IconBtn>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" aria-label="Još opcija" className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                  <a href={`https://${HUB}/${link.slug}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4 mr-2" /> Otvori stranicu
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => openAssign(link)}>
                                  <UserPlus className="w-4 h-4 mr-2" /> {owner ? "Promeni vlasnika" : "Dodeli vlasnika"}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => setDeletingLink(link)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="w-4 h-4 mr-2" /> Obriši
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <IconBtn label={expanded ? "Sakrij detalje" : "Prikaži detalje"} onClick={() => setExpandedId(expanded ? null : link.id)}>
                              <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
                            </IconBtn>
                          </div>

                          {/* Mobile meta line */}
                          <div className="md:hidden col-span-2 flex items-center gap-3 text-xs text-muted-foreground pl-[3.75rem]">
                            <span className="font-mono">{nf.format(link.totalClicks)} klikova</span>
                            <span className="font-mono">{nf.format(link.uniqueClicks)} posetilaca</span>
                            <span className="flex items-center gap-1">
                              {PLATFORMS.filter(p => link[p.key as PlatformKey]).map(p => <p.Icon key={p.key} size={11} style={{ color: p.color }} />)}
                            </span>
                          </div>
                        </div>

                        {expanded && <LinkDetails link={link} owner={owner} onAssign={() => openAssign(link)} />}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────
function LinkDetails({ link, owner, onAssign }: { link: SmartLinkWithStats; owner: string | null; onAssign: () => void }) {
  const missing = PLATFORMS.filter(p => !link[p.key as PlatformKey]);
  return (
    <div className="px-4 pb-5 pt-1 md:pl-[4.75rem] grid gap-6 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] bg-muted/20 border-t border-border/60">
      <div className="pt-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Klikovi po platformi</p>
        {link.totalClicks === 0 ? (
          <p className="text-xs text-muted-foreground">Još niko nije kliknuo ni na jednu platformu.</p>
        ) : (
          <PlatformBars byPlatform={link.clicksByPlatform} total={link.totalClicks} />
        )}
      </div>
      <dl className="pt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Javna adresa</dt>
          <dd>
            <a href={`https://${HUB}/${link.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-xs hover:text-primary break-all">
              {HUB}/{link.slug} <ArrowUpRight className="w-3 h-3 shrink-0" />
            </a>
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Napravljen</dt>
          <dd className="font-mono text-xs">{formatDate(link.createdAt)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Vlasnik</dt>
          <dd className="text-xs">
            {owner ?? "Nema"}{" "}
            <button type="button" onClick={onAssign} className="text-primary hover:underline underline-offset-4 ml-1">
              {owner ? "promeni" : "dodeli"}
            </button>
          </dd>
        </div>
        {missing.length > 0 && (
          <div>
            <dt className="text-xs text-muted-foreground">Nedostaje</dt>
            <dd className="text-xs">{missing.map(p => p.label).join(", ")}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="px-5 py-4">
      <p className="text-2xl font-semibold font-mono tabular-nums tracking-tight">{nf.format(value)}</p>
      <p className="text-xs text-muted-foreground mt-1">
        {label}{hint && <span className="hidden sm:inline text-muted-foreground/60"> · {hint}</span>}
      </p>
    </div>
  );
}

function Cover({ url, title, size = "md" }: { url: string | null; title: string; size?: "sm" | "md" }) {
  const dim = size === "sm" ? "w-10 h-10" : "w-12 h-12";
  return (
    <div className={`${dim} rounded-lg overflow-hidden bg-muted border border-border/60 shrink-0 flex items-center justify-center`}>
      {url ? <img src={url} alt={title} className="w-full h-full object-cover" loading="lazy" /> : <Music2 className="w-4 h-4 text-muted-foreground/50" />}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button" onClick={onClick} title={label} aria-label={label}
      className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

function Field({ label, hint, children }: { label: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground/80">{hint}</p>}
    </div>
  );
}
