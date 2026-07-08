import ffmpegPath from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import { PassThrough, Readable } from "stream";
import FFT from "fft.js";

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

const SAMPLE_RATE = 5512;
const FRAME_SIZE = 4096;
const HOP_SIZE = 2048;
// Log-spaced band edges (FFT bin indices for a 4096-point FFT at 5512Hz) - loosely modeled on
// the band split used by Shazam-style "peak per band" fingerprinting.
const BAND_EDGES = [0, 10, 20, 40, 80, 160, 511];

function decodeToPcm(buffer: Buffer): Promise<Int16Array> {
  return new Promise((resolve, reject) => {
    const input = Readable.from(buffer);
    const output = new PassThrough();
    const chunks: Buffer[] = [];
    output.on("data", (chunk: Buffer) => chunks.push(chunk));
    output.on("end", () => {
      const raw = Buffer.concat(chunks);
      resolve(new Int16Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 2)));
    });
    output.on("error", reject);

    ffmpeg(input)
      .audioChannels(1)
      .audioFrequency(SAMPLE_RATE)
      .format("s16le")
      .on("error", reject)
      .pipe(output, { end: true });
  });
}

function hannWindow(size: number): Float64Array {
  const w = new Float64Array(size);
  for (let i = 0; i < size; i++) {
    w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return w;
}

/**
 * Computes a heuristic spectral fingerprint: one dominant-band index per overlapping frame.
 * This is NOT chromaprint/AcoustID-grade - it's a coarse "which frequency band is loudest"
 * sequence, good enough to flag likely matches for manual review, not forensic proof on its own.
 */
export async function computeFingerprint(buffer: Buffer): Promise<number[] | null> {
  try {
    const pcm = await decodeToPcm(buffer);
    if (pcm.length < FRAME_SIZE) return null;

    const window = hannWindow(FRAME_SIZE);
    const fft = new FFT(FRAME_SIZE);
    const out = fft.createComplexArray();
    const data = new Array(FRAME_SIZE).fill(0);
    const fingerprint: number[] = [];

    for (let start = 0; start + FRAME_SIZE <= pcm.length; start += HOP_SIZE) {
      for (let i = 0; i < FRAME_SIZE; i++) {
        data[i] = (pcm[start + i]! / 32768) * window[i]!;
      }
      fft.realTransform(out, data);
      fft.completeSpectrum(out);

      let bestBand = 0;
      let bestMagnitude = -1;
      for (let band = 0; band < BAND_EDGES.length - 1; band++) {
        let bandMax = 0;
        for (let bin = BAND_EDGES[band]!; bin < BAND_EDGES[band + 1]!; bin++) {
          const re = out[2 * bin];
          const im = out[2 * bin + 1];
          const magnitude = re * re + im * im;
          if (magnitude > bandMax) bandMax = magnitude;
        }
        if (bandMax > bestMagnitude) {
          bestMagnitude = bandMax;
          bestBand = band;
        }
      }
      fingerprint.push(bestBand);
    }

    return fingerprint;
  } catch (error) {
    console.error("[RIGHTS-PROTECTION] Fingerprint computation failed:", error);
    return null;
  }
}

/**
 * Compares two fingerprints with a sliding offset alignment (handles trimmed/shifted clips),
 * returning the best match percentage (0-100) found across all overlaps.
 */
export function compareFingerprint(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  let best = 0;

  for (let offset = -shorter.length + 1; offset < longer.length; offset++) {
    let matches = 0;
    let compared = 0;
    for (let i = 0; i < shorter.length; i++) {
      const j = i + offset;
      if (j < 0 || j >= longer.length) continue;
      compared++;
      if (shorter[i] === longer[j]) matches++;
    }
    if (compared === 0) continue;
    const overlapFraction = compared / shorter.length;
    // Require a meaningful overlap so a 2-frame coincidence at the far edge doesn't score 100%.
    if (overlapFraction < 0.3) continue;
    const score = (matches / compared) * 100;
    if (score > best) best = score;
  }

  return Math.round(best);
}
