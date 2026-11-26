// Ploča dana sound - fully synthesized with Web Audio (no sample files, so no
// licensing question and nothing extra to download). Everything is scheduled
// on the AudioContext clock, so ticks line up with the CSS spin animation.
//
//   needle drop  - soft thump + a little noise when the spin starts
//   crackle      - quiet vinyl surface noise (noise levels cut 40% on owner request 2026-11-26) with random pops while spinning
//   ticks        - a click every time a sector edge passes the needle, timed
//                  from the same cubic-bezier the record uses, so they slow
//                  down together with the record
//   result       - warm chord for a prize, a brighter arpeggio for the studio
//                  voucher, a gentle "record stopping" pitch-down for nothing
//
// Muted state is remembered in localStorage ("ploca_zvuk" = "off").

import type { Reward } from "./spin-shared";

const LS_KEY = "ploca_zvuk";
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;

export function isSoundOn(): boolean {
  try { return localStorage.getItem(LS_KEY) !== "off"; } catch { return true; }
}
export function setSoundOn(on: boolean) {
  try { localStorage.setItem(LS_KEY, on ? "on" : "off"); } catch {}
}

function audio(): { ctx: AudioContext; out: GainNode; noise: AudioBuffer } | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as any).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 4;
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return { ctx, out: master!, noise: noiseBuf! };
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function noiseHit(a: NonNullable<ReturnType<typeof audio>>, t: number, opts: { type: BiquadFilterType; freq: number; q?: number; peak: number; decay: number }) {
  const src = a.ctx.createBufferSource();
  src.buffer = a.noise;
  const f = a.ctx.createBiquadFilter();
  f.type = opts.type; f.frequency.value = opts.freq; f.Q.value = opts.q ?? 0.7;
  const g = a.ctx.createGain();
  env(g, t, opts.peak, 0.002, opts.decay);
  src.connect(f).connect(g).connect(a.out);
  src.start(t, Math.random() * 1.5, opts.decay + 0.05);
}

function tone(a: NonNullable<ReturnType<typeof audio>>, t: number, freq: number, opts: { type?: OscillatorType; peak: number; attack?: number; decay: number; to?: number }) {
  const o = a.ctx.createOscillator();
  o.type = opts.type ?? "sine";
  o.frequency.setValueAtTime(freq, t);
  if (opts.to) o.frequency.exponentialRampToValueAtTime(opts.to, t + opts.decay);
  const g = a.ctx.createGain();
  env(g, t, opts.peak, opts.attack ?? 0.01, opts.decay);
  o.connect(g).connect(a.out);
  o.start(t);
  o.stop(t + (opts.attack ?? 0.01) + opts.decay + 0.05);
}

// CSS cubic-bezier(x1, y1, x2, y2) sampled into (time fraction, progress) pairs.
function bezierSamples(x1: number, y1: number, x2: number, y2: number, n = 1200) {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, m = 1 - u;
    const x = 3 * m * m * u * x1 + 3 * m * u * u * x2 + u * u * u;
    const y = 3 * m * m * u * y1 + 3 * m * u * u * y2 + u * u * u;
    pts.push([x, y]);
  }
  return pts;
}

/** Call inside the click handler: iOS/Safari only unlock audio during a user gesture. */
export function primeAudio() {
  if (isSoundOn()) audio();
}

/** Call right when the record starts turning. Angles in degrees, duration in ms. */
export function playSpin(fromDeg: number, toDeg: number, durationMs: number, sectorCount: number) {
  if (!isSoundOn()) return;
  const a = audio();
  if (!a) return;
  const t0 = a.ctx.currentTime + 0.02;
  const dur = durationMs / 1000;

  // needle drop
  tone(a, t0, 70, { peak: 0.35, decay: 0.16, to: 45 });
  noiseHit(a, t0, { type: "lowpass", freq: 1400, peak: 0.108, decay: 0.07 });

  // surface crackle bed
  const bed = a.ctx.createBufferSource();
  bed.buffer = a.noise; bed.loop = true;
  const hp = a.ctx.createBiquadFilter(); hp.type = "bandpass"; hp.frequency.value = 2400; hp.Q.value = 0.5;
  const bedGain = a.ctx.createGain();
  bedGain.gain.setValueAtTime(0.0001, t0);
  bedGain.gain.exponentialRampToValueAtTime(0.0108, t0 + 0.15);
  bedGain.gain.setValueAtTime(0.0108, t0 + Math.max(0.2, dur - 0.5));
  bedGain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + 0.3);
  bed.connect(hp).connect(bedGain).connect(a.out);
  bed.start(t0); bed.stop(t0 + dur + 0.4);
  const pops = Math.round(dur * 7);
  for (let i = 0; i < pops; i++) {
    noiseHit(a, t0 + Math.random() * dur, { type: "highpass", freq: 3000, peak: 0.018 + Math.random() * 0.03, decay: 0.008 });
  }

  // ticks at every sector edge crossing, following the record's easing
  if (dur < 1) return;
  const step = 360 / sectorCount;
  const total = toDeg - fromDeg;
  let lastEdge = Math.floor(fromDeg / step);
  let lastTickT = -1;
  for (const [x, y] of bezierSamples(0.12, 0.7, 0.12, 1)) {
    const angle = fromDeg + y * total;
    const edge = Math.floor(angle / step);
    if (edge !== lastEdge) {
      lastEdge = edge;
      const t = t0 + x * dur;
      if (t - lastTickT < 0.035) continue; // too fast to hear as separate clicks
      lastTickT = t;
      const slow = Math.min(1, x * 1.6); // later ticks are slower and a bit louder
      noiseHit(a, t, { type: "bandpass", freq: 3200, q: 2.2, peak: 0.12 + slow * 0.14, decay: 0.014 });
      tone(a, t, 1900, { type: "triangle", peak: 0.03 + slow * 0.03, attack: 0.001, decay: 0.012 });
    }
  }
}

/** Call when the result is revealed. */
export function playResult(reward: Reward) {
  if (!isSoundOn()) return;
  const a = audio();
  if (!a) return;
  const t = a.ctx.currentTime + 0.03;
  const note = (n: number) => 440 * Math.pow(2, n / 12); // semitones from A4

  if (reward === "studio_50") {
    // bright rising major arpeggio + octave shimmer
    [-5, -1, 2, 7, 11].forEach((n, i) => {
      tone(a, t + i * 0.085, note(n), { type: "triangle", peak: 0.11, decay: 0.9 });
      tone(a, t + i * 0.085, note(n + 12), { peak: 0.035, decay: 0.7 });
    });
    noiseHit(a, t + 0.45, { type: "highpass", freq: 6000, peak: 0.018, decay: 0.6 });
  } else if (reward === "nothing") {
    // a record winding down
    tone(a, t, 196, { type: "triangle", peak: 0.08, decay: 0.55, to: 70 });
    noiseHit(a, t, { type: "lowpass", freq: 900, peak: 0.03, decay: 0.12 });
  } else {
    // warm two-note "got something"
    tone(a, t, note(0), { type: "triangle", peak: 0.1, decay: 0.5 });
    tone(a, t + 0.11, note(7), { type: "triangle", peak: 0.1, decay: 0.7 });
    tone(a, t + 0.11, note(19), { peak: 0.025, decay: 0.5 });
  }
}
