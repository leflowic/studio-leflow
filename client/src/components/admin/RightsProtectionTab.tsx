import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getAuthToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ShieldCheck, Plus, Trash2, Download, Music2, Image as ImageIcon,
  Upload, X, Loader2, FileSearch, AlertTriangle,
} from "lucide-react";
import { Modal } from "./AdminModal";
import type { RightsProtection } from "@shared/schema";

type RightsProtectionEntry = RightsProtection & { uploadedByUsername: string };

type UploadResult = {
  assetType: "audio" | "image";
  url: string;
  fileHash: string;
  fileSizeBytes: number;
  originalFilename: string;
  mimeType: string;
  fingerprint: number[] | null;
};

type CompareMatch = { id: number; title: string; creatorName: string; exactMatch: boolean; similarity: number };

const emptyForm = {
  title: "",
  creatorName: "",
  clientName: "",
  notes: "",
  claimedCreationDate: "",
};

function ssGet<T>(key: string, fallback: T): T {
  try { const v = sessionStorage.getItem(key); return v !== null ? JSON.parse(v) : fallback; } catch { return fallback; }
}
function ssSet(key: string, val: unknown) { try { sessionStorage.setItem(key, JSON.stringify(val)); } catch {} }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-semibold tracking-[0.1em] uppercase" style={{ color: "rgba(255,255,255,0.30)" }}>{label}</p>
      {children}
    </div>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full h-9 px-3 rounded-xl text-[12px] text-white outline-none placeholder:text-white/20 transition-colors bg-white/5 border border-white/[0.08] focus:border-[#6352ff]/50"
    />
  );
}

function StyledTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={2}
      className="w-full px-3 py-2 rounded-xl text-[12px] text-white outline-none placeholder:text-white/20 transition-colors bg-white/5 border border-white/[0.08] focus:border-[#6352ff]/50 resize-none"
    />
  );
}

