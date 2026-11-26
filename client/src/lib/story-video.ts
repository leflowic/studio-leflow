import type { SmartLink } from "@shared/schema";
import { accentFromImage, loadCorsImage, hsl, OAK_HSL, type HSL } from "./cover-accent";

// Animated Instagram story for a smart link (like SoundCloud's story share):
// a 1080x1920, ~8s looping video - cover with a spinning record behind it,
// "playing" waveform bars in the cover's colour, title/artist, platforms and
// the link. Rendered on a canvas and recorded with MediaRecorder (MP4 where the
// browser can, WebM otherwise). Everything static is pre-rendered once; each
// frame only redraws the record rotation, the bars and the ambient glow, so it
// records smoothly on phones. The animation is periodic over DURATION so the
// story loops without a visible jump.

const W = 1080, H = 1920;
const FPS = 30;
export const STORY_DURATION_MS = 8000;

const PLATFORM_PATHS: Record<string, string> = {
  spotifyUrl: "M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z",
  youtubeUrl: "M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  appleMusicUrl: "M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701",
  soundcloudUrl: "M20 14c0-2.21-1.79-4-4-4-.32 0-.63.04-.93.1A6.003 6.003 0 0 0 9 6c-3.31 0-6 2.69-6 6s2.69 6 6 6h11a3 3 0 0 0 0-6z",
  tidalUrl: "M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996 4.004 12l4.004-4.004L12.012 12l-4.004 4.004 4.004 4.004 4.004-4.004L12.012 12l4.004-4.004-4.004-4.004zM16.042 7.996l3.979-3.979L24 7.996l-3.979 3.979z",
  deezerUrl: "M18.81 11.643h3.19v1.968h-3.19zm0-3.484h3.19v1.969h-3.19zm0 6.969h3.19v1.968h-3.19zm-4.27 3.485h3.19v1.968h-3.19zm0-3.484h3.19v1.968h-3.19zm0-3.485h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm-4.27 10.452h3.19v1.968H10.27zm0-3.484h3.19v1.968H10.27zm0-3.484h3.19v1.968H10.27zM6 18.612h3.19v1.968H6zm0-3.484h3.19v1.968H6zm-4.27 3.484h3.19v1.968H1.73z",
};

const MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.42E01E",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find(m => { try { return MediaRecorder.isTypeSupported(m); } catch { return false; } }) ?? null;
}

export function canRecordStoryVideo(): boolean {
  return typeof document !== "undefined" && "captureStream" in HTMLCanvasElement.prototype && !!pickMime();
}

// ── drawing helpers ────────────────────────────────────────────────────────────
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return [c, c.getContext("2d")!] as const;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const t = line ? `${line} ${w}` : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function coverDraw(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = img.width * s, sh = img.height * s;
  ctx.drawImage(img, x + (w - sw) / 2, y + (h - sh) / 2, sw, sh);
}

