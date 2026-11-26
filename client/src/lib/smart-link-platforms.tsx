import { SiSpotify, SiYoutube, SiApplemusic, SiSoundcloud, SiTidal } from "react-icons/si";

export const SMART_LINK_HUB = "music.studioleflow.com";

function DeezerIcon({ size = 13, style, className }: { size?: number; style?: React.CSSProperties; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={size} height={size} style={style} className={className}>
      <path d="M18.81 11.834h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0 6.967h3.19v1.969h-3.19zm-4.271 3.483h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm-4.27 10.45h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm-4.271 6.967h3.19v1.969H6v-1.969zm0-3.483h3.19v1.969H6v-1.969zm-4.27 3.483H5v1.969H1.73v-1.969z" />
    </svg>
  );
}

/** Platform list shared by the admin Smart Links tab and the owner's dashboard panel.
 *  `clickKey` is what `POST /api/l/:slug/click` records in `smart_link_clicks.platform`. */
export const SMART_LINK_PLATFORMS = [
  { key: "spotifyUrl", label: "Spotify", color: "#1DB954", clickKey: "spotify", Icon: SiSpotify, placeholder: "https://open.spotify.com/track/..." },
  { key: "youtubeUrl", label: "YouTube", color: "#FF0033", clickKey: "youtube", Icon: SiYoutube, placeholder: "https://youtu.be/..." },
  { key: "appleMusicUrl", label: "Apple Music", color: "#FC3C44", clickKey: "apple_music", Icon: SiApplemusic, placeholder: "https://music.apple.com/..." },
  { key: "soundcloudUrl", label: "SoundCloud", color: "#FF5500", clickKey: "soundcloud", Icon: SiSoundcloud, placeholder: "https://soundcloud.com/..." },
  { key: "tidalUrl", label: "Tidal", color: "#00CFFF", clickKey: "tidal", Icon: SiTidal, placeholder: "https://tidal.com/track/..." },
  { key: "deezerUrl", label: "Deezer", color: "#A259FF", clickKey: "deezer", Icon: DeezerIcon, placeholder: "https://www.deezer.com/track/..." },
] as const;

export type SmartLinkPlatformKey = (typeof SMART_LINK_PLATFORMS)[number]["key"];

export const nfSr = new Intl.NumberFormat("sr-RS");

/** Horizontal bar list of counts per platform (keyed by clickKey). */
export function PlatformBars({ byPlatform, total, unitLabel }: { byPlatform: Record<string, number>; total: number; unitLabel?: string }) {
  const rows = SMART_LINK_PLATFORMS
    .map(p => ({ ...p, n: byPlatform[p.clickKey] ?? 0 }))
    .filter(p => p.n > 0)
    .sort((a, b) => b.n - a.n);
  const max = Math.max(1, ...rows.map(r => r.n));
  const sum = Math.max(1, total);
  return (
    <ul className="space-y-2.5" aria-label={unitLabel}>
      {rows.map(p => (
        <li key={p.key} className="grid grid-cols-[6.5rem_minmax(0,1fr)_4.5rem] items-center gap-3">
          <span className="flex items-center gap-2 text-xs min-w-0">
            <p.Icon size={13} style={{ color: p.color }} />
            <span className="truncate">{p.label}</span>
          </span>
          <span className="h-1.5 rounded-full bg-muted overflow-hidden">
            <span className="block h-full rounded-full bg-primary" style={{ width: `${(p.n / max) * 100}%` }} />
          </span>
          <span className="text-xs font-mono tabular-nums text-right">
            {nfSr.format(p.n)} <span className="text-muted-foreground">{Math.round((p.n / sum) * 100)}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
