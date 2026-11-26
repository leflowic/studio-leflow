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
      <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-muted-foreground">{label}</p>
      {children}
    </div>
  );
}

function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full h-9 px-3 rounded-xl text-[12px] text-foreground outline-none placeholder:text-muted-foreground/60 transition-colors bg-muted/40 border border-border focus:border-primary/50"
    />
  );
}

function StyledTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={2}
      className="w-full px-3 py-2 rounded-xl text-[12px] text-foreground outline-none placeholder:text-muted-foreground/60 transition-colors bg-muted/40 border border-border focus:border-primary/50 resize-none"
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
      toast({ title: "Evidencija sačuvana" });
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
      <Modal open={open} onClose={closeDialog} themed>
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b shrink-0 border-border">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Nova evidencija</h2>
            <p className="text-[11px] mt-0.5 text-muted-foreground">Otpremi pesmu ili logo i evidentiraj dokaz</p>
          </div>
          <button type="button" onClick={closeDialog} aria-label="Zatvori"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-muted/40 hover:bg-muted border border-border">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div
            role="button"
            tabIndex={0}
            className="rounded-2xl overflow-hidden cursor-pointer bg-muted/30 border border-dashed border-border"
            onClick={() => fileRef.current?.click()}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fileRef.current?.click(); } }}
          >
            <div className="px-4 py-5 flex flex-col items-center gap-2 text-center">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : uploadResult ? (
                <>
                  {uploadResult.assetType === "audio" ? <Music2 className="w-6 h-6 text-emerald-400" /> : <ImageIcon className="w-6 h-6 text-emerald-400" />}
                  <p className="text-[12px] font-semibold text-foreground/80">{uploadResult.originalFilename}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {uploadResult.assetType === "audio" && uploadResult.fingerprint === null
                      ? "Otisak nije uspeo (hash i dalje važi)"
                      : "Fajl otpremljen, hash izračunat"}
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground/70" />
                  <p className="text-[12px] text-muted-foreground">Klikni da otpremiš MP3 ili PNG/JPG</p>
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

          <p className="text-[10.5px] leading-relaxed text-muted-foreground">
            Ovo je interna evidencija - ne zamenjuje zvaničnu registraciju autorskih prava. Tvrđeni datum nastanka je tvoja izjava, ne nešto što hash sam po sebi dokazuje.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 px-6 py-4 shrink-0 border-t border-border bg-muted/30">
          <button type="button" onClick={closeDialog}
            className="h-9 px-5 rounded-xl text-[12px] font-medium transition-all active:scale-95 text-muted-foreground hover:text-foreground/80 border border-border">
            Otkaži
          </button>
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !uploadResult || !form.title || !form.creatorName}
            className="h-9 px-6 rounded-xl text-[12px] font-semibold flex items-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40 bg-primary text-primary-foreground"
          >
            {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saveMutation.isPending ? "Čuvam..." : "Sačuvaj evidenciju"}
          </button>
        </div>
      </Modal>

      <Modal open={compareOpen} onClose={() => { setCompareOpen(false); setCompareResult(null); }} themed>
        <div className="flex items-center justify-between px-6 pt-6 pb-5 border-b shrink-0 border-border">
          <div>
            <h2 className="text-[15px] font-bold text-foreground">Uporedi snimak</h2>
            <p className="text-[11px] mt-0.5 text-muted-foreground">Otpremi sumnjiv MP3 i uporedi sa arhivom</p>
          </div>
          <button type="button" onClick={() => { setCompareOpen(false); setCompareResult(null); }} aria-label="Zatvori"
            className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 bg-muted/40 hover:bg-muted border border-border">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div
            role="button"
            tabIndex={0}
            className="rounded-2xl overflow-hidden cursor-pointer bg-muted/30 border border-dashed border-border"
            onClick={() => compareFileRef.current?.click()}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); compareFileRef.current?.click(); } }}
          >
            <div className="px-4 py-5 flex flex-col items-center gap-2 text-center">
              {comparing ? <Loader2 className="w-6 h-6 animate-spin text-primary" /> : (
                <>
                  <FileSearch className="w-6 h-6 text-muted-foreground/70" />
                  <p className="text-[12px] text-muted-foreground">Klikni da otpremiš sumnjiv MP3</p>
                </>
              )}
            </div>
          </div>
          <input ref={compareFileRef} type="file" accept="audio/mpeg" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleCompare(f); e.target.value = ""; }} />

          {compareResult && (
            <div className="space-y-2">
              {compareResult.matches.length === 0 ? (
                <p className="text-[12px] text-center py-4 text-muted-foreground">Nema podudaranja u arhivi.</p>
              ) : compareResult.matches.map(m => (
                <div key={m.id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-muted/50 border border-border">
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold text-foreground/80 truncate">{m.title}</p>
                    <p className="text-[10px] truncate text-muted-foreground">{m.creatorName}</p>
                  </div>
                  {m.exactMatch ? (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0 bg-red-500/15 text-red-400">Isti fajl</span>
                  ) : (
                    <span className="text-[10px] font-semibold px-2 py-1 rounded-lg shrink-0 bg-primary/10 text-primary">{m.similarity}% sličnost</span>
                  )}
                </div>
              ))}
              <p className="text-[10px] leading-relaxed flex items-start gap-1.5 pt-1 text-muted-foreground">
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
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 bg-primary/10 border border-primary/20">
              <ShieldCheck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">Zaštita prava</h2>
              <p className="text-[11px] text-muted-foreground leading-none mt-0.5">Interna evidencija - hash, vreme i otisak zvuka</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setCompareOpen(true); setCompareResult(null); }}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97] border border-border text-foreground/80 hover:bg-white/5">
              <FileSearch className="w-3.5 h-3.5" />
              Uporedi snimak
            </button>
            <button type="button" onClick={openCreate}
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-[12px] font-semibold transition-all hover:-translate-y-px active:scale-[0.97] bg-primary text-primary-foreground">
              <Plus className="w-3.5 h-3.5" />
              Nova evidencija
            </button>
          </div>
        </div>

        <p className="text-[11px] leading-relaxed rounded-2xl px-4 py-3 text-muted-foreground bg-muted/30 border border-border">
          Ovaj alat pravi internu, vremenski overenu evidenciju (SHA-256 heš + datum) za pesme i brend materijal (logo). Ne zamenjuje zvaničnu registraciju autorskih prava kod SOKOJ-a.
        </p>

        {isLoading ? (
          <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-[72px] rounded-2xl" />)}</div>
        ) : !entries?.length ? (
          <div className="rounded-3xl py-16 flex flex-col items-center gap-4 text-center border border-dashed border-border bg-muted/30">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center bg-primary/10 border border-primary/20">
              <ShieldCheck className="w-7 h-7 text-primary/60" />
            </div>
            <div>
              <p className="text-sm font-semibold">Nema evidencija</p>
              <p className="text-[11px] mt-1 text-muted-foreground">Dodaj prvu pesmu ili logo za zaštitu</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {entries.map(entry => (
              <div key={entry.id} className="group rounded-2xl overflow-hidden flex items-stretch transition-all duration-200 bg-muted/40 border border-border hover:bg-white/5">
                <div className="w-[56px] flex items-center justify-center shrink-0 bg-muted/30">
                  {entry.assetType === "audio" ? <Music2 className="w-5 h-5 text-muted-foreground" /> : <ImageIcon className="w-5 h-5 text-muted-foreground" />}
                </div>
                <div className="flex-1 px-4 py-3 min-w-0">
                  <p className="font-bold text-[13px] leading-tight truncate text-foreground/80">{entry.title}</p>
                  <p className="text-[11px] truncate mt-0.5 text-muted-foreground">{entry.creatorName}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg text-primary bg-primary/10">
                      {entry.certificateNumber}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleDateString("sr-RS")}
                    </span>
                    {entry.assetType === "audio" && (
                      <span className={`text-[10px] ${entry.fingerprint ? "text-green-500" : "text-amber-500"}`}>
                        {entry.fingerprint ? "Otisak spreman" : "Otisak nedostupan"}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center gap-0.5 px-2.5 opacity-0 group-hover:opacity-100 transition-opacity border-l border-border">
                  <button type="button" onClick={() => handleDownloadCertificate(entry)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground transition-all hover:bg-muted active:scale-90"
                    title="Preuzmi sertifikat" aria-label="Preuzmi sertifikat">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button type="button"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground transition-all hover:bg-red-500/[0.12] hover:text-red-400/90 active:scale-90"
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
