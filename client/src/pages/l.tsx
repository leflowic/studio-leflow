import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useEffect, useState } from "react";
import type { SmartLink } from "@shared/schema";
import { SiSpotify, SiYoutube, SiApplemusic, SiSoundcloud, SiTidal } from "react-icons/si";
import QRCode from "qrcode";

const PLATFORMS = [
  { key: "spotifyUrl" as keyof SmartLink, clickKey: "spotify", label: "Spotify", color: "#1DB954", Icon: SiSpotify },
  { key: "youtubeUrl" as keyof SmartLink, clickKey: "youtube", label: "YouTube", color: "#FF0033", Icon: SiYoutube },
  { key: "appleMusicUrl" as keyof SmartLink, clickKey: "apple_music", label: "Apple Music", color: "#FC3C44", Icon: SiApplemusic },
  { key: "soundcloudUrl" as keyof SmartLink, clickKey: "soundcloud", label: "SoundCloud", color: "#FF5500", Icon: SiSoundcloud },
  { key: "tidalUrl" as keyof SmartLink, clickKey: "tidal", label: "Tidal", color: "#00CFFF", Icon: SiTidal },
  { key: "deezerUrl" as keyof SmartLink, clickKey: "deezer", label: "Deezer", color: "#9B59FF", Icon: () => <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18}><path d="M18.81 11.834h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0 6.967h3.19v1.969h-3.19zm-4.271 3.483h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm-4.27 10.45h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm-4.271 6.967h3.19v1.969H6v-1.969zm0-3.483h3.19v1.969H6v-1.969zm-4.27 3.483H5v1.969H1.73v-1.969z"/></svg> },
];

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src.includes("?") ? `${src}&_dc=1` : `${src}?_dc=1`;
  });
}

// Draws image scaled to cover the entire canvas (no stretch, center-crop)
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, W: number, H: number) {
  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight);
  const sw = img.naturalWidth * scale;
  const sh = img.naturalHeight * scale;
  ctx.drawImage(img, (W - sw) / 2, (H - sh) / 2, sw, sh);
}

// Cross-browser blur via scale-down → scale-up (ctx.filter is unreliable in downloads)
// blurFactor: higher = more blur (20 = heavy, 8 = medium glow)
function blurredCanvas(img: HTMLImageElement, outW: number, outH: number, blurFactor: number): HTMLCanvasElement {
  const tw = Math.max(2, Math.floor(outW / blurFactor));
  const th = Math.max(2, Math.floor(outH / blurFactor));
  const tmp = document.createElement("canvas");
  tmp.width = tw; tmp.height = th;
  const tc = tmp.getContext("2d")!;
  const s = Math.max(tw / img.naturalWidth, th / img.naturalHeight);
  const sw = img.naturalWidth * s, sh = img.naturalHeight * s;
  tc.drawImage(img, (tw - sw) / 2, (th - sh) / 2, sw, sh);
  return tmp;
}

