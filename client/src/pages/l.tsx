import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Check, Link2, Loader2, Music2, Instagram } from "lucide-react";
import { useParams } from "wouter";
import { useEffect, useState } from "react";
import type { SmartLink } from "@shared/schema";
import QRCode from "qrcode";
import { SMART_LINK_PLATFORMS } from "@/lib/smart-link-platforms";


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

  // ── 2. Background - two blend passes for vivid saturated color ────────────
  if (coverImg) {
    const bgB = blurredCanvas(coverImg, W, H, 90);
    // Primary vivid fill
    ctx.save();
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    ctx.globalAlpha = 0.88;
    ctx.drawImage(bgB, 0, 0, W, H);
    ctx.restore();
    // Hard-light pass - pops contrast and saturation
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
  await QRCode.toCanvas(qrC, `${window.location.origin}/${link.slug}`, {
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
  ctx.fillText(`music.studioleflow.com/${link.slug}`, W / 2, urlY);
  ctx.shadowBlur = 0;

  // ── Logo - dole, uvek prikovano ───────────────────────────────────────────
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

  // Web Share API with files - works on iOS Safari 15+ and Android Chrome
  if (typeof navigator.share === "function" && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `${link.title} - ${link.artist}`,
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

// ─── Cover colour ─────────────────────────────────────────────────────────────
// The page takes its accent from the cover art: a saturation-weighted average of
// a 24x24 downscale, then clamped to a readable mid-tone. Falls back to oak when
// the cover can't be read (no cover, CORS).
type RGB = [number, number, number];
const OAK: RGB = [201, 162, 122];

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
}

function useCoverAccent(url: string | null | undefined) {
  const [hsl, setHsl] = useState<[number, number, number]>(() => rgbToHsl(OAK));
  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 24;
        const x = c.getContext("2d", { willReadFrequently: true })!;
        x.drawImage(img, 0, 0, 24, 24);
        const d = x.getImageData(0, 0, 24, 24).data;
        let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i]!, G = d[i + 1]!, B = d[i + 2]!;
          const max = Math.max(R, G, B), min = Math.min(R, G, B);
          const sat = max ? (max - min) / max : 0;
          const lum = max / 255;
          const wt = sat * sat * (lum > 0.18 && lum < 0.96 ? 1 : 0.08) + 0.01;
          r += R * wt; g += G * wt; b += B * wt; w += wt;
        }
        const [h, s] = rgbToHsl([r / w, g / w, b / w]);
        // readable on near-black: mid lightness, never neon, never grey mush
        setHsl([h, Math.min(78, Math.max(s, 28)), 64]);
      } catch { /* tainted canvas - keep oak */ }
    };
    img.src = url.includes("?") ? `${url}&_dc=1` : `${url}?_dc=1`;
    return () => { cancelled = true; };
  }, [url]);
  const [h, s, l] = hsl;
  return {
    accent: `hsl(${h} ${s}% ${l}%)`,
    accentSoft: `hsl(${h} ${s}% ${l}% / 0.16)`,
    glow: `hsl(${h} ${Math.min(s + 10, 90)}% 45% / 0.55)`,
    label: `hsl(${h} ${Math.max(s - 10, 20)}% 52%)`,
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
  const [generatingStory, setGeneratingStory] = useState(false);
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

  const { accent, accentSoft, glow, label } = useCoverAccent(link?.coverUrl);

  // The platform opens straight from the click (a real <a target=_blank>), and the
  // click is recorded in the background with keepalive. Opening only after an awaited
  // fetch got the new tab blocked on iOS Safari (no longer a user gesture).
  function trackClick(platform: string) {
    try {
      fetch(`/api/l/${slug}/click`, { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform }) }).catch(() => {});
    } catch { /* tracking must never block the click */ }
  }

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function handleShareStory() {
    if (!link || generatingStory) return;
    setGeneratingStory(true);
    try {
      await shareToStory(link);
    } catch (e: any) {
      if (e?.name !== "AbortError") console.error("Story share failed", e);
    } finally {
      setGeneratingStory(false);
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
                  onClick={handleShareStory}
                  aria-busy={generatingStory}
                  className={`inline-flex items-center gap-2 h-10 px-4 rounded-full text-[13px] font-medium text-white/75 border border-white/[0.12] hover:text-white hover:border-white/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${generatingStory ? "opacity-60 pointer-events-none" : ""}`}
                >
                  {generatingStory ? <Loader2 className="w-4 h-4 animate-spin" /> : <Instagram className="w-4 h-4" />}
                  {generatingStory ? "Pravim sliku..." : canNativeShare ? "Story za Instagram" : "Sačuvaj story sliku"}
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
    </div>
  );
}
