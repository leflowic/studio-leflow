import { useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PanelCard } from "@/components/ui/panel-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/admin/AdminModal";
import { Music2, Pencil, Loader2, Upload, X, Copy, Check, Share2, ArrowUpRight } from "lucide-react";
import {
  SMART_LINK_PLATFORMS as PLATFORMS, SMART_LINK_HUB as HUB, PlatformBars, nfSr,
  type SmartLinkPlatformKey,
} from "@/lib/smart-link-platforms";
import type { SmartLink } from "@shared/schema";

// Owner sees unique (per-IP) numbers only - never raw click totals (owner's preference).
type OwnedSmartLink = SmartLink & { uniqueClicks: number; uniqueByPlatform?: Record<string, number>; weekUnique?: number; prevWeekUnique?: number };

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

function pluralPosetilac(n: number) {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return "posetilac";
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "posetioca";
  return "posetilaca";
}

export function MySmartLinkPanel() {
  const { toast } = useToast();
  const [editing, setEditing] = useState<OwnedSmartLink | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: links, isLoading } = useQuery<OwnedSmartLink[]>({ queryKey: ["/api/user/smart-links"] });

  const saveMutation = useMutation({
    mutationFn: (data: FormState) => {
      const clean: Record<string, string | null> = { ...data };
      for (const p of PLATFORMS) if (!clean[p.key]?.trim()) clean[p.key] = null;
      if (!clean.coverUrl) clean.coverUrl = null;
      return apiRequest("PATCH", `/api/user/smart-links/${editing!.id}`, clean);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/smart-links"] });
      setEditing(null);
      toast({ title: "Izmene sačuvane", description: "Već se vide na javnoj stranici." });
    },
    onError: (e: any) => toast({ title: "Izmene nisu sačuvane", description: e?.message || "Pokušajte ponovo.", variant: "destructive" }),
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
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error ?? "Otpremanje nije uspelo");
      setForm(f => f ? { ...f, coverUrl: data.url } : f);
    } catch (e: any) {
      toast({ title: "Cover nije otpremljen", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <PanelCard icon={Music2} iconBg="bg-primary/10" iconColor="text-primary" title="Moj smart link">
        <Skeleton className="h-28 rounded-xl" />
      </PanelCard>
    );
  }

  // Most users don't have an assigned smart link - hide the section entirely
  // rather than showing a permanent empty state.
  if (!links?.length) return null;

  const filled = form ? PLATFORMS.filter(p => form[p.key].trim()).length : 0;

  return (
    <>
      <PanelCard
        icon={Music2}
        iconBg="bg-primary/10"
        iconColor="text-primary"
        title={links.length > 1 ? "Moji smart linkovi" : "Moj smart link"}
        desc="Jedna adresa za sve platforme - delite nju umesto pojedinačnih linkova"
        bodyClassName="p-0"
      >
        <ul className="divide-y divide-border/60">
          {links.map(link => <LinkItem key={link.id} link={link} onEdit={() => openEdit(link)} />)}
        </ul>
      </PanelCard>

      <Modal open={!!editing && !!form} onClose={() => setEditing(null)} themed wide>
        {form && editing && (
          <>
            <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-4 border-b border-border">
              <div className="min-w-0">
                <h2 className="text-base font-semibold">Uredi smart link</h2>
                <p className="text-xs font-mono text-muted-foreground mt-0.5 truncate">{HUB}/{editing.slug}</p>
              </div>
              <button
                type="button" onClick={() => setEditing(null)} aria-label="Zatvori"
                className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-6">
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
                  <p className="mt-1.5 text-[11px] text-muted-foreground text-center">Kvadratna slika</p>
                  <input
                    ref={fileRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }}
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                  <Field label="Naslov pesme">
                    <Input value={form.title} className="h-9" onChange={e => setForm({ ...form, title: e.target.value })} />
                  </Field>
                  <Field label="Izvođač">
                    <Input value={form.artist} className="h-9" onChange={e => setForm({ ...form, artist: e.target.value })} />
                  </Field>
                </div>
              </div>

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Platforme</p>
                  <p className="text-xs font-mono text-muted-foreground">{filled}/{PLATFORMS.length}</p>
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
                <p className="text-[11px] text-muted-foreground mt-2">
                  Adresa linka ostaje ista, pa svuda gde ste je već podelili i dalje radi.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-border bg-card sticky bottom-0">
              <Button type="button" variant="ghost" onClick={() => setEditing(null)}>Otkaži</Button>
              <Button
                type="button" aria-busy={saveMutation.isPending}
                className={saveMutation.isPending || !form.title.trim() || !form.artist.trim() ? "opacity-50 pointer-events-none" : ""}
                onClick={() => saveMutation.mutate(form)}
              >
                {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {saveMutation.isPending ? "Čuvam..." : "Sačuvaj izmene"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

function LinkItem({ link, onEdit }: { link: OwnedSmartLink; onEdit: () => void }) {
  const [copied, setCopied] = useState(false);
  const url = `https://${HUB}/${link.slug}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const missing = PLATFORMS.filter(p => !link[p.key as SmartLinkPlatformKey]);
  const byPlatform = link.uniqueByPlatform ?? {};
  const platformSum = Object.values(byPlatform).reduce((a, b) => a + b, 0);

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  async function share() {
    try { await navigator.share({ title: `${link.title} - ${link.artist}`, url }); } catch { /* user cancelled */ }
  }

  return (
    <li className="p-5 sm:p-6 space-y-5">
      {/* Identity + number */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted border border-border/60 shrink-0 flex items-center justify-center">
          {link.coverUrl ? <img src={link.coverUrl} alt={link.title} className="w-full h-full object-cover" /> : <Music2 className="w-6 h-6 text-muted-foreground/50" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{link.title}</p>
          <p className="text-sm text-muted-foreground truncate">{link.artist}</p>
          <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 mt-1 text-xs font-mono text-muted-foreground hover:text-primary max-w-full">
            <span className="truncate">{HUB}/{link.slug}</span>
            <ArrowUpRight className="w-3 h-3 shrink-0" />
          </a>
        </div>
        <div className="text-right shrink-0">
          <p className="text-2xl font-semibold font-mono tabular-nums leading-none">{nfSr.format(link.uniqueClicks)}</p>
          <p className="text-xs text-muted-foreground mt-1">{pluralPosetilac(link.uniqueClicks)}</p>
          {typeof link.weekUnique === "number" && (
            <p className="text-xs text-muted-foreground mt-2">
              Ove nedelje <span className="font-mono text-foreground">{nfSr.format(link.weekUnique)}</span>
              {(link.prevWeekUnique ?? 0) > 0 && (() => {
                const diff = link.weekUnique! - link.prevWeekUnique!;
                return <span className={`font-mono ml-1 ${diff >= 0 ? "text-primary" : ""}`}>{diff >= 0 ? "+" : ""}{diff}</span>;
              })()}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={copy}>
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Kopirano" : "Kopiraj link"}
        </Button>
        {canShare && (
          <Button size="sm" variant="outline" onClick={share}>
            <Share2 className="w-3.5 h-3.5" /> Podeli
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={onEdit}>
          <Pencil className="w-3.5 h-3.5" /> Uredi
        </Button>
      </div>

      {/* Where people listen */}
      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Gde vas slušaju</p>
        {platformSum === 0 ? (
          <p className="text-xs text-muted-foreground">
            Još nema poseta. Stavite link u bio na Instagramu ili u opis videa - ovde ćete videti koju platformu ljudi biraju.
          </p>
        ) : (
          <PlatformBars byPlatform={byPlatform} total={platformSum} unitLabel="Posetioci po platformi" />
        )}
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
          {missing.length > 0 ? (
            <p>
              Nedostaje: <span className="text-foreground">{missing.map(p => p.label).join(", ")}</span>.{" "}
              <button type="button" onClick={onEdit} className="text-primary hover:underline underline-offset-4">Dodajte link</button>
            </p>
          ) : <span />}
          <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-foreground underline-offset-4 hover:underline">
            Instagram story sa QR kodom pravite na stranici linka
          </a>
      </div>
    </li>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}