async function generateStoryBlob(link: SmartLink): Promise<Blob> {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Load assets
  let coverImg: HTMLImageElement | null = null;
  if (link.coverUrl) {
    try { coverImg = await loadImg(link.coverUrl); } catch {}
  }

  // ── 1. Base ───────────────────────────────────────────────────────────────
  ctx.fillStyle = "#08000e";
  ctx.fillRect(0, 0, W, H);

  // ── 2. Blurred background — scale-down/up (works in all browsers + downloads) ──
  if (coverImg) {
    const bgBlurred = blurredCanvas(coverImg, W, H, 40);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 0.72;
    ctx.drawImage(bgBlurred, 0, 0, W, H);
    ctx.restore();

    // Screen pass — extra color richness
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 0.14;
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(bgBlurred, 0, 0, W, H);
    ctx.restore();
  }

  // ── 3. Gradients (no panel — text floats on gradient) ────────────────────
  // Thin dark strip at top
  const tg = ctx.createLinearGradient(0, 0, 0, H * 0.14);
  tg.addColorStop(0, "rgba(0,0,0,0.65)");
  tg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = tg;
  ctx.fillRect(0, 0, W, H * 0.14);

  // Strong fade bottom half → almost full black at base
  const bg = ctx.createLinearGradient(0, H * 0.46, 0, H);
  bg.addColorStop(0,    "rgba(0,0,0,0)");
  bg.addColorStop(0.28, "rgba(0,0,0,0.60)");
  bg.addColorStop(0.55, "rgba(0,0,0,0.82)");
  bg.addColorStop(1,    "rgba(0,0,0,0.97)");
  ctx.fillStyle = bg;
  ctx.fillRect(0, H * 0.46, W, H * 0.54);

  // ── 4. Cover art ─────────────────────────────────────────────────────────
  const COVER = 750;
  const cx = (W - COVER) / 2;
  const cy = 160;

  if (coverImg) {
    // Glow underneath (colored halo) — scale-based blur
    const glowBlurred = blurredCanvas(coverImg, COVER, COVER, 8);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 0.62;
    ctx.drawImage(glowBlurred, cx + 50, cy + 70, COVER - 100, COVER - 100);
    ctx.restore();

    // Drop shadow
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.95)";
    ctx.shadowBlur = 110;
    ctx.shadowOffsetY = 45;
    roundRect(ctx, cx, cy, COVER, COVER, 48);
    ctx.fillStyle = "#000";
    ctx.fill();
    ctx.restore();

    // Image
    ctx.save();
    roundRect(ctx, cx, cy, COVER, COVER, 48);
    ctx.clip();
    ctx.drawImage(coverImg, cx, cy, COVER, COVER);
    ctx.restore();

    // Border
    ctx.save();
    roundRect(ctx, cx, cy, COVER, COVER, 48);
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();
  } else {
    ctx.save();
    roundRect(ctx, cx, cy, COVER, COVER, 48);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.restore();
  }

  // ── 5. Platform color dots ────────────────────────────────────────────────
  const PLAT_COLORS = [
    { key: "spotifyUrl",    color: "#1DB954" },
    { key: "youtubeUrl",    color: "#FF0033" },
    { key: "appleMusicUrl", color: "#FC3C44" },
    { key: "soundcloudUrl", color: "#FF5500" },
    { key: "tidalUrl",      color: "#00CFFF" },
    { key: "deezerUrl",     color: "#A259FF" },
  ].filter(p => (link as any)[p.key]);

  const dotR = 11;
  const dotGap = 30;
  const dotsY = cy + COVER + 64;

  if (PLAT_COLORS.length) {
    const totalW = PLAT_COLORS.length * (dotR * 2) + (PLAT_COLORS.length - 1) * dotGap;
    let dotX = (W - totalW) / 2 + dotR;
    PLAT_COLORS.forEach(p => {
      ctx.beginPath();
      ctx.arc(dotX, dotsY, dotR, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      dotX += dotR * 2 + dotGap;
    });
  }

  // ── 6. Title ──────────────────────────────────────────────────────────────
  const titleY = cy + COVER + (PLAT_COLORS.length ? 138 : 80);
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.85)";
  ctx.shadowBlur = 24;
  ctx.font = `bold 84px system-ui, -apple-system, Arial, sans-serif`;
  ctx.fillStyle = "#ffffff";
  const titleLines = wrapText(ctx, link.title, W - 100);
  titleLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, W / 2, titleY + i * 96));
  ctx.shadowBlur = 0;

  // ── 7. Artist ─────────────────────────────────────────────────────────────
  const artistY = titleY + Math.min(titleLines.length, 2) * 96 + 30;
  ctx.font = `400 48px system-ui, -apple-system, Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.50)";
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 16;
  ctx.fillText(link.artist, W / 2, artistY);
  ctx.shadowBlur = 0;

  // ── 8. QR code — black on white, actually scannable ───────────────────────
  const QR_SIZE = 192;
  const qrC = document.createElement("canvas");
  await QRCode.toCanvas(qrC, `${window.location.origin}/l/${link.slug}`, {
    width: QR_SIZE, margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const qrPad = 20;
  const qrX = (W - QR_SIZE) / 2;
  const qrY = artistY + 68;

  // White card behind QR
  ctx.save();
  roundRect(ctx, qrX - qrPad, qrY - qrPad, QR_SIZE + qrPad * 2, QR_SIZE + qrPad * 2, 26);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.5)";
  ctx.shadowBlur = 30;
  ctx.fill();
  ctx.restore();

  ctx.drawImage(qrC, qrX, qrY, QR_SIZE, QR_SIZE);

  // URL
  ctx.font = `400 27px "Courier New", monospace`;
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 12;
  ctx.fillText(`studioleflow.com/l/${link.slug}`, W / 2, qrY + QR_SIZE + qrPad + 44);
  ctx.shadowBlur = 0;

  // ── 9. Logo ───────────────────────────────────────────────────────────────
  try {
    const logo = await loadImg(`${window.location.origin}/leflow-logo-white.png`);
    const logoW = 190;
    const logoH = Math.round((logo.naturalHeight / logo.naturalWidth) * logoW);
    ctx.globalAlpha = 0.28;
    ctx.drawImage(logo, (W - logoW) / 2, H - 56 - logoH, logoW, logoH);
    ctx.globalAlpha = 1;
  } catch {
    ctx.font = `500 28px system-ui, -apple-system, Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.fillText("Studio LeFlow", W / 2, H - 62);
  }

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => b ? resolve(b) : reject(new Error("toBlob failed")), "image/png");
  });
}

