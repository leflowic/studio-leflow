import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Link2, Loader2, Music2, Instagram, Download, X } from "lucide-react";
import { useParams } from "wouter";
import { useEffect, useState } from "react";
import type { SmartLink } from "@shared/schema";
import { SMART_LINK_PLATFORMS } from "@/lib/smart-link-platforms";
import { accentFromImage, loadCorsImage, OAK_HSL, type HSL } from "@/lib/cover-accent";
import { canRecordStoryVideo, recordStoryVideo, renderStoryPoster } from "@/lib/story-video";


// ─── Cover colour (shared with the story video) ────────────────────────────────
function useCoverAccent(url: string | null | undefined) {
  const [hslv, setHsl] = useState<HSL>(OAK_HSL);
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    loadCorsImage(url).then(img => { if (!cancelled) setHsl(accentFromImage(img)); }).catch(() => {});
    return () => { cancelled = true; };
  }, [url]);
  const [h, sat, l] = hslv;
  return {
    accent: `hsl(${h} ${sat}% ${l}%)`,
    glow: `hsl(${h} ${Math.min(sat + 10, 90)}% 45% / 0.55)`,
    label: `hsl(${h} ${Math.max(sat - 10, 20)}% 52%)`,
  };
}

const VERB: Record<string, string> = { youtube: "Gledaj" };
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// ─── Vinyl behind the cover (brand motif) ──────────────────────────────────────
function Record({ labelColor, spinning }: { labelColor: string; spinning: boolean }) {
  return (
    <svg viewBox="-100 -100 200 200" className={`w-full h-full ${spinning ? "animate-[spin_9s_linear_infinite]" : ""}`} aria-hidden="true">
      <circle r="99" fill="#0b0b0c" />
      {Array.from({ length: 22 }, (_, i) => (
        <circle key={i} r={36 + i * 2.8} fill="none" stroke="#fff" strokeOpacity={i % 4 === 0 ? 0.07 : 0.03} strokeWidth="0.6" />
      ))}
      {/* light sheen across the grooves */}
      <path d="M -99 0 A 99 99 0 0 1 0 -99 L 0 0 Z" fill="url(#sheen)" opacity="0.5" />
      <defs>
        <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.07" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle r="32" fill={labelColor} />
      <circle r="31" fill="none" stroke="#000" strokeOpacity="0.2" />
      <circle r="3.2" fill="#0b0b0c" />
    </svg>
  );
}

