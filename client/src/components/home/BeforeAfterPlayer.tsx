import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pause, Play, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEditMode } from "@/contexts/EditModeContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, getAuthToken } from "@/lib/queryClient";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { WaveDivider } from "@/components/WaveDivider";

// Before/after A/B player. Data lives in cms_content (page "home", section
// "beforeafter", keys ba_<n>_title / _artist / _before / _after), edited in
// place by Super Admin in edit mode. A pair is only shown publicly once both
// audio URLs are set; with no complete pair the whole section is hidden.
//
// Both versions play at the same time and we only flip which one is muted -
// that's what makes switching seamless (no seek, no gap) mid-song.

const SLOTS = [1, 2, 3] as const;

type GetCms = (section: string, key: string, fallback?: string) => string;

function formatTime(sec: number) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function PairPlayer({ title, artist, beforeUrl, afterUrl, active, onActivate }: {
  title: string;
  artist: string;
  beforeUrl: string;
  afterUrl: string;
  active: boolean;
  onActivate: () => void;
}) {
  const beforeRef = useRef<HTMLAudioElement>(null);
  const afterRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [showAfter, setShowAfter] = useState(true);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Another pair started playing - stop this one.
  useEffect(() => {
    if (!active && playing) {
      beforeRef.current?.pause();
      afterRef.current?.pause();
      setPlaying(false);
    }
  }, [active, playing]);

  useEffect(() => {
    if (beforeRef.current) beforeRef.current.muted = showAfter;
    if (afterRef.current) afterRef.current.muted = !showAfter;
  }, [showAfter]);

  const toggle = async () => {
    const a = beforeRef.current, b = afterRef.current;
    if (!a || !b) return;
    if (playing) {
      a.pause(); b.pause(); setPlaying(false);
      return;
    }
    onActivate();
    b.currentTime = a.currentTime;
    try {
      await Promise.all([a.play(), b.play()]);
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  const onTimeUpdate = () => {
    const a = beforeRef.current, b = afterRef.current;
    if (!a || !b) return;
    setTime(a.currentTime);
    // Keep the two elements locked together; small drift builds up over a song.
    if (Math.abs(a.currentTime - b.currentTime) > 0.08) b.currentTime = a.currentTime;
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = beforeRef.current, b = afterRef.current;
    if (!a || !b || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    a.currentTime = t; b.currentTime = t; setTime(t);
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card p-5">
      <audio
        ref={beforeRef}
        src={beforeUrl}
        preload="metadata"
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={e => setDuration(e.currentTarget.duration)}
        onEnded={() => { afterRef.current?.pause(); setPlaying(false); setTime(0); }}
      />
      <audio ref={afterRef} src={afterUrl} preload="metadata" muted />

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pauziraj" : "Pusti"}
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity"
        >
          {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{title}</p>
          {artist && <p className="text-sm text-muted-foreground truncate">{artist}</p>}
        </div>
        <div className="flex rounded-full border border-border/60 p-1 text-sm font-semibold flex-shrink-0" role="group" aria-label="Verzija">
          <button
            type="button"
            onClick={() => setShowAfter(false)}
            aria-pressed={!showAfter}
            className={`px-4 py-1.5 rounded-full transition-colors ${!showAfter ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            Pre
          </button>
          <button
            type="button"
            onClick={() => setShowAfter(true)}
            aria-pressed={showAfter}
            className={`px-4 py-1.5 rounded-full transition-colors ${showAfter ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Posle
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span className="text-xs tabular-nums text-muted-foreground w-9">{formatTime(time)}</span>
        <div className="relative flex-1 h-1.5 rounded-full bg-muted cursor-pointer" onClick={seek}>
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary"
            style={{ width: duration ? `${(time / duration) * 100}%` : "0%" }}
          />
        </div>
        <span className="text-xs tabular-nums text-muted-foreground w-9 text-right">{formatTime(duration)}</span>
      </div>
    </div>
  );
}

function SlotEditor({ slot, getCms }: { slot: number; getCms: GetCms }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [title, setTitle] = useState(getCms("beforeafter", `ba_${slot}_title`, ""));
  const [artist, setArtist] = useState(getCms("beforeafter", `ba_${slot}_artist`, ""));
  const [uploading, setUploading] = useState<"before" | "after" | null>(null);

  const save = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) =>
      apiRequest("PUT", "/api/cms/content/single", { page: "home", section: "beforeafter", contentKey: key, contentValue: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/cms/content"] }),
    onError: () => toast({ title: "Greška", description: "Čuvanje nije uspelo", variant: "destructive" }),
  });

  const upload = async (which: "before" | "after", file: File) => {
    setUploading(which);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const token = getAuthToken();
      const r = await fetch("/api/upload/audio", { method: "POST", headers: token ? { Authorization: `Bearer ${token}` } : {}, body: fd });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Upload nije uspeo");
      await save.mutateAsync({ key: `ba_${slot}_${which}`, value: data.url });
      toast({ title: which === "before" ? "Sirova verzija sačuvana" : "Gotova verzija sačuvana" });
    } catch (e: any) {
      toast({ title: "Greška", description: e.message || "Upload nije uspeo", variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const hasBefore = !!getCms("beforeafter", `ba_${slot}_before`, "");
  const hasAfter = !!getCms("beforeafter", `ba_${slot}_after`, "");

  return (
    <div className="rounded-xl border border-dashed border-primary/40 p-4 space-y-3">
      <p className="text-sm font-semibold">Par {slot}</p>
      <div className="grid sm:grid-cols-2 gap-2">
        <Input placeholder="Naziv pesme" value={title} onChange={e => setTitle(e.target.value)}
          onBlur={() => save.mutate({ key: `ba_${slot}_title`, value: title })} />
        <Input placeholder="Izvođač" value={artist} onChange={e => setArtist(e.target.value)}
          onBlur={() => save.mutate({ key: `ba_${slot}_artist`, value: artist })} />
      </div>
      <div className="flex flex-wrap gap-2">
        {(["before", "after"] as const).map(which => (
          <label key={which} className="inline-flex">
            <input type="file" accept="audio/mpeg,.mp3" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) upload(which, f); }} />
            <span className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-full border border-border cursor-pointer hover:bg-muted">
              {uploading === which ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {which === "before" ? "Sirova verzija (MP3)" : "Gotova verzija (MP3)"}
              {(which === "before" ? hasBefore : hasAfter) && <span className="text-xs text-primary">postavljeno</span>}
            </span>
          </label>
        ))}
        {(hasBefore || hasAfter) && (
          <Button variant="ghost" size="sm" className="text-destructive"
            onClick={() => { save.mutate({ key: `ba_${slot}_before`, value: "" }); save.mutate({ key: `ba_${slot}_after`, value: "" }); }}>
            Ukloni par
          </Button>
        )}
      </div>
    </div>
  );
}

export function BeforeAfterSection({ getCms }: { getCms: GetCms }) {
  const { isEditMode } = useEditMode();
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const pairs = SLOTS.map(n => ({
    slot: n,
    title: getCms("beforeafter", `ba_${n}_title`, ""),
    artist: getCms("beforeafter", `ba_${n}_artist`, ""),
    beforeUrl: getCms("beforeafter", `ba_${n}_before`, ""),
    afterUrl: getCms("beforeafter", `ba_${n}_after`, ""),
  })).filter(p => p.beforeUrl && p.afterUrl);

  if (!pairs.length && !isEditMode) return null;

  return (
    <section className="py-20 lg:py-28 bg-background relative z-10">
      <div className="max-w-7xl mx-auto px-4 md:px-6">
        <FadeInWhenVisible>
          <div className="grid lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-16 items-start">
            <div>
              <WaveDivider className="mb-6" align="start" />
              <h2 className="heading-lg mb-4">Čujte razliku</h2>
              <p className="text-lg text-muted-foreground">
                Isti snimak pre i posle miksa i masteringa. Pustite pesmu i prebacujte između verzija dok svira.
              </p>
            </div>
            <div className="space-y-4">
              {pairs.map(p => (
                <PairPlayer
                  key={p.slot}
                  title={p.title || "Bez naziva"}
                  artist={p.artist}
                  beforeUrl={p.beforeUrl}
                  afterUrl={p.afterUrl}
                  active={activeSlot === p.slot}
                  onActivate={() => setActiveSlot(p.slot)}
                />
              ))}
              {isEditMode && (
                <div className="space-y-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    Vidljivo samo u edit modu. Par se prikazuje posetiocima tek kad su postavljene obe verzije. Najbolje je da obe verzije budu iste dužine i počinju u istom trenutku.
                  </p>
                  {SLOTS.map(n => <SlotEditor key={n} slot={n} getCms={getCms} />)}
                </div>
              )}
            </div>
          </div>
        </FadeInWhenVisible>
      </div>
    </section>
  );
}
