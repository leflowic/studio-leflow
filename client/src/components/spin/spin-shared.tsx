import { Headphones, TrendingUp, Minus, Pin, Ticket, Coins } from "lucide-react";
import leflowLogo from "@/assets/leflow-logo.png";

// Shared bits for the "Ploča dana" page (/ploca). The server decides every
// reward (POST /api/spin, see server/spin.ts); the record here is only the
// animation. Its 8 sectors are visual and do NOT reflect the real odds.

export type Reward =
  | "coins_5" | "coins_10" | "coins_25" | "coins_50" | "coins_100"
  | "extra_listen" | "feature_post" | "nothing"
  | "studio_50" | "points"; // retired, history only
export type SpinResult = { reward: Reward; title: string; detail: string; voucher: { code: string; expiresAt: string } | null };
export type SpinToday =
  | { enabled: false }
  | { enabled: true; date: string; spun: boolean; result: SpinResult | null; balance: number; shopEnabled: boolean };

export const COIN_AMOUNT: Partial<Record<Reward, number>> = { coins_5: 5, coins_10: 10, coins_25: 25, coins_50: 50, coins_100: 100 };
export const isCoin = (r: Reward) => r in COIN_AMOUNT;
export const isBigWin = (r: Reward) => r === "coins_50" || r === "coins_100" || r === "studio_50";

export const ICONS: Record<Reward, React.ElementType> = {
  coins_5: Coins, coins_10: Coins, coins_25: Coins, coins_50: Coins, coins_100: Coins,
  extra_listen: Headphones, points: TrendingUp, nothing: Minus, feature_post: Pin, studio_50: Ticket,
};

/** Prize list shown on the page - keep in sync with BASE_WEIGHTS in server/spin.ts. */
export const PRIZES: Array<{ reward: Reward; title: string; detail: string; big?: boolean }> = [
  { reward: "coins_100", title: "+100 SC", detail: "Glavni dobitak. Retko.", big: true },
  { reward: "coins_50", title: "+50 SC", detail: "Odličan dobitak." },
  { reward: "coins_25", title: "+25 SC", detail: "Lep dobitak." },
  { reward: "coins_10", title: "+10 SC", detail: "Studio Coins za prodavnicu." },
  { reward: "coins_5", title: "+5 SC", detail: "Studio Coins za prodavnicu." },
  { reward: "extra_listen", title: "+1 slušanje u Pogodi Pesmu", detail: "Jedno slušanje više u današnjoj igri." },
  { reward: "feature_post", title: "Istaknuta objava", detail: "Tvoja poslednja objava stoji na vrhu zajednice 24 sata." },
  { reward: "nothing", title: "Prazna strana", detail: "Ovaj put ništa. Ploča se okreće ponovo sutra." },
];

export const SECTORS: Reward[] = ["coins_5", "coins_25", "nothing", "coins_10", "extra_listen", "coins_50", "feature_post", "coins_100"];

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
      {/* Shadow lives on a static disc behind the record - a filter on the
          rotating SVG would rotate its offset along with the record. */}
      <div className="absolute inset-[1.5%] rounded-full shadow-2xl shadow-black/60" aria-hidden="true" />
      {/* Needle */}
      <div className="absolute left-1/2 -top-1 -translate-x-1/2 z-10 flex flex-col items-center" aria-hidden="true">
        <div className="w-3.5 h-3.5 rounded-full bg-primary shadow" />
        <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[14px] border-l-transparent border-r-transparent border-t-primary -mt-0.5" />
      </div>
      <svg
        viewBox="-150 -150 300 300"
        className="relative w-full h-full"
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
          const coins = COIN_AMOUNT[r];
          const color = isBigWin(r) ? "hsl(32 42% 62%)" : "rgba(255,255,255,0.6)";
          return (
            <g key={i} transform={`translate(${Math.cos(a) * 110} ${Math.sin(a) * 110}) rotate(${mid + 90})`}>
              {coins ? (
                <>
                  <text y="2" textAnchor="middle" fontSize="19" fontWeight="600" fill={color} fontFamily="'Geist Mono', ui-monospace, monospace">{coins}</text>
                  <text y="15" textAnchor="middle" fontSize="8" fontWeight="600" letterSpacing="1" fill={color} fillOpacity="0.75" fontFamily="'Geist Mono', ui-monospace, monospace">SC</text>
                </>
              ) : (
                <foreignObject x="-11" y="-11" width="22" height="22">
                  <Icon width={22} height={22} strokeWidth={1.75} color={color} />
                </foreignObject>
              )}
            </g>
          );
        })}
        <circle r="52" fill="hsl(32 42% 62%)" />
        <circle r="50" fill="none" stroke="#000" strokeOpacity="0.15" />
        {/* Studio logo on the label (black mark, 1321x1014) */}
        <image href={leflowLogo} x={-24} y={-18.4} width={48} height={36.8} preserveAspectRatio="xMidYMid meet" />
      </svg>
    </div>
  );
}
