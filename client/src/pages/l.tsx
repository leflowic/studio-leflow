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

async function generateStoryBlob(link: SmartLink): Promise<Blob> {
  const W = 1080, H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Background
  ctx.fillStyle = "#070008";
  ctx.fillRect(0, 0, W, H);

  // Blurred cover background
  if (link.coverUrl) {
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = link.coverUrl! + (link.coverUrl!.includes("?") ? "&_dc=1" : "?_dc=1");
      });
      ctx.save();
      ctx.filter = "blur(55px)";
      ctx.globalAlpha = 0.38;
      ctx.drawImage(img, -120, -120, W + 240, H + 240);
      ctx.restore();
    } catch {}
  }

  // Gradient overlays
  const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.35);
  topGrad.addColorStop(0, "rgba(0,0,0,0.72)");
  topGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, H * 0.35);

  const botGrad = ctx.createLinearGradient(0, H * 0.55, 0, H);
  botGrad.addColorStop(0, "rgba(0,0,0,0)");
  botGrad.addColorStop(1, "rgba(0,0,0,0.88)");
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H * 0.55, W, H * 0.45);

  // Purple radial glow top
  const glow = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.9);
  glow.addColorStop(0, "rgba(99,52,255,0.22)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Cover art
  const COVER = 680;
  const cx = (W - COVER) / 2;
  const cy = 170;

  if (link.coverUrl) {
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.crossOrigin = "anonymous";
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = link.coverUrl! + (link.coverUrl!.includes("?") ? "&_dc=1" : "?_dc=1");
      });

      // Shadow
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.85)";
      ctx.shadowBlur = 80;
      ctx.shadowOffsetY = 30;
      roundRect(ctx, cx, cy, COVER, COVER, 40);
      ctx.fillStyle = "#000";
      ctx.fill();
      ctx.restore();

      // Image clipped to rounded rect
      ctx.save();
      roundRect(ctx, cx, cy, COVER, COVER, 40);
      ctx.clip();
      ctx.drawImage(img, cx, cy, COVER, COVER);
      ctx.restore();

      // Subtle border
      ctx.save();
      roundRect(ctx, cx, cy, COVER, COVER, 40);
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    } catch {
      // fallback placeholder
      ctx.save();
      roundRect(ctx, cx, cy, COVER, COVER, 40);
      ctx.fillStyle = "rgba(99,52,255,0.12)";
      ctx.fill();
      ctx.restore();
    }
  }

  // Title
  const titleY = cy + COVER + 90;
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold 78px system-ui, -apple-system, Arial, sans-serif`;
  const titleLines = wrapText(ctx, link.title, W - 160);
  titleLines.slice(0, 2).forEach((line, i) => {
    ctx.fillText(line, W / 2, titleY + i * 90);
  });

  // Artist
  const artistY = titleY + Math.min(titleLines.length, 2) * 90 + 36;
  ctx.font = `500 44px system-ui, -apple-system, Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.42)";
  ctx.fillText(link.artist.toUpperCase(), W / 2, artistY);

  // Divider
  const divY = artistY + 54;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillRect(W / 2 - 120, divY, 240, 1.5);

  // QR section label
  const labelY = divY + 54;
  ctx.font = `400 34px system-ui, -apple-system, Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillText("Skeniraj za slušanje", W / 2, labelY);

  // QR code
  const QR_SIZE = 220;
  const qrCanvas = document.createElement("canvas");
  await QRCode.toCanvas(qrCanvas, `${window.location.origin}/l/${link.slug}`, {
    width: QR_SIZE,
    margin: 1,
    color: { dark: "#ffffff", light: "#00000000" },
  });

  // QR background
  const qrX = (W - QR_SIZE) / 2;
  const qrY = labelY + 30;
  ctx.save();
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  roundRect(ctx, qrX - 20, qrY - 16, QR_SIZE + 40, QR_SIZE + 32, 20);
  ctx.fill();
  ctx.restore();

  ctx.drawImage(qrCanvas, qrX, qrY, QR_SIZE, QR_SIZE);

  // URL text
  const urlY = qrY + QR_SIZE + 44;
  ctx.font = `400 30px "Courier New", monospace`;
  ctx.fillStyle = "rgba(99,82,255,0.70)";
  ctx.fillText(`studioleflow.com/l/${link.slug}`, W / 2, urlY);

  // Branding at bottom
  ctx.font = `600 32px system-ui, -apple-system, Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.20)";
  ctx.fillText("Studio LeFlow", W / 2, H - 72);

  ctx.font = `400 24px system-ui, -apple-system, Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fillText("studioleflow.com", W / 2, H - 38);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("Canvas toBlob failed"));
      else resolve(blob);
    }, "image/png");
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