export function RightsProtectionTab() {
  const { toast } = useToast();
  const [form, setFormRaw] = useState<typeof emptyForm>(() => ssGet("zp_form", emptyForm));
  const [open, setOpenRaw] = useState(() => ssGet("zp_open", false));
  const [uploadResult, setUploadResultRaw] = useState<UploadResult | null>(() => ssGet("zp_upload", null));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [compareOpen, setCompareOpen] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<{ exactMatch: boolean; matches: CompareMatch[] } | null>(null);
  const compareFileRef = useRef<HTMLInputElement>(null);

  const setForm = (f: typeof emptyForm) => { ssSet("zp_form", f); setFormRaw(f); };
  const setOpen = (v: boolean) => { ssSet("zp_open", v); setOpenRaw(v); };
  const setUploadResult = (v: UploadResult | null) => { ssSet("zp_upload", v); setUploadResultRaw(v); };

  const { data: entries, isLoading } = useQuery<RightsProtectionEntry[]>({ queryKey: ["/api/admin/rights-protection"] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!uploadResult) throw new Error("Fajl nije otpremljen");
      const { fingerprint, url, ...rest } = uploadResult;
      return apiRequest("POST", "/api/admin/rights-protection", {
        ...rest,
        fileUrl: url,
        title: form.title,
        creatorName: form.creatorName,
        clientName: form.clientName || null,
        notes: form.notes || null,
        claimedCreationDate: form.claimedCreationDate || null,
        fingerprint,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rights-protection"] });
      closeDialog();
      toast({ title: "Evidencija sačuvana ✓" });
    },
    onError: async (e: any) => {
      const msg = await e?.response?.json?.().catch(() => null);
      toast({ title: "Greška", description: msg?.error ?? "Greška na serveru", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/rights-protection/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/admin/rights-protection"] }); toast({ title: "Obrisano" }); },
    onError: () => toast({ title: "Greška pri brisanju", variant: "destructive" }),
  });

  function openCreate() { setForm(emptyForm); setUploadResult(null); setOpen(true); }
  function closeDialog() { setOpen(false); setForm(emptyForm); setUploadResult(null); }

  async function uploadFile(file: File) {
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const token = getAuthToken();
      const r = await fetch("/api/upload/rights-protection-file", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setUploadResult(data);
    } catch (e: any) {
      toast({ title: "Greška", description: e.message ?? "Upload nije uspeo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  async function handleDownloadCertificate(entry: RightsProtectionEntry) {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/admin/rights-protection/${entry.id}/certificate`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("Download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sertifikat_${entry.certificateNumber.replace(/-/g, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: "Greška", description: "Greška pri preuzimanju sertifikata", variant: "destructive" });
    }
  }

  async function handleCompare(file: File) {
    setComparing(true);
    setCompareResult(null);
    try {
      const fd = new FormData(); fd.append("file", file);
      const token = getAuthToken();
      const r = await fetch("/api/admin/rights-protection/compare", { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      setCompareResult(data);
    } catch (e: any) {
      toast({ title: "Greška", description: e.message ?? "Poređenje nije uspelo", variant: "destructive" });
    } finally {
      setComparing(false);
    }
  }

  return (
    <>
      <Modal open={open} onClose={closeDialog}>
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <h2 className="text-[15px] font-bold text-white">Nova evidencija</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Otpremi pesmu ili logo i evidentiraj dokaz</p>
          </div>
          <button type="button" onClick={closeDialog} aria-label="Zatvori"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-white/5 hover:bg-white/10 border border-white/[0.07]">
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div
            role="button"
            tabIndex={0}
            className="rounded-2xl overflow-hidden cursor-pointer"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)" }}
            onClick={() => fileRef.current?.click()}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
          >
            <div className="px-4 py-5 flex flex-col items-center gap-2 text-center">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(160,148,255,0.8)" }} />
              ) : uploadResult ? (
                <>
                  {uploadResult.assetType === "audio" ? <Music2 className="w-6 h-6 text-emerald-400" /> : <ImageIcon className="w-6 h-6 text-emerald-400" />}
                  <p className="text-[12px] font-semibold text-white/80">{uploadResult.originalFilename}</p>
                  <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {uploadResult.assetType === "audio" && uploadResult.fingerprint === null
                      ? "Otisak nije uspeo (hash i dalje važi)"
                      : "Fajl otpremljen, hash izračunat"}
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6" style={{ color: "rgba(255,255,255,0.25)" }} />
                  <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>Klikni da otpremiš MP3 ili PNG/JPG</p>
                </>
              )}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="audio/mpeg,image/png,image/jpeg" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ""; }} />

          <Field label="Naslov">
            <StyledInput placeholder="Naziv pesme ili loga" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Autor / vlasnik">
            <StyledInput placeholder="Ime izvođača ili vlasnika brenda" value={form.creatorName} onChange={e => setForm({ ...form, creatorName: e.target.value })} />
          </Field>
          <Field label="Ime klijenta (opciono)">
            <StyledInput placeholder="Strana na koju se evidencija odnosi" value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })} />
          </Field>
          <Field label="Tvrđeni datum nastanka (opciono)">
            <StyledInput type="date" value={form.claimedCreationDate} onChange={e => setForm({ ...form, claimedCreationDate: e.target.value })} />
          </Field>
          <Field label="Napomena (opciono)">
            <StyledTextarea placeholder="Npr. dokaz da je logo objavljen na Facebook stranici 2020, link..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </Field>

          <p className="text-[10.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.30)" }}>
            Ovo je interna evidencija - ne zamenjuje zvaničnu registraciju autorskih prava. Tvrđeni datum nastanka je tvoja izjava, ne nešto što hash sam po sebi dokazuje.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 shrink-0 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
          <button type="button" onClick={closeDialog}
            className="h-9 px-5 rounded-xl text-[12px] font-medium transition-all active:scale-95 text-white/45 hover:text-white/70 border border-white/[0.08]">
            Otkaži
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !uploadResult || !form.title || !form.creatorName}
            className="h-9 px-6 rounded-xl text-[12px] font-semibold text-white flex items-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #6352ff 0%, #8b73ff 100%)", boxShadow: "0 4px 20px rgba(99,82,255,0.4)" }}
          >
            {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saveMutation.isPending ? "Čuvam..." : "Sačuvaj evidenciju"}
          </button>
        </div>
      </Modal>

      <Modal open={compareOpen} onClose={() => { setCompareOpen(false); setCompareResult(null); }}>
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b shrink-0" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <h2 className="text-[15px] font-bold text-white">Uporedi snimak</h2>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.35)" }}>Otpremi sumnjiv MP3 i uporedi sa arhivom</p>
          </div>
          <button type="button" onClick={() => { setCompareOpen(false); setCompareResult(null); }} aria-label="Zatvori"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-white/5 hover:bg-white/10 border border-white/[0.07]">
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div
            role="button"
            tabIndex={0}
            className="rounded-2xl overflow-hidden cursor-pointer"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)" }}
            onClick={() => compareFileRef.current?.click()}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); compareFileRef.current?.click(); } }}
          >
            <div className="px-4 py-5 flex flex-col items-center gap-2 text-center">
              {comparing ? <Loader2 className="w-6 h-6 animate-spin" style={{ color: "rgba(160,148,255,0.8)" }} /> : (
                <>
                  <FileSearch className="w-6 h-6" style={{ color: "rgba(255,255,255,0.25)" }} />
                  <p className="text-[12px]" style={{ color: "rgba(255,255,255,0.45)" }}>Klikni da otpremiš sumnjiv MP3</p>
                </>
              )}
            </div>
          </div>
          <input ref={compareFileRef} type="file" accept="audio/mpeg" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCompare(f); e.target.value = ""; }} />

          {compareResult && (
            <div className="space-y-2">
              {compareResult.matches.length === 0 ? (
                <p className="text-[12px] text-center py-4" style={{ color: "rgba(255,255,255,0.35)" }}>Nema podudaranja u arhivi.</p>
              ) : compareResult.matches.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-white/85 truncate">{m.title}</p>
                    <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{m.creatorName}</p>
                  </div>
                  {m.exactMatch ? (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0" style={{ background: "rgba(239,68,68,0.15)", color: "rgba(248,113,113,0.95)" }}>Isti fajl</span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0" style={{ background: "rgba(99,82,255,0.12)", color: "rgba(160,148,255,0.9)" }}>{m.similarity}% sličnost</span>
                  )}
                </div>
              ))}
              <p className="text-[10px] leading-relaxed flex items-start gap-1.5 pt-1" style={{ color: "rgba(255,255,255,0.30)" }}>
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                Procenat sličnosti je orijentacioni (heuristička analiza), ne pravni dokaz sam po sebi - samo egzaktno podudaranje heša je neoboriv dokaz istog fajla.
              </p>
            </div>
          )}
        </div>
      </Modal>

      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(99,82,255,0.12)", border: "1px solid rgba(99,82,255,0.15)" }}>
              <ShieldCheck className="w-4 h-4" style={{ color: "rgba(160,148,255,0.9)" }} />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Zaštita prava</h2>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Interna evidencija - hash, vreme i otisak zvuka</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setCompareOpen(true); setCompareResult(null); }}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97] border border-white/[0.08] text-white/70 hover:bg-white/5">
              <FileSearch className="w-3.5 h-3.5" />
              Uporedi snimak
            </button>
            <button type="button" onClick={openCreate}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-semibold text-white transition-all shadow-[0_4px_16px_rgba(99,82,255,0.35)] hover:-translate-y-px active:scale-[0.97]"
              style={{ background: "linear-gradient(135deg, #6352ff 0%, #8b73ff 100%)" }}>
              <Plus className="w-3.5 h-3.5" />
              Nova evidencija
            </button>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed rounded-2xl px-4 py-3" style={{ color: "rgba(255,255,255,0.40)", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)" }}>
          Ovaj alat pravi internu, vremenski overenu evidenciju (SHA-256 heš + datum) za pesme i brend materijal (logo). Ne zamenjuje zvaničnu registraciju autorskih prava kod SOKOJ-a.
        </p>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}</div>
        ) : !entries?.length ? (
          <div className="rounded-3xl py-16 flex flex-col items-center gap-4 text-center" style={{ border: "1px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.01)" }}>
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "rgba(99,82,255,0.08)", border: "1px solid rgba(99,82,255,0.12)" }}>
              <ShieldCheck className="w-7 h-7" style={{ color: "rgba(160,148,255,0.4)" }} />
            </div>
            <div>
              <p className="text-sm font-semibold">Nema evidencija</p>
              <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.30)" }}>Dodaj prvu pesmu ili logo za zaštitu</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {entries.map(entry => (
              <div key={entry.id} className="group rounded-2xl overflow-hidden flex items-stretch transition-all duration-200 bg-white/[0.03] border border-white/[0.06] hover:bg-white/5">
                <div className="w-[56px] flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.03)" }}>
                  {entry.assetType === "audio" ? <Music2 className="w-5 h-5 text-white/25" /> : <ImageIcon className="w-5 h-5 text-white/25" />}
                </div>
                <div className="flex-1 px-4 py-3 min-w-0">
                  <p className="font-bold text-[13px] leading-tight truncate text-white/90">{entry.title}</p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: "rgba(255,255,255,0.40)" }}>{entry.creatorName}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg" style={{ color: "rgba(160,148,255,0.7)", background: "rgba(99,82,255,0.10)" }}>
                      {entry.certificateNumber}
                    </span>
                    <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.30)" }}>
                      {new Date(entry.createdAt).toLocaleDateString("sr-RS")}
                    </span>
                    {entry.assetType === "audio" && (
                      <span className="text-[10px]" style={{ color: entry.fingerprint ? "rgba(74,222,128,0.8)" : "rgba(250,204,21,0.8)" }}>
                        {entry.fingerprint ? "Otisak spreman" : "Otisak nedostupan"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-0.5 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity border-l" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  <button type="button" onClick={() => handleDownloadCertificate(entry)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 transition-all hover:bg-white/[0.08] active:scale-90"
                    title="Preuzmi sertifikat" aria-label="Preuzmi sertifikat">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button type="button"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white/35 transition-all hover:bg-red-500/[0.12] hover:text-red-400/90 active:scale-90"
                        title="Obriši" aria-label="Obriši evidenciju">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Obriši evidenciju?</AlertDialogTitle>
                        <AlertDialogDescription>"{entry.title}" i sertifikat "{entry.certificateNumber}" biće trajno obrisani.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Otkaži</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => { if (!deleteMutation.isPending) deleteMutation.mutate(entry.id); }}
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
