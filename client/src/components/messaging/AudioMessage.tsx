import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Pause, Play, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Audio attachment in a chat bubble (demo, mix, voice note).
// The waveform is a picture rendered by the file host from the audio itself,
// so nothing is downloaded until play is pressed (preload="none"). The picture
// is used as a mask over a two-tone fill, which doubles as the progress bar.

export const AUDIO_PLACEHOLDER = "🎵";

function cloudinaryVariant(url: string, transform: string, ext?: string): string | null {
  const i = url.indexOf("/upload/");
  if (!url.includes("res.cloudinary.com") || i < 0) return null;
  let out = `${url.slice(0, i + 8)}${transform}/${url.slice(i + 8)}`;
  if (ext) out = out.replace(/\.[a-z0-9]+(\?.*)?$/i, `.${ext}`);
  return out;
}

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
};

// Stand-in bars when the waveform picture isn't available.
const FALLBACK_BARS = Array.from({ length: 48 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45)));

export function AudioMessage({ url, name, duration, own }: { url: string; name: string | null; duration: number | null; own: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(duration ?? 0);
  const [waveOk, setWaveOk] = useState<boolean | null>(null);

  const waveUrl = useMemo(() => cloudinaryVariant(url, "fl_waveform,co_white,b_transparent,h_96,w_640", "png"), [url]);
  const downloadUrl = useMemo(() => cloudinaryVariant(url, "fl_attachment") ?? url, [url]);

  useEffect(() => {
    if (!waveUrl) { setWaveOk(false); return; }
    const img = new Image();
    img.onload = () => setWaveOk(true);
    img.onerror = () => setWaveOk(false);
    img.src = waveUrl;
  }, [waveUrl]);

  // Only one chat audio plays at a time
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onOther = (e: Event) => { if ((e as CustomEvent).detail !== a) a.pause(); };
    window.addEventListener("chat-audio-play", onOther);
    return () => window.removeEventListener("chat-audio-play", onOther);
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      window.dispatchEvent(new CustomEvent("chat-audio-play", { detail: a }));
      a.play().catch(() => setPlaying(false));
    } else a.pause();
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a || !total) return;
    const r = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * total;
    a.currentTime = t;
    setTime(t);
    if (a.paused) toggle();
  };

  const pct = total ? Math.min(100, (time / total) * 100) : 0;
  const played = own ? "hsl(var(--primary-foreground))" : "hsl(var(--primary))";
  const rest = own ? "hsl(var(--primary-foreground) / 0.35)" : "hsl(var(--muted-foreground) / 0.45)";
  const fill = `linear-gradient(to right, ${played} ${pct}%, ${rest} ${pct}%)`;
  const label = name?.replace(/\.[a-z0-9]{2,4}$/i, "") || "Audio";

  return (
    <div className="w-[260px] sm:w-[300px] max-w-full py-0.5">
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setTime(0); }}
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={e => { if (isFinite(e.currentTarget.duration)) setTotal(e.currentTarget.duration); }}
      />
      <div className="flex items-center gap-2 mb-1.5 min-w-0">
        <Music2 className="w-3.5 h-3.5 shrink-0 opacity-70" />
        <span className="text-xs font-medium truncate flex-1" title={name ?? undefined}>{label}</span>
        <a
          href={downloadUrl}
          download={name ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Preuzmi audio"
          title="Preuzmi"
          className={cn("shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors", own ? "hover:bg-primary-foreground/15" : "hover:bg-muted")}
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pauziraj" : "Pusti"}
          className={cn(
            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95",
            own ? "bg-primary-foreground text-primary" : "bg-primary text-primary-foreground",
          )}
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 translate-x-[1px]" />}
        </button>
        <div className="flex-1 min-w-0">
          <div
            role="slider"
            aria-label="Pozicija"
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(time)}
            tabIndex={0}
            onClick={seek}
            onKeyDown={e => {
              const a = audioRef.current;
              if (!a) return;
              if (e.key === "ArrowRight") a.currentTime = Math.min(total, a.currentTime + 5);
              if (e.key === "ArrowLeft") a.currentTime = Math.max(0, a.currentTime - 5);
              if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(); }
            }}
            className="h-8 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            {waveOk ? (
              <div
                className="w-full h-full"
                style={{
                  background: fill,
                  WebkitMaskImage: `url("${waveUrl}")`, maskImage: `url("${waveUrl}")`,
                  WebkitMaskSize: "100% 100%", maskSize: "100% 100%",
                  WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center gap-[2px]">
                {FALLBACK_BARS.map((h, i) => (
                  <span key={i} className="flex-1 rounded-full" style={{ height: `${h * 100}%`, background: (i / FALLBACK_BARS.length) * 100 < pct ? played : rest }} />
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-between text-[10px] font-mono opacity-70 mt-0.5">
            <span>{fmt(time)}</span>
            <span>{total ? fmt(total) : ""}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