export default function SmartLinkPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  // story: idle -> making (progress) -> ready (preview + share). Sharing needs a fresh tap
  // (browsers only open the share sheet right after a user gesture), hence the preview step.
  const [story, setStory] = useState<{ phase: "idle" | "making" | "ready"; progress: number; file?: File; url?: string }>({ phase: "idle", progress: 0 });
  const [copied, setCopied] = useState(false);
  const [coverReady, setCoverReady] = useState(false);

  const { data: link, isLoading, isError } = useQuery<SmartLink>({
    queryKey: [`/api/l/${slug}`],
    queryFn: async () => {
      const r = await fetch(`/api/l/${slug}`);
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
    retry: false,
  });

  const { accent, glow, label } = useCoverAccent(link?.coverUrl);

  // The platform opens straight from the click (a real <a target=_blank>), and the
  // click is recorded in the background with keepalive. Opening only after an awaited
  // fetch got the new tab blocked on iOS Safari (no longer a user gesture).
  function trackClick(platform: string) {
    try {
      fetch(`/api/l/${slug}/click`, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform }) }).catch(() => {});
    } catch { /* tracking must never block the click */ }
  }

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function makeStory() {
    if (!link || story.phase === "making") return;
    setStory({ phase: "making", progress: 0 });
    try {
      let file: File;
      if (canRecordStoryVideo()) {
        const { blob, ext, mime } = await recordStoryVideo(link, prog => setStory(s => ({ ...s, progress: prog })));
        file = new File([blob], `${link.slug}-story.${ext}`, { type: mime });
      } else {
        const png = await renderStoryPoster(link);
        file = new File([png], `${link.slug}-story.png`, { type: "image/png" });
      }
      setStory({ phase: "ready", progress: 1, file, url: URL.createObjectURL(file) });
    } catch (e) {
      console.error("Story render failed", e);
      setStory({ phase: "idle", progress: 0 });
    }
  }

  function closeStory() {
    if (story.url) URL.revokeObjectURL(story.url);
    setStory({ phase: "idle", progress: 0 });
  }

  function saveStory() {
    if (!story.file || !story.url) return;
    const a = document.createElement("a");
    a.href = story.url; a.download = story.file.name; a.click();
  }

  async function shareStory() {
    if (!story.file) return;
    try {
      if (navigator.canShare?.({ files: [story.file] })) {
        await navigator.share({ files: [story.file], title: link ? `${link.title} - ${link.artist}` : undefined });
      } else {
        saveStory();
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") saveStory();
    }
  }

  async function handleCopy() {
    const url = `https://music.studioleflow.com/${slug}`;
    try {
      if (canNativeShare && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        await navigator.share({ title: link ? `${link.title} - ${link.artist}` : undefined, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { /* share sheet dismissed */ }
  }

  useEffect(() => {
    if (link) document.title = `${link.title} - ${link.artist}`;
  }, [link]);

  const activePlatforms = link ? SMART_LINK_PLATFORMS.filter(p => link[p.key as keyof SmartLink]) : [];

  if (isLoading) {
    return (
      <div className="min-h-[100svh] bg-[#0b0b0c] flex items-center justify-center px-6">
        <div className="w-full max-w-4xl grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 md:gap-16 items-center">
          <div className="mx-auto w-full max-w-[300px] md:max-w-[400px] aspect-square rounded-2xl bg-white/[0.04] animate-pulse" />
          <div className="space-y-4">
            <div className="h-9 w-3/4 rounded-lg bg-white/[0.05] animate-pulse" />
            <div className="h-5 w-1/3 rounded bg-white/[0.04] animate-pulse" />
            <div className="h-56 rounded-2xl bg-white/[0.03] animate-pulse mt-8" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !link) {
    return (
      <div className="min-h-[100svh] bg-[#0b0b0c] flex flex-col items-center justify-center gap-3 text-center px-6">
        <div className="w-24 h-24 mb-4 opacity-60"><Record labelColor="hsl(32 42% 62%)" spinning={false} /></div>
        <p className="text-2xl font-semibold text-white">Pesma nije pronađena</p>
        <p className="text-sm text-white/50 max-w-xs">Link je možda pogrešno prekucan ili je pesma uklonjena.</p>
        <a href="/" className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 px-5 h-10 text-sm text-white/80 hover:text-white hover:border-white/30 transition-colors">
          Sve pesme iz studija <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    );
  }

  const motion = !reducedMotion();

  return (
    <div className="min-h-[100svh] bg-[#0b0b0c] text-white relative overflow-hidden" style={{ ["--accent" as any]: accent }}>
      {/* ── Ambient backdrop: blurred cover + accent glow + vignette + grain ── */}
      {link.coverUrl && (
        <div aria-hidden="true" className="absolute inset-0 scale-125 opacity-40" style={{
          backgroundImage: `url(${link.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(80px) saturate(1.3)",
        }} />
      )}
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none transition-[background] duration-700"
        style={{ background: `radial-gradient(60% 50% at 30% 35%, ${glow}, transparent 70%)` }} />
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 35%, rgba(11,11,12,0.85) 75%, #0b0b0c 100%)" }} />
      <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.05] mix-blend-overlay" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E")`,
      }} />

      <main className="relative z-10 min-h-[100svh] flex flex-col">
        <div className="flex-1 flex items-center justify-center px-6 pt-12 pb-10 md:py-16">
          <div className="w-full max-w-5xl grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-10 md:gap-24 lg:gap-28 items-center">

            {/* ── Artwork with the record sliding out behind it ── */}
            <div className="relative mx-auto w-full max-w-[280px] sm:max-w-[330px] md:max-w-[380px] md:mr-[12%] lg:mr-[14%]">
              <div className="relative aspect-square">
                <div
                  className="absolute inset-[4%] transition-transform ease-out"
                  style={{
                    transform: coverReady || !link.coverUrl ? "translateX(24%)" : "translateX(0)",
                    transitionDuration: motion ? "1100ms" : "0ms",
                  }}
                >
                  <Record labelColor={label} spinning={motion} />
                </div>
                <div className="absolute inset-0 rounded-[14px] overflow-hidden shadow-[0_40px_80px_-20px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.08)] bg-white/[0.04]">
                  {link.coverUrl ? (
                    <img
                      src={link.coverUrl}
                      alt={`${link.title} - ${link.artist}`}
                      className="w-full h-full object-cover"
                      // @ts-expect-error - fetchpriority is valid HTML, React 18 types lag behind
                      fetchpriority="high"
                      onLoad={() => setTimeout(() => setCoverReady(true), 150)}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music2 className="w-16 h-16 text-white/20" />
                    </div>
                  )}
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/[0.06]" />
                </div>
              </div>
            </div>

            {/* ── Title + platforms ── */}
            <div className="relative z-10 w-full max-w-md mx-auto md:mx-0">
              <h1 className="text-[clamp(30px,5.5vw,52px)] font-semibold leading-[1.02] tracking-[-0.03em] text-center md:text-left text-balance">
                {link.title}
              </h1>
              <p className="mt-3 text-lg text-white/60 text-center md:text-left">{link.artist}</p>

              <div className="mt-8 md:mt-10 rounded-2xl border border-white/[0.09] bg-white/[0.035] backdrop-blur-xl overflow-hidden">
                <ul className="divide-y divide-white/[0.07]">
                  {activePlatforms.map(p => {
                    const url = link[p.key as keyof SmartLink] as string;
                    return (
                      <li key={p.key}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => trackClick(p.clickKey)}
                          className="group flex items-center gap-4 px-5 h-[64px] transition-colors hover:bg-white/[0.05] focus-visible:outline-none focus-visible:bg-white/[0.06]"
                        >
                          <span className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.06] text-white/80 transition-colors group-hover:text-[var(--brand)]" style={{ ["--brand" as any]: p.color }}>
                            <p.Icon size={18} />
                          </span>
                          <span className="flex-1 text-[15px] font-medium text-white/90">{p.label}</span>
                          <span
                            className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full text-[13px] font-semibold border border-white/[0.12] text-white/80 transition-all group-hover:border-transparent group-hover:text-[#0b0b0c] group-hover:bg-[var(--accent)]"
                          >
                            {VERB[p.clickKey] ?? "Slušaj"}
                          </span>
                        </a>
                      </li>
                    );
                  })}
                  {activePlatforms.length === 0 && (
                    <li className="px-5 py-8 text-center text-sm text-white/40">Pesma uskoro stiže na platforme.</li>
                  )}
                </ul>
              </div>

              <div className="mt-5 flex flex-wrap justify-center md:justify-start gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-full text-[13px] font-medium text-white/75 border border-white/[0.12] hover:text-white hover:border-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  {copied ? <Check className="w-4 h-4" style={{ color: accent }} /> : <Link2 className="w-4 h-4" />}
                  {copied ? "Link je kopiran" : "Podeli pesmu"}
                </button>
                <button
                  type="button"
                  onClick={makeStory}
                  aria-busy={story.phase === "making"}
                  className={`relative overflow-hidden inline-flex items-center gap-2 h-10 px-4 rounded-full text-[13px] font-medium text-white/75 border border-white/[0.12] hover:text-white hover:border-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${story.phase === "making" ? "pointer-events-none" : ""}`}
                >
                  {story.phase === "making" && (
                    <span aria-hidden="true" className="absolute inset-y-0 left-0 bg-white/[0.08] transition-[width] duration-200" style={{ width: `${Math.round(story.progress * 100)}%` }} />
                  )}
                  {story.phase === "making" ? <Loader2 className="relative w-4 h-4 animate-spin" /> : <Instagram className="w-4 h-4" />}
                  <span className="relative">{story.phase === "making" ? `Pravim video ${Math.round(story.progress * 100)}%` : "Story za Instagram"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <footer className="relative z-10 pb-8 pt-2 flex items-center justify-center">
          <a href="/" className="group inline-flex items-center gap-2.5 text-white/40 hover:text-white/80 transition-colors">
            <img src="/leflow-logo-white.png" alt="" className="h-4 w-auto opacity-70 group-hover:opacity-100 transition-opacity" />
            <span className="text-[13px] font-medium">Studio LeFlow</span>
          </a>
        </footer>
      </main>

      {/* ── Story preview: plays the rendered video, then share / save ── */}
      {story.phase === "ready" && story.url && story.file && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-5" role="dialog" aria-modal="true" aria-label="Story za Instagram">
          <div className="w-full max-w-[340px]">
            <div className="relative rounded-[22px] overflow-hidden border border-white/10 shadow-2xl bg-black aspect-[9/16] max-h-[68svh] mx-auto">
              {story.file.type.startsWith("video/") ? (
                <video src={story.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
              ) : (
                <img src={story.url} alt="Story" className="w-full h-full object-cover" />
              )}
              <button type="button" onClick={closeStory} aria-label="Zatvori" className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 backdrop-blur flex items-center justify-center text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-2">
              {canNativeShare && (
                <button type="button" onClick={shareStory}
                  className="h-12 rounded-full font-semibold text-[15px] text-[#0b0b0c] inline-flex items-center justify-center gap-2"
                  style={{ background: accent }}>
                  <Instagram className="w-4 h-4" /> Podeli na Instagram
                </button>
              )}
              <button type="button" onClick={saveStory}
                className={`h-12 rounded-full font-semibold text-[15px] inline-flex items-center justify-center gap-2 ${canNativeShare ? "border border-white/15 text-white/85 hover:border-white/30" : "text-[#0b0b0c]"}`}
                style={canNativeShare ? undefined : { background: accent }}>
                <Download className="w-4 h-4" /> Sačuvaj {story.file.type.startsWith("video/") ? "video" : "sliku"}
              </button>
              <p className="text-center text-[12px] text-white/45 mt-1 px-2">
                U Instagramu izaberi Story, pa dodaj "Link" nalepnicu sa adresom pesme.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
