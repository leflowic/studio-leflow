import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Link2, Plus, Trash2, Edit2, Copy, ExternalLink, Music2,
  Upload, X, Sparkles, Loader2, MousePointerClick, TrendingUp, UserPlus, Users,
} from "lucide-react";
import { SiSpotify, SiYoutube, SiApplemusic, SiSoundcloud, SiTidal } from "react-icons/si";
import { Modal } from "./AdminModal";
import type { SmartLink } from "@shared/schema";

type SmartLinkWithStats = SmartLink & { totalClicks: number; clicksByPlatform: Record<string, number>; uniqueClicks: number };

const PLATFORMS = [
  { key: "spotifyUrl", label: "Spotify", color: "#1DB954", clickKey: "spotify", Icon: SiSpotify },
  { key: "youtubeUrl", label: "YouTube", color: "#FF0033", clickKey: "youtube", Icon: SiYoutube },
  { key: "appleMusicUrl", label: "Apple Music", color: "#FC3C44", clickKey: "apple_music", Icon: SiApplemusic },
  { key: "soundcloudUrl", label: "SoundCloud", color: "#FF5500", clickKey: "soundcloud", Icon: SiSoundcloud },
  { key: "tidalUrl", label: "Tidal", color: "#00CFFF", clickKey: "tidal", Icon: SiTidal },
  {
    key: "deezerUrl", label: "Deezer", color: "#9B59FF", clickKey: "deezer",
    Icon: () => <svg viewBox="0 0 24 24" fill="currentColor" width={13} height={13}><path d="M18.81 11.834h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0 6.967h3.19v1.969h-3.19zm-4.271 3.483h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm-4.27 10.45h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm-4.271 6.967h3.19v1.969H6v-1.969zm0-3.483h3.19v1.969H6v-1.969zm-4.27 3.483H5v1.969H1.73v-1.969z" /></svg>,
  },
] as const;

const emptyForm = {
  slug: "", title: "", artist: "", coverUrl: "",
  spotifyUrl: "", youtubeUrl: "", appleMusicUrl: "",
  soundcloudUrl: "", tidalUrl: "", deezerUrl: "",
};