async function svgIcon(path: string, size: number, color: string): Promise<HTMLImageElement | null> {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${size}" height="${size}"><path fill="${color}" d="${path}"/></svg>`;
  try { return await loadCorsImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`); } catch { return null; }
}

// Layout
const COVER = 700, COVER_X = 110, COVER_Y = 270;
const REC_R = 330, REC_CX = COVER_X + COVER / 2 + 250, REC_CY = COVER_Y + COVER / 2;
const BARS_Y = 1395, BARS_W = 620, BAR_N = 38;

type Prepared = { bg: HTMLCanvasElement; record: HTMLCanvasElement; fg: HTMLCanvasElement; accent: HSL; seeds: number[] };

async function prepare(link: SmartLink): Promise<Prepared> {
  await Promise.all([
    document.fonts?.load?.('600 84px "Geist"'),
    document.fonts?.load?.('400 44px "Geist"'),
    document.fonts?.load?.('500 34px "Geist Mono"'),
  ].filter(Boolean)).catch(() => {});

  let cover: HTMLImageElement | null = null;
  if (link.coverUrl) { try { cover = await loadCorsImage(link.coverUrl); } catch { cover = null; } }
  const accent = cover ? accentFromImage(cover) : OAK_HSL;
  let logo: HTMLImageElement | null = null;
  try { logo = await loadCorsImage(`${window.location.origin}/leflow-logo-white.png`); } catch { logo = null; }

  // ── background: blurred cover, darkened, vignette ──
  const [bg, b] = canvas(W, H);
  b.fillStyle = "#0b0b0c"; b.fillRect(0, 0, W, H);
  if (cover) {
    const [tiny, t] = canvas(18, 32);
    coverDraw(t, cover, 0, 0, 18, 32);
    b.save(); b.globalAlpha = 0.55; b.imageSmoothingQuality = "high";
    b.drawImage(tiny, -60, -60, W + 120, H + 120);
    b.restore();
  }
  const vg = b.createRadialGradient(W / 2, H * 0.42, H * 0.15, W / 2, H * 0.5, H * 0.75);
  vg.addColorStop(0, "rgba(11,11,12,0.15)"); vg.addColorStop(1, "rgba(11,11,12,0.95)");
  b.fillStyle = vg; b.fillRect(0, 0, W, H);
  const bottom = b.createLinearGradient(0, H * 0.55, 0, H);
  bottom.addColorStop(0, "rgba(11,11,12,0)"); bottom.addColorStop(1, "rgba(11,11,12,0.9)");
  b.fillStyle = bottom; b.fillRect(0, H * 0.55, W, H * 0.45);
  // film grain
  const [gr, g] = canvas(256, 256);
  const gd = g.createImageData(256, 256);
  for (let i = 0; i < gd.data.length; i += 4) { const v = Math.random() * 255; gd.data[i] = gd.data[i + 1] = gd.data[i + 2] = v; gd.data[i + 3] = Math.random() * 10; }
  g.putImageData(gd, 0, 0);
  const pat = b.createPattern(gr, "repeat");
  if (pat) { b.fillStyle = pat; b.fillRect(0, 0, W, H); }

  // ── record (rotated per frame) ──
  const D = REC_R * 2;
  const [record, r] = canvas(D, D);
  r.translate(REC_R, REC_R);
  r.beginPath(); r.arc(0, 0, REC_R - 2, 0, Math.PI * 2); r.fillStyle = "#0b0b0c"; r.fill();
  for (let i = 0; i < 26; i++) {
    r.beginPath(); r.arc(0, 0, REC_R * 0.36 + i * (REC_R * 0.6 / 26), 0, Math.PI * 2);
    r.strokeStyle = `rgba(255,255,255,${i % 4 === 0 ? 0.07 : 0.03})`; r.lineWidth = 1.4; r.stroke();
  }
  const sheen = r.createLinearGradient(-REC_R, -REC_R, REC_R, REC_R);
  sheen.addColorStop(0.35, "rgba(255,255,255,0)"); sheen.addColorStop(0.5, "rgba(255,255,255,0.09)"); sheen.addColorStop(0.65, "rgba(255,255,255,0)");
  r.beginPath(); r.moveTo(0, 0); r.arc(0, 0, REC_R - 2, Math.PI, Math.PI * 1.5); r.closePath(); r.fillStyle = sheen; r.fill();
  r.beginPath(); r.arc(0, 0, REC_R * 0.32, 0, Math.PI * 2); r.fillStyle = hsl(accent, 1, -12); r.fill();
  if (logo) {
    const lw = REC_R * 0.3, lh = lw * (logo.height / logo.width);
    r.globalAlpha = 0.85; r.drawImage(logo, -lw / 2, -lh / 2, lw, lh); r.globalAlpha = 1;
  }
  r.beginPath(); r.arc(0, 0, 9, 0, Math.PI * 2); r.fillStyle = "#0b0b0c"; r.fill();

  // ── foreground: cover, title, artist, platforms, link, logo ──
  const [fg, f] = canvas(W, H);
  f.save(); f.shadowColor = "rgba(0,0,0,0.75)"; f.shadowBlur = 80; f.shadowOffsetY = 40;
  roundRect(f, COVER_X, COVER_Y, COVER, COVER, 28); f.fillStyle = "#111"; f.fill(); f.restore();
  f.save(); roundRect(f, COVER_X, COVER_Y, COVER, COVER, 28); f.clip();
  if (cover) coverDraw(f, cover, COVER_X, COVER_Y, COVER, COVER);
  else { f.fillStyle = "#17181a"; f.fillRect(COVER_X, COVER_Y, COVER, COVER); }
  f.restore();
  f.save(); roundRect(f, COVER_X, COVER_Y, COVER, COVER, 28); f.strokeStyle = "rgba(255,255,255,0.12)"; f.lineWidth = 2; f.stroke(); f.restore();

  f.textAlign = "center"; f.fillStyle = "#fff";
  f.font = '600 84px "Geist", system-ui, sans-serif';
  const titleLines = wrap(f, link.title, W - 160).slice(0, 2);
  let y = 1140;
  titleLines.forEach((line, i) => f.fillText(line, W / 2, y + i * 92));
  y += (titleLines.length - 1) * 92 + 70;
  f.font = '400 44px "Geist", system-ui, sans-serif';
  f.fillStyle = "rgba(255,255,255,0.66)";
  f.fillText(link.artist, W / 2, y);

  // platforms
  const plats = Object.keys(PLATFORM_PATHS).filter(k => (link as any)[k]);
  const CHIP = 92, GAP = 22;
  const icons = await Promise.all(plats.map(k => svgIcon(PLATFORM_PATHS[k]!, 44, "#ffffff")));
  const rowW = plats.length * CHIP + Math.max(0, plats.length - 1) * GAP;
  let cx = (W - rowW) / 2;
  const chipY = 1530;
  if (plats.length) {
    f.font = '500 30px "Geist", system-ui, sans-serif';
    f.fillStyle = "rgba(255,255,255,0.5)";
    f.fillText("Slušaj na", W / 2, chipY - 34);
  }
  plats.forEach((_, i) => {
    f.save(); roundRect(f, cx, chipY, CHIP, CHIP, 26);
    f.fillStyle = "rgba(255,255,255,0.08)"; f.fill();
    f.strokeStyle = "rgba(255,255,255,0.14)"; f.lineWidth = 2; f.stroke(); f.restore();
    const ic = icons[i];
    if (ic) f.drawImage(ic, cx + (CHIP - 44) / 2, chipY + (CHIP - 44) / 2, 44, 44);
    cx += CHIP + GAP;
  });

  // link pill
  const url = `music.studioleflow.com/${link.slug}`;
  f.font = '500 34px "Geist Mono", ui-monospace, monospace';
  const uw = Math.min(W - 120, f.measureText(url).width + 72);
  const uy = 1700;
  f.save(); roundRect(f, (W - uw) / 2, uy - 46, uw, 70, 35);
  f.fillStyle = hsl(accent, 0.18); f.fill();
  f.strokeStyle = hsl(accent, 0.55); f.lineWidth = 2; f.stroke(); f.restore();
  f.fillStyle = "#fff"; f.fillText(url, W / 2, uy, W - 160);

  if (logo) {
    const lw = 64, lh = lw * (logo.height / logo.width);
    f.globalAlpha = 0.55;
    f.drawImage(logo, W / 2 - lw / 2 - 118, H - 116 - lh / 2, lw, lh);
    f.font = '600 34px "Geist", system-ui, sans-serif';
    f.textAlign = "left"; f.fillStyle = "#fff";
    f.fillText("Studio LeFlow", W / 2 - 118 + lw / 2 + 16, H - 104);
    f.globalAlpha = 1; f.textAlign = "center";
  }

  const seeds = Array.from({ length: BAR_N }, (_, i) => 0.35 + 0.65 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1));
  return { bg, record, fg, accent, seeds };
}

function drawFrame(ctx: CanvasRenderingContext2D, p: Prepared, tMs: number) {
  const t = (tMs % STORY_DURATION_MS) / STORY_DURATION_MS; // 0..1, loops
  const TAU = Math.PI * 2;
  ctx.drawImage(p.bg, 0, 0);

  // breathing accent glow (one full period per loop)
  const glowA = 0.32 + 0.12 * Math.sin(TAU * t);
  const glow = ctx.createRadialGradient(W * 0.42, H * 0.28, 40, W * 0.42, H * 0.28, H * 0.48);
  glow.addColorStop(0, hsl(p.accent, glowA, -18)); glow.addColorStop(1, hsl(p.accent, 0, -18));
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  // record: 2 full turns per loop -> seamless
  ctx.save();
  ctx.translate(REC_CX, REC_CY);
  ctx.rotate(TAU * 2 * t);
  ctx.drawImage(p.record, -REC_R, -REC_R);
  ctx.restore();

  ctx.drawImage(p.fg, 0, 0);

  // waveform bars: integer harmonics of the loop period -> seamless
  const bw = BARS_W / BAR_N;
  const x0 = (W - BARS_W) / 2;
  for (let i = 0; i < BAR_N; i++) {
    const s = p.seeds[i]!;
    const v = 0.22 + 0.78 * s * (0.5 + 0.5 * Math.sin(TAU * (4 * t + i * 0.07)) * (0.6 + 0.4 * Math.sin(TAU * (2 * t + s))));
    const h = 14 + v * 92;
    ctx.fillStyle = hsl(p.accent, 0.55 + 0.45 * v);
    roundRect(ctx, x0 + i * bw + bw * 0.18, BARS_Y - h / 2, bw * 0.64, h, bw * 0.32);
    ctx.fill();
  }
}

/** Renders and records the story video. Takes about STORY_DURATION_MS of real time. */
export async function recordStoryVideo(link: SmartLink, onProgress?: (p: number) => void): Promise<{ blob: Blob; ext: "mp4" | "webm"; mime: string }> {
  const mime = pickMime();
  if (!mime) throw new Error("MediaRecorder unsupported");
  const prepared = await prepare(link);
  const [cv, ctx] = canvas(W, H);
  drawFrame(ctx, prepared, 0);

  const stream = (cv as any).captureStream(FPS) as MediaStream;
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: BlobPart[] = [];
  rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const done = new Promise<void>(res => { rec.onstop = () => res(); });

  rec.start(250);
  const start = performance.now();
  await new Promise<void>(resolve => {
    const tick = () => {
      const el = performance.now() - start;
      drawFrame(ctx, prepared, Math.min(el, STORY_DURATION_MS));
      onProgress?.(Math.min(1, el / STORY_DURATION_MS));
      if (el >= STORY_DURATION_MS) { resolve(); return; }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  rec.stop();
  stream.getTracks().forEach(tr => tr.stop());
  await done;
  const type = mime.split(";")[0]!;
  return { blob: new Blob(chunks, { type }), ext: type.includes("mp4") ? "mp4" : "webm", mime: type };
}

/** One still frame of the same design (fallback when the browser can't record video). */
export async function renderStoryPoster(link: SmartLink): Promise<Blob> {
  const prepared = await prepare(link);
  const [cv, ctx] = canvas(W, H);
  drawFrame(ctx, prepared, STORY_DURATION_MS * 0.3);
  return new Promise((res, rej) => cv.toBlob(b => (b ? res(b) : rej(new Error("toBlob failed"))), "image/png"));
}
