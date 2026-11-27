// Slow "live" level meter along the bottom edge of the homepage hero - the
// studio's audio motif in motion. Pure CSS (.eq-bar in index.css), so it costs
// nothing on the main thread; reduced-motion visitors get static bars.

const COUNT = 96;

// deterministic pseudo-random so server/client and every visit look the same
function rand(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const BARS = Array.from({ length: COUNT }, (_, i) => {
  // louder in the middle, quieter at the edges, like a mix's low-mid hump
  const center = 1 - Math.abs(i - COUNT / 2) / (COUNT / 2);
  return {
    height: 18 + center * 46 + rand(i, 1) * 22,
    dur: 1.1 + rand(i, 2) * 1.4,
    delay: -rand(i, 3) * 2.5,
    min: 0.15 + rand(i, 4) * 0.3,
  };
});

export function HeroSpectrum({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-[3] h-24 flex items-end justify-between gap-[2px] px-6 pointer-events-none opacity-60 [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)] ${className}`}
      aria-hidden="true"
    >
      {BARS.map((b, i) => (
        <span
          key={i}
          className="eq-bar flex-1 max-w-[4px] rounded-t-full bg-primary/50"
          style={{
            height: b.height,
            ["--eq-dur" as string]: `${b.dur}s`,
            ["--eq-delay" as string]: `${b.delay}s`,
            ["--eq-min" as string]: b.min,
          }}
        />
      ))}
    </div>
  );
}