function slugify(t: string) {
  return t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

// ── sessionStorage helpers ────────────────────────────────────────────────────
function ssGet<T>(key: string, fallback: T): T {
  try { const v = sessionStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function ssSet(key: string, val: unknown) { try { sessionStorage.setItem(key, JSON.stringify(val)); } catch {} }

// ── Main component ────────────────────────────────────────────────────────────
export function SmartLinksTab() {
  const { toast } = useToast();
  const [form, setFormRaw] = useState<typeof emptyForm>(() => ssGet("sl_form", emptyForm));
  const [editingId, setEditingIdRaw] = useState<number | null>(() => ssGet("sl_editing_id", null));
  const [open, setOpenRaw] = useState(() => ssGet("sl_open", false));
  const [uploading, setUploading] = useState(false);
  const [autoUrl, setAutoUrl] = useState("");
  const [autoFillPending, setAutoFillPending] = useState(false);
  const [assigningLink, setAssigningLink] = useState<SmartLinkWithStats | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>("null");
  const fileRef = useRef<HTMLInputElement>(null);

  const setForm = (f: typeof emptyForm) => { ssSet("sl_form", f); setFormRaw(f); };
  const setEditingId = (id: number | null) => { ssSet("sl_editing_id", id); setEditingIdRaw(id); };
  const setOpen = (v: boolean) => { ssSet("sl_open", v); setOpenRaw(v); };

  useEffect(() => {
    console.log("[SmartLinks] MOUNTED - open:", ssGet("sl_open", false));
    return () => console.log("[SmartLinks] UNMOUNTED");
  }, []);

  const { data: links, isLoading } = useQuery<SmartLinkWithStats[]>({ queryKey: ["/api/admin/smart-links"] });
  const totalClicks = links?.reduce((s, l) => s + l.totalClicks, 0) ?? 0;
  const totalUniqueClicks = links?.reduce((s, l) => s + l.uniqueClicks, 0) ?? 0;

  const { data: assignableUsers = [] } = useQuery<Array<{ id: number; username: string }>>({
    queryKey: ["/api/admin/smart-links/assignable-users"],
  });

  const assignMutation = useMutation({
    mutationFn: ({ id, userId }: { id: number; userId: number | null }) =>
      apiRequest("PATCH", `/api/admin/smart-links/${id}`, { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smart-links"] });
      setAssigningLink(null);
      toast({ title: "Vlasnik ažuriran ✓" });
    },
    onError: () => toast({ title: "Greška pri dodeli korisnika", variant: "destructive" }),
  });

  function openAssign(link: SmartLinkWithStats) {
    setSelectedUserId(link.userId != null ? String(link.userId) : "null");
    setAssigningLink(link);
  }

  const saveMutation = useMutation({
    mutationFn: async (data: typeof emptyForm) => {
      const clean: Record<string, string | null> = { ...data };
      for (const k of ["spotifyUrl", "youtubeUrl", "appleMusicUrl", "soundcloudUrl", "tidalUrl", "deezerUrl"])
        if (!clean[k]) clean[k] = null;
      return editingId !== null
        ? apiRequest("PATCH", `/api/admin/smart-links/${editingId}`, clean)
        : apiRequest("POST", "/api/admin/smart-links", clean);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/smart-links"] });
      const wasEditing = editingId !== null;
      closeDialog();
      setTimeout(() => toast({ title: wasEditing ? "Link ažuriran ✓" : "Link kreiran ✓" }), 50);
    },
    onError: async (e: any) => {
      const msg = await e?.response?.json?.().catch(() => null);
      toast({ title: "Greška", description: msg?.error ?? "Greška na serveru", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/smart-links/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/smart-links"] }); toast({ title: "Obrisano" }); },
    onError: () => toast({ title: "Greška pri brisanju", variant: "destructive" }),
  });

  async function handleAutoFill() {
    if (!autoUrl || autoFillPending) return;
    setAutoFillPending(true);
    try {
      const token = localStorage.getItem("auth_token");
      const r = await fetch("/api/admin/smart-links/fetch-meta", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ url: autoUrl }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Greška");
      setForm({
        ...form,
        title: data.title || form.title,
        artist: data.artist || form.artist,
        coverUrl: data.coverUrl || form.coverUrl,
        slug: form.slug || slugify(data.title || ""),
        spotifyUrl: data.spotifyUrl || form.spotifyUrl,
        youtubeUrl: data.youtubeUrl || form.youtubeUrl,
        appleMusicUrl: data.appleMusicUrl || form.appleMusicUrl,
        soundcloudUrl: data.soundcloudUrl || form.soundcloudUrl,
        tidalUrl: data.tidalUrl || form.tidalUrl,
        deezerUrl: data.deezerUrl || form.deezerUrl,
      });
      setAutoUrl("");
      toast({ title: "Pronađeno!", description: "Proveri podatke i sačuvaj." });
    } catch (e: any) {
      toast({ title: "Greška", description: e.message ?? "Nije moguće pronaći pesmu", variant: "destructive" });
    } finally {
      setAutoFillPending(false);
    }
  }

  function openCreate() { setForm(emptyForm); setEditingId(null); setAutoUrl(""); setOpen(true); }
  function openEdit(l: SmartLinkWithStats) {
    setForm({ slug: l.slug, title: l.title, artist: l.artist, coverUrl: l.coverUrl ?? "", spotifyUrl: l.spotifyUrl ?? "", youtubeUrl: l.youtubeUrl ?? "", appleMusicUrl: l.appleMusicUrl ?? "", soundcloudUrl: l.soundcloudUrl ?? "", tidalUrl: l.tidalUrl ?? "", deezerUrl: l.deezerUrl ?? "" });
    setEditingId(l.id); setAutoUrl(""); setOpen(true);
  }
  function closeDialog() { setOpen(false); setForm(emptyForm); setEditingId(null); setAutoUrl(""); }

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const token = localStorage.getItem("auth_token");
      const r = await fetch("/api/upload/smart-link-cover", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setForm({ ...form, coverUrl: data.url });
    } catch (e: any) {
      toast({ title: "Greška", description: e.message ?? "Upload nije uspeo", variant: "destructive" });
    } finally { setUploading(false); }
  }

  function copyLink(slug: string) {
    navigator.clipboard.writeText(`https://music.studioleflow.com/${slug}`);
    toast({ title: "Link kopiran!" });
  }

  return (
    <>
      {/* ── Modal ─────────────────────────────────────────────────────────── */}
      <Modal open={open} onClose={closeDialog}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <h2 className="text-[15px] font-bold text-white">
              {editingId !== null ? "Uredi smart link" : "Novi smart link"}
            </h2>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              {editingId !== null ? "Izmeni podatke i sačuvaj" : "Dodaj pesmu na sve platforme odjednom"}
            </p>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            aria-label="Zatvori"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-white/5 hover:bg-white/10 border border-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b73ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Auto-fill */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(99,82,255,0.10) 0%, rgba(99,82,255,0.04) 100%)", border: "1px solid rgba(99,82,255,0.18)" }}>
            <div className="flex items-center gap-2 px-4 py-2.5 border-b" style={{ borderColor: "rgba(99,82,255,0.12)" }}>
              <Sparkles className="w-3.5 h-3.5" style={{ color: "rgba(160,148,255,0.9)" }} />
              <span className="text-[11px] font-semibold tracking-wide" style={{ color: "rgba(160,148,255,0.9)" }}>AUTO-POPUNI</span>
            </div>
            <div className="px-4 py-3.5 space-y-2.5">
              <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.40)" }}>
                Upiši link sa <span style={{ color: "rgba(255,255,255,0.65)" }}>bilo koje platforme</span> i mi ćemo naći sve ostalo.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="https://open.spotify.com/track/..."
                  value={autoUrl}
                  onChange={e => setAutoUrl(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAutoFill(); } }}
                  className="flex-1 h-9 px-3 rounded-xl text-[12px] outline-none text-white placeholder:text-white/20 transition-colors bg-white/[0.06] border border-white/[0.08] focus:border-[#6352ff]/50"
                />
                <button
                  type="button"
                  onClick={handleAutoFill}
                  disabled={!autoUrl || autoFillPending}
                  className="h-9 px-4 rounded-xl text-[12px] font-semibold text-white flex items-center gap-1.5 shrink-0 transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b73ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                  style={{ background: "linear-gradient(135deg, #6352ff, #8b73ff)", boxShadow: "0 4px 16px rgba(99,82,255,0.35)" }}
                >
                  {autoFillPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {autoFillPending ? "Tražim..." : "Nađi"}
                </button>
              </div>
            </div>
          </div>

          {/* Cover + title + artist */}
          <div className="flex gap-4">
            <div
              role="button"
              tabIndex={0}
              aria-label="Promeni cover sliku"
              className="relative w-[88px] h-[88px] rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b73ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
              onClick={() => fileRef.current?.click()}
              onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
            >
              {form.coverUrl ? (
                <>
                  <img src={form.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.6)" }}>
                    <Upload className="w-5 h-5 text-white" />
                  </div>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); setForm({ ...form, coverUrl: "" }); }}
                    aria-label="Ukloni cover"
                    className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all active:scale-90 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b73ff]"
                    style={{ background: "rgba(0,0,0,0.8)" }}
                  >
                    <X className="w-2.5 h-2.5 text-white" />
                  </button>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5">
                  {uploading
                    ? <Loader2 className="w-5 h-5 animate-spin" style={{ color: "rgba(160,148,255,0.8)" }} />
                    : <><Music2 className="w-5 h-5" style={{ color: "rgba(255,255,255,0.2)" }} /><span className="text-[9px] text-center leading-tight" style={{ color: "rgba(255,255,255,0.2)" }}>Cover</span></>
                  }
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }} />

            <div className="flex-1 space-y-2">
              <Field label="Naslov pesme">
                <StyledInput
                  placeholder="Naslov pesme"
                  value={form.title}
                  onChange={e => {
                    const title = e.target.value;
                    setForm({ ...form, title, slug: form.slug || slugify(title) });
                  }}
                />
              </Field>
              <Field label="Izvođač">
                <StyledInput
                  placeholder="Ime izvođača"
                  value={form.artist}
                  onChange={e => setForm({ ...form, artist: e.target.value })}
                />
              </Field>
            </div>
          </div>

          {/* Cover URL */}
          <Field label="Cover URL (opcionalno)">
            <StyledInput
              type="url"
              placeholder="https://..."
              value={form.coverUrl}
              onChange={e => setForm({ ...form, coverUrl: e.target.value })}
            />
          </Field>

          {/* Slug */}
          <Field label="URL slug">
            <div className="flex items-center h-9 rounded-xl overflow-hidden transition-colors"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="px-3 text-[11px] border-r h-full flex items-center shrink-0 font-mono"
                style={{ color: "rgba(160,148,255,0.7)", borderColor: "rgba(255,255,255,0.07)", background: "rgba(99,82,255,0.08)" }}>
                /l/
              </span>
              <input
                type="text"
                placeholder="naziv-pesme"
                value={form.slug}
                onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
                className="flex-1 px-3 text-[12px] bg-transparent outline-none text-white placeholder:text-white/20 font-mono"
              />
            </div>
          </Field>

          {/* Platforms */}
          <div>
            <p className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.30)" }}>Platforme</p>
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              {PLATFORMS.map((p, i) => (
                <div
                  key={p.key}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors"
                  style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderBottom: i < PLATFORMS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}
                >
                  <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${p.color}16` }}>
                    <p.Icon size={12} style={{ color: p.color }} />
                  </span>
                  <span className="text-[11px] font-medium w-24 shrink-0" style={{ color: "rgba(255,255,255,0.50)" }}>{p.label}</span>
                  <input
                    type="url"
                    placeholder={`${p.label} URL...`}
                    value={form[p.key as keyof typeof emptyForm]}
                    onChange={e => setForm({ ...form, [p.key]: e.target.value })}
                    className="flex-1 bg-transparent text-[11.5px] text-white outline-none placeholder:text-white/15 py-0.5"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
          <button
            type="button"
            onClick={closeDialog}
            className="h-9 px-5 rounded-xl text-[12px] font-medium transition-all active:scale-95 text-white/45 hover:text-white/70 border border-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b73ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
          >
            Otkaži
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending || !form.title || !form.artist || !form.slug}
            className="h-9 px-6 rounded-xl text-[12px] font-semibold text-white flex items-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b73ff] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            style={{ background: "linear-gradient(135deg, #6352ff 0%, #8b73ff 100%)", boxShadow: "0 4px 20px rgba(99,82,255,0.4)" }}
          >
            {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saveMutation.isPending ? "Čuvam..." : editingId !== null ? "Sačuvaj izmene" : "Kreiraj link"}
          </button>
        </div>
      </Modal>

      {/* ── Assign owner modal ──────────────────────────────────────────────── */}
      <Modal open={!!assigningLink} onClose={() => setAssigningLink(null)}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <h2 className="text-[15px] font-bold text-white">Dodeli vlasnika</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>
              {assigningLink && `"${assigningLink.title}" - izaberi korisnika koji sme da menja cover i platform linkove`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAssigningLink(null)}
            aria-label="Zatvori"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-white/5 hover:bg-white/10 border border-white/[0.07] shrink-0"
          >
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-2">
          <Label className="text-white/70">Vlasnik</Label>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Izaberi korisnika" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="null">Nijedan (ukloni dodelu)</SelectItem>
              {assignableUsers.map(u => (
                <SelectItem key={u.id} value={String(u.id)}>{u.username}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <Button variant="outline" onClick={() => setAssigningLink(null)}>Otkaži</Button>
          <Button
            disabled={assignMutation.isPending}
            onClick={() => {
              if (!assigningLink) return;
              assignMutation.mutate({ id: assigningLink.id, userId: selectedUserId === "null" ? null : parseInt(selectedUserId) });
            }}
          >
            {assignMutation.isPending ? "Dodeljuje se..." : "Sačuvaj"}
          </Button>
        </div>
      </Modal>

      {/* ── List view ────────────────────────────────────────────────────────── */}
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(99,82,255,0.12)", border: "1px solid rgba(99,82,255,0.15)" }}>
              <Link2 className="w-4 h-4" style={{ color: "rgba(160,148,255,0.9)" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Smart Links</h2>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Jedna pesma - sve platforme</p>
            </div>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-semibold text-white transition-all shadow-[0_4px_16px_rgba(99,82,255,0.35)] hover:shadow-[0_6px_24px_rgba(99,82,255,0.5)] hover:-translate-y-px active:scale-[0.97] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b73ff] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            style={{ background: "linear-gradient(135deg, #6352ff 0%, #8b73ff 100%)" }}
          >
            <Plus className="w-3.5 h-3.5" />
            Novi link
          </button>
        </div>

        {/* Stats */}
        {!!links?.length && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Link2, value: links.length, label: "Smart linkova", color: "rgba(99,82,255,0.12)", iconColor: "rgba(160,148,255,0.9)", borderColor: "rgba(99,82,255,0.15)" },
              { icon: MousePointerClick, value: totalClicks, label: "Ukupno klikova", color: "rgba(34,197,94,0.08)", iconColor: "rgba(74,222,128,0.85)", borderColor: "rgba(34,197,94,0.15)" },
              { icon: Users, value: totalUniqueClicks, label: "Jedinstvenih poseta", color: "rgba(59,130,246,0.08)", iconColor: "rgba(96,165,250,0.9)", borderColor: "rgba(59,130,246,0.15)" },
            ].map(({ icon: Icon, value, label, color, iconColor, borderColor }) => (
              <div key={label} className="rounded-2xl px-5 py-4 flex items-center gap-3" style={{ background: color, border: `1px solid ${borderColor}` }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,0,0,0.2)" }}>
                  <Icon className="w-4 h-4" style={{ color: iconColor }} />
                </div>
                <div>
                  <p className="text-2xl font-black leading-none">{value}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-[88px] rounded-2xl" />)}</div>
        ) : !links?.length ? (
          <div className="rounded-3xl py-16 flex flex-col items-center gap-4 text-center" style={{ border: "1px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)" }}>
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "rgba(99,82,255,0.08)", border: "1px solid rgba(99,82,255,0.12)" }}>
              <Link2 className="w-7 h-7" style={{ color: "rgba(160,148,255,0.4)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold">Nema smart linkova</p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.30)" }}>Kreiraj prvi link i podeli muziku na svim platformama</p>
            </div>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 h-8 px-4 rounded-xl text-[11px] font-semibold mt-1 transition-all active:scale-95 border border-[#6352ff]/25 text-[#a094ff] bg-[#6352ff]/10 hover:bg-[#6352ff]/[0.16] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b73ff] focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Plus className="w-3 h-3" /> Kreiraj prvi
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {links.map(link => (
              <div
                key={link.id}
                className="group rounded-2xl overflow-hidden flex items-stretch transition-all duration-200 bg-white/[0.03] border border-white/[0.06] hover:bg-white/5 hover:border-[#6352ff]/[0.15]"
              >
                {/* Cover */}
                <div className="w-[88px] h-[88px] flex-shrink-0 relative overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>
                  {link.coverUrl
                    ? <img src={link.coverUrl} alt={link.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><Music2 className="w-7 h-7" style={{ color: "rgba(255,255,255,0.12)" }} /></div>
                  }
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to right, transparent 60%, rgba(0,0,0,0.3))" }} />
                </div>

                {/* Info */}
                <div className="flex-1 px-4 py-3 min-w-0 flex flex-col justify-between">
                  <div>
                    <p className="font-bold text-[13px] leading-tight truncate text-white/90">{link.title}</p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{link.artist}</p>
                  </div>
                  <div className="flex items-center gap-2.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg" style={{ color: "rgba(160,148,255,0.7)", background: "rgba(99,82,255,0.10)", border: "1px solid rgba(99,82,255,0.12)" }}>
                      music.studioleflow.com/{link.slug}
                    </span>
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.30)" }} title="Ukupno klikova">
                      <TrendingUp className="w-3 h-3" /> {link.totalClicks}
                    </span>
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: "rgba(255,255,255,0.30)" }} title="Jedinstvenih poseta (po IP adresi)">
                      <Users className="w-3 h-3" /> {link.uniqueClicks}
                    </span>
                    <div className="flex items-center gap-1">
                      {PLATFORMS.filter(p => link[p.key as keyof SmartLink]).map(p => (
                        <div key={p.key} className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} title={p.label} />
                      ))}
                    </div>
                    {link.userId != null && (
                      <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg" style={{ color: "rgba(255,255,255,0.45)", background: "rgba(255,255,255,0.05)" }}>
                        <UserPlus className="w-3 h-3" /> {assignableUsers.find(u => u.id === link.userId)?.username ?? "korisnik"}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col items-center justify-center gap-0.5 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity border-l" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {[
                    { icon: Copy, action: () => copyLink(link.slug), title: "Kopiraj" },
                    { icon: ExternalLink, action: null, href: `https://music.studioleflow.com/${link.slug}`, title: "Otvori" },
                    { icon: Edit2, action: () => openEdit(link), title: "Uredi" },
                    { icon: UserPlus, action: () => openAssign(link), title: "Dodeli vlasnika" },
                  ].map(({ icon: Icon, action, href, title }) => (
                    href ? (
                      <a key={title} href={href} target="_blank" rel="noopener noreferrer"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 transition-all hover:bg-white/[0.08] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b73ff]"
                        title={title}
                        aria-label={title}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button key={title} type="button" onClick={action!}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 transition-all hover:bg-white/[0.08] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b73ff]"
                        title={title}
                        aria-label={title}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </button>
                    )
                  ))}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button type="button"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 transition-all hover:bg-red-500/[0.12] hover:text-red-400/90 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/80"
                        title="Obriši"
                        aria-label="Obriši link"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Obriši link?</AlertDialogTitle>
                        <AlertDialogDescription>"{link.title}" i svi podaci o klikovima biće trajno obrisani.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Otkaži</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => {
                            if (deleteMutation.isPending) return;
                            deleteMutation.mutate(link.id);
                          }}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Obriši
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Tiny helpers ──────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: "rgba(255,255,255,0.30)" }}>{label}</p>
      {children}
    </div>
  );
}

function StyledInput({ type = "text", placeholder, value, onChange }: {
  type?: string; placeholder?: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className="w-full h-9 px-3 rounded-xl text-[12px] text-white outline-none placeholder:text-white/20 transition-colors bg-white/5 border border-white/[0.08] focus:border-[#6352ff]/50"
    />
  );
}
