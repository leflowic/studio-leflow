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

  let coverImg: HTMLImageElement | null = null;
  if (link.coverUrl) {
    try { coverImg = await loadImg(link.coverUrl); } catch {}
  }

  // ── 1. Base ───────────────────────────────────────────────────────────────
  ctx.fillStyle = "#040007";
  ctx.fillRect(0, 0, W, H);

  // ── 2. Background — two blend passes for vivid saturated color ────────────
  if (coverImg) {
    const bgB = blurredCanvas(coverImg, W, H, 90);
    // Primary vivid fill
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 0.88;
    ctx.drawImage(bgB, 0, 0, W, H);
    ctx.restore();
    // Hard-light pass — pops contrast and saturation
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 0.22;
    ctx.globalCompositeOperation = "hard-light";
    ctx.drawImage(bgB, 0, 0, W, H);
    ctx.restore();
  }

  // ── 3. Vignettes ──────────────────────────────────────────────────────────
  // Top
  const tg = ctx.createLinearGradient(0, 0, 0, H * 0.20);
  tg.addColorStop(0, "rgba(0,0,0,0.82)");
  tg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H * 0.20);
  // Left / right side edges
  const lvg = ctx.createLinearGradient(0, 0, W * 0.20, 0);
  lvg.addColorStop(0, "rgba(0,0,0,0.35)"); lvg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = lvg; ctx.fillRect(0, 0, W * 0.20, H);
  const rvg = ctx.createLinearGradient(W, 0, W * 0.80, 0);
  rvg.addColorStop(0, "rgba(0,0,0,0.35)"); rvg.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = rvg; ctx.fillRect(W * 0.80, 0, W * 0.20, H);
  // Bottom fade to near-black
  const btg = ctx.createLinearGradient(0, H * 0.48, 0, H);
  btg.addColorStop(0,    "rgba(0,0,0,0)");
  btg.addColorStop(0.30, "rgba(0,0,0,0.60)");
  btg.addColorStop(0.60, "rgba(0,0,0,0.85)");
  btg.addColorStop(1,    "rgba(0,0,0,0.96)");
  ctx.fillStyle = btg; ctx.fillRect(0, H * 0.48, W, H * 0.52);

  // Load logo (drawn at bottom only)
  let logoImg: HTMLImageElement | null = null;
  try { logoImg = await loadImg(`${window.location.origin}/leflow-logo-white.png`); } catch {}

  // ── 4. Cover art ──────────────────────────────────────────────────────────
  const COVER = 750;
  const cx = (W - COVER) / 2;
  const cy = 130;

  if (coverImg) {
    // Colored glow halo
    const glow = blurredCanvas(coverImg, COVER, COVER, 7);
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 0.60;
    ctx.drawImage(glow, cx + 40, cy + 50, COVER - 80, COVER - 80);
    ctx.restore();

    // Drop shadow layer
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.95)";
    ctx.shadowBlur = 70; ctx.shadowOffsetY = 24;
    roundRect(ctx, cx, cy, COVER, COVER, 56);
    ctx.fillStyle = "#000"; ctx.fill();
    ctx.restore();

    // Cover image
    ctx.save();
    roundRect(ctx, cx, cy, COVER, COVER, 56);
    ctx.clip();
    ctx.drawImage(coverImg, cx, cy, COVER, COVER);
    ctx.restore();

    // Glassy inner border
    ctx.save();
    roundRect(ctx, cx, cy, COVER, COVER, 56);
    ctx.strokeStyle = "rgba(255,255,255,0.20)";
    ctx.lineWidth = 2.5; ctx.stroke();
    ctx.restore();

    // Subtle bottom-of-cover inner shade (depth)
    ctx.save();
    roundRect(ctx, cx, cy, COVER, COVER, 56);
    ctx.clip();
    const shd = ctx.createLinearGradient(0, cy + COVER * 0.6, 0, cy + COVER);
    shd.addColorStop(0, "rgba(0,0,0,0)");
    shd.addColorStop(1, "rgba(0,0,0,0.28)");
    ctx.fillStyle = shd; ctx.fillRect(cx, cy, COVER, COVER);
    ctx.restore();
  } else {
    ctx.save();
    roundRect(ctx, cx, cy, COVER, COVER, 56);
    ctx.fillStyle = "rgba(255,255,255,0.04)"; ctx.fill();
    ctx.restore();
  }

  // ── 6. Title ──────────────────────────────────────────────────────────────
  const titleY = cy + COVER + 108;
  ctx.textAlign = "center";
  ctx.shadowColor = "rgba(0,0,0,0.95)"; ctx.shadowBlur = 36;
  ctx.font = `800 94px system-ui, -apple-system, Arial, sans-serif`;
  ctx.fillStyle = "#ffffff";
  const titleLines = wrapText(ctx, link.title, W - 80);
  titleLines.slice(0, 2).forEach((line, i) => ctx.fillText(line, W / 2, titleY + i * 106));
  ctx.shadowBlur = 0;

  // ── 7. Artist ─────────────────────────────────────────────────────────────
  const artistY = titleY + Math.min(titleLines.length, 2) * 106 + 28;
  ctx.font = `300 44px system-ui, -apple-system, Arial, sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.40)";
  ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 18;
  ctx.fillText(link.artist.toUpperCase(), W / 2, artistY);
  ctx.shadowBlur = 0;

  // ── 8. Decorative divider ─────────────────────────────────────────────────
  const divY = artistY + 50;
  const divGrad = ctx.createLinearGradient(W / 2 - 140, divY, W / 2 + 140, divY);
  divGrad.addColorStop(0,   "rgba(255,255,255,0)");
  divGrad.addColorStop(0.5, "rgba(255,255,255,0.18)");
  divGrad.addColorStop(1,   "rgba(255,255,255,0)");
  ctx.fillStyle = divGrad;
  ctx.fillRect(W / 2 - 140, divY, 280, 1.5);

  // ── 9. Platform icons (SVG → Image → canvas) ─────────────────────────────
  const PLAT_DEFS = [
    { key: "spotifyUrl",    color: "#1DB954",
      path: "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" },
    { key: "youtubeUrl",    color: "#FF0000",
      path: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
    { key: "appleMusicUrl", color: "#FC3C44",
      path: "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" },
    { key: "soundcloudUrl", color: "#FF5500",
      path: "M20 14c0-2.21-1.79-4-4-4-.32 0-.63.04-.93.1A6.003 6.003 0 0 0 9 6c-3.31 0-6 2.69-6 6s2.69 6 6 6h11a3 3 0 0 0 0-6z" },
    { key: "tidalUrl",      color: "#00CFFF",
      path: "M12.012 3.992L8.008 8l4.004 4.008L8.008 16l4.004 4.008 4.004-4.004-4.004-4.004L16.016 8zm4.004 4.008l-4.004 4.004 4.004 4.004 4.004-4.004z" },
    { key: "deezerUrl",     color: "#A259FF",
      path: "M18.81 11.643h3.19v1.968h-3.19zm0-3.484h3.19v1.969h-3.19zm0 6.969h3.19v1.968h-3.19zm-4.27 3.485h3.19v1.968h-3.19zm0-3.484h3.19v1.968h-3.19zm0-3.485h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm-4.27 10.452h3.19v1.968H10.27zm0-3.484h3.19v1.968H10.27zm0-3.484h3.19v1.968H10.27zM6 18.612h3.19v1.968H6zm0-3.484h3.19v1.968H6zm-4.27 3.484h3.19v1.968H1.73z" },
  ].filter(p => (link as any)[p.key]);

  const ICON_SZ = 58, ICON_GAP = 18;

  const platImgs = await Promise.all(PLAT_DEFS.map(def => new Promise<HTMLImageElement | null>(res => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${ICON_SZ}" height="${ICON_SZ}"><path fill="${def.color}" d="${def.path}"/></svg>`;
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  })));

  let afterIconsY = divY + 50;
  if (PLAT_DEFS.length > 0) {
    const totalW = PLAT_DEFS.length * ICON_SZ + (PLAT_DEFS.length - 1) * ICON_GAP;
    let iconX = (W - totalW) / 2;
    const iconY = divY + 46;

    PLAT_DEFS.forEach((def, i) => {
      const img = platImgs[i];
      // Colored glass badge behind icon
      ctx.save();
      roundRect(ctx, iconX, iconY, ICON_SZ, ICON_SZ, 16);
      ctx.fillStyle = def.color + "1a";
      ctx.fill();
      roundRect(ctx, iconX, iconY, ICON_SZ, ICON_SZ, 16);
      ctx.strokeStyle = def.color + "44";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
      if (img) ctx.drawImage(img, iconX, iconY, ICON_SZ, ICON_SZ);
      iconX += ICON_SZ + ICON_GAP;
    });

    afterIconsY = iconY + ICON_SZ + 14;
  }

  // ── 10. Film grain (applied before QR so QR stays crisp) ─────────────────
  {
    const grain = document.createElement("canvas");
    grain.width = 400; grain.height = 400;
    const gc = grain.getContext("2d")!;
    const gd = gc.getImageData(0, 0, 400, 400);
    for (let i = 0; i < gd.data.length; i += 4) {
      const v = Math.floor(Math.random() * 255);
      gd.data[i] = gd.data[i + 1] = gd.data[i + 2] = v;
      gd.data[i + 3] = Math.floor(Math.random() * 11);
    }
    gc.putImageData(gd, 0, 0);
    const pat = ctx.createPattern(grain, "repeat");
    if (pat) { ctx.fillStyle = pat; ctx.fillRect(0, 0, W, H); }
  }

  // ── 11. QR code ───────────────────────────────────────────────────────────
  const QR_SIZE = 152;
  const qrPad = 16;
  const qrC = document.createElement("canvas");
  await QRCode.toCanvas(qrC, `${window.location.origin}/l/${link.slug}`, {
    width: QR_SIZE, margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });

  const qrX = (W - QR_SIZE) / 2;
  const logoH = logoImg ? Math.round((logoImg.naturalHeight / logoImg.naturalWidth) * 150) : 36;
  // Leave room: URL(40) + gap(52) + logo + bottomMargin(60)
  const bottomReserve = 40 + 52 + logoH + 60;
  const qrY = Math.max(afterIconsY + 56, H - QR_SIZE - qrPad * 2 - bottomReserve);

  ctx.save();
  roundRect(ctx, qrX - qrPad, qrY - qrPad, QR_SIZE + qrPad * 2, QR_SIZE + qrPad * 2, 20);
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 44;
  ctx.fill();
  ctx.restore();

  ctx.drawImage(qrC, qrX, qrY, QR_SIZE, QR_SIZE);

  // URL
  const urlY = qrY + QR_SIZE + qrPad + 40;
  ctx.font = `400 24px "Courier New", monospace`;
  ctx.fillStyle = "rgba(255,255,255,0.26)";
  ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 10;
  ctx.fillText(`studioleflow.com/l/${link.slug}`, W / 2, urlY);
  ctx.shadowBlur = 0;

  // ── Logo — dole, uvek prikovano ───────────────────────────────────────────
  if (logoImg) {
    const lW = 150;
    ctx.save(); ctx.globalAlpha = 0.38;
    ctx.drawImage(logoImg, (W - lW) / 2, H - 56 - logoH, lW, logoH);
    ctx.restore();
  } else {
    ctx.font = `300 26px system-ui, -apple-system, Arial, sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillText("STUDIO LEFLOW", W / 2, H - 58);
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
