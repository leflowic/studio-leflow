import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PanelCard } from "@/components/ui/panel-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Modal } from "@/components/admin/AdminModal";
import { Music2, Edit2, Loader2, Upload, X } from "lucide-react";
import { SiSpotify, SiYoutube, SiApplemusic, SiSoundcloud, SiTidal } from "react-icons/si";
import type { SmartLink } from "@shared/schema";

type OwnedSmartLink = SmartLink;

const PLATFORMS = [
  { key: "spotifyUrl" as const, label: "Spotify", color: "#1DB954", Icon: SiSpotify },
  { key: "youtubeUrl" as const, label: "YouTube", color: "#FF0033", Icon: SiYoutube },
  { key: "appleMusicUrl" as const, label: "Apple Music", color: "#FC3C44", Icon: SiApplemusic },
  { key: "soundcloudUrl" as const, label: "SoundCloud", color: "#FF5500", Icon: SiSoundcloud },
  { key: "tidalUrl" as const, label: "Tidal", color: "#00CFFF", Icon: SiTidal },
];

type FormState = {
  title: string; artist: string; coverUrl: string;
  spotifyUrl: string; youtubeUrl: string; appleMusicUrl: string; soundcloudUrl: string; tidalUrl: string; deezerUrl: string;
};

function toForm(link: OwnedSmartLink): FormState {
  return {
    title: link.title, artist: link.artist, coverUrl: link.coverUrl ?? "",
    spotifyUrl: link.spotifyUrl ?? "", youtubeUrl: link.youtubeUrl ?? "", appleMusicUrl: link.appleMusicUrl ?? "",
    soundcloudUrl: link.soundcloudUrl ?? "", tidalUrl: link.tidalUrl ?? "", deezerUrl: link.deezerUrl ?? "",
  };
}

export function MySmartLinkPanel() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<OwnedSmartLink | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: links, isLoading } = useQuery<OwnedSmartLink[]>({ queryKey: ["/api/user/smart-links"] });

  const saveMutation = useMutation({
    mutationFn: (data: FormState) => apiRequest("PATCH", `/api/user/smart-links/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/smart-links"] });
      setEditing(null);
      toast({ title: "Sačuvano ✓" });
    },
    onError: () => toast({ title: "Greška", description: "Izmene nisu sačuvane", variant: "destructive" }),
  });

  function openEdit(link: OwnedSmartLink) {
    setForm(toForm(link));
    setEditing(link);
  }

  async function uploadCover(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const token = localStorage.getItem("auth_token");
      const r = await fetch("/api/upload/smart-link-cover", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setForm(f => f ? { ...f, coverUrl: data.url } : f);
    } catch (e: any) {
      toast({ title: "Greška", description: e.message ?? "Upload nije uspeo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <PanelCard icon={Music2} iconBg="bg-violet-500/10" iconColor="text-violet-500" title="Moj Smart Link" desc="Upravljaj svojim smart linkom">
        <Skeleton className="h-16 rounded-xl" />
      </PanelCard>
    );
  }

  // Most users don't have an assigned smart link - hide the section entirely
  // rather than showing a permanent empty state.
  if (!links?.length) return null;

  return (
    <>
      <PanelCard
        icon={Music2}
        iconBg="bg-violet-500/10"
        iconColor="text-violet-500"
        title={links.length > 1 ? "Moji Smart Linkovi" : "Moj Smart Link"}
        desc="Menjaj cover i platform linkove za svoju pesmu"
      >
        <div className="space-y-2">
          {links.map(link => (
            <div key={link.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/40 hover:border-border hover:bg-muted/30 transition-all">
              <div className="w-11 h-11 rounded-xl overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                {link.coverUrl ? <img src={link.coverUrl} alt="" className="w-full h-full object-cover" /> : <Music2 className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{link.title}</p>
                <p className="text-xs text-muted-foreground truncate">{link.artist} · music.studioleflow.com/{link.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => openEdit(link)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
                title="Uredi"
                aria-label="Uredi smart link"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </PanelCard>

      <Modal open={!!editing && !!form} onClose={() => setEditing(null)}>
        {form && (
          <>
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <div>
                <h2 className="text-[15px] font-bold text-white">Uredi smart link</h2>
                <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>music.studioleflow.com/{editing?.slug}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} aria-label="Zatvori"
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-white/5 hover:bg-white/10 border border-white/[0.07] shrink-0">
                <X className="w-3.5 h-3.5 text-white/50" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              <div className="flex gap-4">
                <div
                  role="button" tabIndex={0} aria-label="Promeni cover sliku"
                  className="relative w-[88px] h-[88px] rounded-2xl overflow-hidden flex-shrink-0 cursor-pointer group"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
                >
                  {form.coverUrl ? (
                    <>
                      <img src={form.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.6)" }}>
                        {uploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Upload className="w-5 h-5 text-white" />}
                      </div>
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
                  <FormField label="Naslov pesme">
                    <FormInput value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                  </FormField>
                  <FormField label="Izvođač">
                    <FormInput value={form.artist} onChange={e => setForm({ ...form, artist: e.target.value })} />
                  </FormField>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-semibold tracking-[0.12em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.30)" }}>Platforme</p>
                <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
                  {PLATFORMS.map((p, i) => (
                    <div key={p.key} className="flex items-center gap-3 px-4 py-2.5"
                      style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent", borderBottom: i < PLATFORMS.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <span className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${p.color}16` }}>
                        <p.Icon size={12} style={{ color: p.color }} />
                      </span>
                      <span className="text-[11px] font-medium w-24 shrink-0" style={{ color: "rgba(255,255,255,0.50)" }}>{p.label}</span>
                      <input
                        type="url"
                        placeholder={`${p.label} URL...`}
                        value={form[p.key]}
                        onChange={e => setForm({ ...form, [p.key]: e.target.value })}
                        className="flex-1 bg-transparent text-[11.5px] text-white outline-none placeholder:text-white/15 py-0.5"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <button type="button" onClick={() => setEditing(null)}
                className="h-9 px-5 rounded-xl text-[12px] font-medium transition-all active:scale-95 text-white/45 hover:text-white/70 border border-white/[0.08]">
                Otkaži
              </button>
              <button
                type="button"
                onClick={() => saveMutation.mutate(form)}
                disabled={saveMutation.isPending || !form.title || !form.artist}
                className="h-9 px-6 rounded-xl text-[12px] font-semibold text-white flex items-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #6352ff 0%, #8b73ff 100%)", boxShadow: "0 4px 20px rgba(99,82,255,0.4)" }}
              >
                {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saveMutation.isPending ? "Čuvam..." : "Sačuvaj izmene"}
              </button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: "rgba(255,255,255,0.30)" }}>{label}</p>
      {children}
    </div>
  );
}

function FormInput({ value, onChange }: { value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <input
      type="text"
      value={value}
      onChange={onChange}
      className="w-full h-9 px-3 rounded-xl text-[12px] text-white outline-none placeholder:text-white/20 transition-colors bg-white/5 border border-white/[0.08] focus:border-[#6352ff]/50"
    />
  );
}
