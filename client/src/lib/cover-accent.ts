// Accent colour taken from cover art - shared by the smart link page (l.tsx)
// and the animated Instagram story video (story-video.ts), so both match.

export type HSL = [number, number, number];
export const OAK_HSL: HSL = [30.6, 42, 63];

export function rgbToHsl(r: number, g: number, b: number): HSL {
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

/** Saturation-weighted average of a 24px downscale, clamped to a readable mid-tone on near-black. */
export function accentFromImage(img: HTMLImageElement): HSL {
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
    const [h, s] = rgbToHsl(r / w, g / w, b / w);
    return [h, Math.min(78, Math.max(s, 28)), 64];
  } catch {
    return OAK_HSL; // tainted canvas (cover without CORS)
  }
}

/** Cover images must load with CORS (and a cache-buster) or the canvas gets tainted. */
export function loadCorsImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src.startsWith("data:") || src.startsWith("blob:") ? src : src.includes("?") ? `${src}&_dc=1` : `${src}?_dc=1`;
  });
}

export const hsl = ([h, s, l]: HSL, a = 1, dl = 0) => `hsla(${h}, ${s}%, ${Math.max(0, Math.min(100, l + dl))}%, ${a})`;
