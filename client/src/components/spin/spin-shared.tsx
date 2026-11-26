import { Headphones, TrendingUp, Minus, Pin, Ticket } from "lucide-react";

// Shared bits for the "Ploča dana" page (/ploca). The server decides every
// reward (POST /api/spin, see server/spin.ts); the record here is only the
// animation. Its 8 sectors are visual and do NOT reflect the real odds.

export type Reward = "studio_50" | "extra_listen" | "feature_post" | "points" | "nothing";
export type SpinResult = { reward: Reward; title: string; detail: string; voucher: { code: string; expiresAt: string } | null };
export type SpinToday =
  | { enabled: false }
  | {
      enabled: true; date: string; spun: boolean; result: SpinResult | null;
      studioPrizeEnabled: boolean; studioPrizesLeft: number; studioPrizesPerMonth: number; studioNote: string | null;
    };

export const ICONS: Record<Reward, React.ElementType> = {
  extra_listen: Headphones, points: TrendingUp, nothing: Minus, feature_post: Pin, studio_50: Ticket,
};

/** Prize list shown on the page - keep in sync with BASE_WEIGHTS in server/spin.ts. */
export const PRIZES: Array<{ reward: Reward; title: string; detail: string; studio?: boolean }> = [
  { reward: "studio_50", title: "50% popusta na snimanje + mix/master", detail: "Vaučer za jedan projekat, važi 60 dana. Retko - najviše 2 mesečno na celom sajtu.", studio: true },
  { reward: "extra_listen", title: "+1 slušanje u Pogodi Pesmu", detail: "Jedno slušanje više u današnjoj igri." },
  { reward: "feature_post", title: "Istaknuta objava", detail: "Tvoja poslednja objava stoji na vrhu zajednice 24 sata." },
  { reward: "nothing", title: "Prazna strana", detail: "Ovaj put ništa. Ploča se okreće ponovo sutra." },
];

export function sectorsFor(studioOn: boolean): Reward[] {
  return ["extra_listen", "nothing", "feature_post", "nothing", "extra_listen", "nothing", "feature_post", studioOn ? "studio_50" : "nothing"];
}

export const fmtDate = (d: string) => {
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(x.getDate())}.${p(x.getMonth() + 1)}.${x.getFullYear()}.`;
};

/** Rotation (deg, clockwise) that puts a sector holding `reward` under the needle at 12 o'clock.
 *  Returns the chosen sector index too, so only that one sector gets highlighted. */
export function rotationFor(sectors: Reward[], reward: Reward, from: number, turns: number, jitter: number): { rotation: number; index: number } {
  const deg = 360 / sectors.length;
  const indices = sectors.map((r, i) => (r === reward ? i : -1)).filter(i => i >= 0);
  const idx = indices.length ? indices[Math.floor(Math.random() * indices.length)]! : sectors.indexOf("nothing");
  const center = idx * deg + deg / 2;
  const target = (360 - center + jitter + 360) % 360;
  const base = from - (from % 360);
  return { rotation: base + turns * 360 + target, index: idx };
}

export function RecordDisc({ sectors, rotation, spinMs, highlight }: {
  sectors: Reward[]; rotation: number; spinMs: number | null; highlight: number | null;
}) {
  const deg = 360 / sectors.length;
  return (
    <div className="relative w-full aspect-square">
      {/* Needle */}
      <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-10 flex flex-col items-center" aria-hidden="true">
        <div className="w-3.5 h-3.5 rounded-full bg-primary shadow" />
        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[14px] border-l-transparent border-r-transparent border-t-primary -mt-0.5" />
      </div>
      <svg
        viewBox="-150 -150 300 300"
        className="w-full h-full drop-shadow-2xl"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: spinMs ? `transform ${spinMs}ms cubic-bezier(0.12, 0.7, 0.12, 1)` : "none",
        }}
        role="img"
        aria-label="Ploča dana"
      >
        <circle r="148" fill="#111214" />
        {Array.from({ length: 16 }, (_, i) => (
          <circle key={i} r={60 + i * 5.5} fill="none" stroke="#ffffff" strokeOpacity={i % 3 === 0 ? 0.07 : 0.035} strokeWidth="1" />
        ))}
        {sectors.map((_, i) => {
          const a = (i * deg - 90) * (Math.PI / 180);
          return <line key={i} x1={Math.cos(a) * 56} y1={Math.sin(a) * 56} x2={Math.cos(a) * 146} y2={Math.sin(a) * 146} stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" />;
        })}
        {highlight !== null && sectors.map((_, i) => {
          if (i !== highlight) return null;
          const a0 = (i * deg - 90) * (Math.PI / 180);
          const a1 = ((i + 1) * deg - 90) * (Math.PI / 180);
          const R = 146, r0 = 56;
          const d = `M ${Math.cos(a0) * r0} ${Math.sin(a0) * r0} L ${Math.cos(a0) * R} ${Math.sin(a0) * R} A ${R} ${R} 0 0 1 ${Math.cos(a1) * R} ${Math.sin(a1) * R} L ${Math.cos(a1) * r0} ${Math.sin(a1) * r0} A ${r0} ${r0} 0 0 0 ${Math.cos(a0) * r0} ${Math.sin(a0) * r0} Z`;
          return <path key={i} d={d} fill="hsl(var(--primary))" fillOpacity="0.14" />;
        })}
        {sectors.map((r, i) => {
          const Icon = ICONS[r];
          const mid = i * deg + deg / 2 - 90;
          const a = mid * (Math.PI / 180);
          return (
            <g key={i} transform={`translate(${Math.cos(a) * 112} ${Math.sin(a) * 112}) rotate(${mid + 90})`}>
              <foreignObject x="-11" y="-11" width="22" height="22">
                <Icon width={22} height={22} strokeWidth={1.75} color={r === "studio_50" ? "hsl(32 42% 62%)" : "rgba(255,255,255,0.55)"} />
              </foreignObject>
            </g>
          );
        })}
        <circle r="52" fill="hsl(32 42% 62%)" />
        <circle r="50" fill="none" stroke="#000" strokeOpacity="0.15" />
        <text y="-6" textAnchor="middle" fontSize="13" fontWeight="600" fill="#1b1c1e" fontFamily="Geist, system-ui, sans-serif">Studio</text>
        <text y="10" textAnchor="middle" fontSize="13" fontWeight="600" fill="#1b1c1e" fontFamily="Geist, system-ui, sans-serif">LeFlow</text>
        <circle r="4" fill="#111214" />
      </svg>
    </div>
  );
}