async function shareToStory(link: SmartLink) {
  const blob = await generateStoryBlob(link);
  const file = new File([blob], `${link.slug}-story.png`, { type: "image/png" });

  // Web Share API with files — works on iOS Safari 15+ and Android Chrome
  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `${link.title} — ${link.artist}`,
    });
    return;
  }

  // Desktop / unsupported: direct download
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${link.slug}-story.png`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SmartLinkPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [generatingStory, setGeneratingStory] = useState(false);

  const { data: link, isLoading, isError } = useQuery<SmartLink>({
    queryKey: [`/api/l/${slug}`],
    queryFn: async () => {
      const r = await fetch(`/api/l/${slug}`);
      if (!r.ok) throw new Error("Not found");
      return r.json();
    },
    retry: false,
  });

  const clickMutation = useMutation({
    mutationFn: ({ platform, url }: { platform: string; url: string }) =>
      fetch(`/api/l/${slug}/click`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      }).then(() => url),
  });

  function handlePlatformClick(platform: string, url: string) {
    clickMutation.mutate({ platform, url }, {
      onSuccess: (targetUrl) => window.open(targetUrl, "_blank", "noopener,noreferrer"),
    });
  }

  const canNativeShare = typeof navigator.share === "function";

  async function handleShareStory() {
    if (!link || generatingStory) return;
    setGeneratingStory(true);
    try {
      await shareToStory(link);
    } catch (e: any) {
      // User cancelled share sheet — not an error
      if (e?.name !== "AbortError") console.error("Story share failed", e);
    } finally {
      setGeneratingStory(false);
    }
  }

  useEffect(() => {
    if (link) document.title = `${link.title} — ${link.artist}`;
  }, [link]);

  const activePlatforms = link ? PLATFORMS.filter(p => link[p.key]) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-[1.5px] border-white/10 border-t-white/60 animate-spin" />
      </div>
    );
  }

  if (isError || !link) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-xl font-bold text-white">Link nije pronađen</p>
        <p className="text-sm text-white/40">Ovaj smart link ne postoji ili je obrisan.</p>
        <a href="/" className="mt-3 text-xs text-white/30 hover:text-white/60 transition-colors tracking-widest uppercase">
          ← Studio LeFlow
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center">

      {link.coverUrl && (
        <div className="absolute inset-0 scale-[1.4]" style={{
          backgroundImage: `url(${link.coverUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(90px)",
          opacity: 0.28,
        }} />
      )}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,82,255,0.12) 0%, transparent 70%)" }} />
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 30%, rgba(0,0,0,0.65) 70%, rgba(0,0,0,0.95) 100%)" }} />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/70 via-transparent to-black/80" />
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: 0.035,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
      }} />

      <div className="relative z-10 w-full max-w-[360px] mx-auto px-5 py-14 flex flex-col items-center">

        <div className="mb-7">
          {link.coverUrl ? (
            <img src={link.coverUrl} alt={link.title} className="w-[220px] h-[220px] object-cover"
              style={{ borderRadius: "20px", boxShadow: "0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07)" }} />
          ) : (
            <div className="w-[220px] h-[220px] flex items-center justify-center bg-white/[0.04]"
              style={{ borderRadius: "20px", boxShadow: "0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07)" }}>
              <svg className="w-14 h-14 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
        </div>

        <h1 className="text-center text-white font-black leading-[1.15] mb-[6px]"
          style={{ fontSize: "clamp(22px, 6vw, 28px)", letterSpacing: "-0.02em" }}>
          {link.title}
        </h1>
        <p className="text-center text-white/40 text-[12px] tracking-[0.22em] uppercase font-medium mb-9">
          {link.artist}
        </p>

        <div className="w-full flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/[0.07]" />
          <span className="text-[10px] text-white/25 tracking-[0.25em] uppercase font-medium">Izaberi platformu</span>
          <div className="flex-1 h-px bg-white/[0.07]" />
        </div>

        <div className="w-full space-y-2.5">
          {activePlatforms.map(p => (
            <button
              key={p.key}
              onClick={() => handlePlatformClick(p.clickKey, link[p.key] as string)}
              className="group w-full flex items-center gap-4 px-5 rounded-2xl transition-all duration-200 active:scale-[0.985]"
              style={{ height: "58px", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,255,255,0.10)";
                el.style.border = "1px solid rgba(255,255,255,0.15)";
                el.style.transform = "translateY(-2px)";
                el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.5)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,255,255,0.055)";
                el.style.border = "1px solid rgba(255,255,255,0.08)";
                el.style.transform = "";
                el.style.boxShadow = "";
              }}
            >
              <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${p.color}18`, color: p.color }}>
                <p.Icon size={18} />
              </span>
              <span className="flex-1 text-left text-[13.5px] font-semibold text-white/85 group-hover:text-white transition-colors">
                {p.label}
              </span>
              <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors"
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
          {activePlatforms.length === 0 && (
            <p className="text-center text-white/25 text-sm py-6">Nema dostupnih platformi.</p>
          )}
        </div>

        {/* Instagram story download */}
        <div className="w-full mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] text-white/20 tracking-[0.25em] uppercase font-medium">Podeli</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <button
            onClick={handleShareStory}
            disabled={generatingStory}
            className="w-full flex items-center justify-center gap-2.5 h-12 rounded-2xl text-[13px] font-semibold transition-all disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, rgba(131,58,180,0.18) 0%, rgba(253,29,29,0.12) 50%, rgba(252,176,69,0.12) 100%)",
              border: "1px solid rgba(131,58,180,0.25)",
              color: "rgba(255,255,255,0.65)",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(131,58,180,0.30) 0%, rgba(253,29,29,0.20) 50%, rgba(252,176,69,0.18) 100%)";
              e.currentTarget.style.color = "rgba(255,255,255,0.90)";
              e.currentTarget.style.borderColor = "rgba(131,58,180,0.45)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(131,58,180,0.18) 0%, rgba(253,29,29,0.12) 50%, rgba(252,176,69,0.12) 100%)";
              e.currentTarget.style.color = "rgba(255,255,255,0.65)";
              e.currentTarget.style.borderColor = "rgba(131,58,180,0.25)";
            }}
          >
            {generatingStory ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generišem...
              </>
            ) : (
              <>
                {/* Instagram gradient camera icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
                </svg>
                {canNativeShare ? "Okači na Instagram story" : "Sačuvaj story sliku"}
              </>
            )}
          </button>
          <p className="text-center text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.18)" }}>
            {canNativeShare ? "Otvara Instagram — izaberi Stories" : "1080×1920 PNG · spreman za Instagram priču"}
          </p>
        </div>

        <div className="mt-10 flex flex-col items-center gap-[6px]">
          <a href="/" className="opacity-30 hover:opacity-60 transition-opacity">
            <img src="/leflow-logo-white.png" alt="Studio LeFlow" className="h-[18px] object-contain" />
          </a>
          <p className="text-[9px] text-white/20 tracking-[0.3em] uppercase">Studio LeFlow</p>
        </div>
      </div>
    </div>
  );
}
