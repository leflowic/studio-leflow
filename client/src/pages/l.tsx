import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useEffect } from "react";
import type { SmartLink } from "@shared/schema";

const PLATFORMS = [
  {
    key: "spotifyUrl" as keyof SmartLink,
    clickKey: "spotify",
    label: "Spotify",
    color: "#1DB954",
    bg: "rgba(29,185,84,0.12)",
    border: "rgba(29,185,84,0.35)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
      </svg>
    ),
  },
  {
    key: "youtubeUrl" as keyof SmartLink,
    clickKey: "youtube",
    label: "YouTube",
    color: "#FF0000",
    bg: "rgba(255,0,0,0.10)",
    border: "rgba(255,0,0,0.30)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
      </svg>
    ),
  },
  {
    key: "appleMusicUrl" as keyof SmartLink,
    clickKey: "apple_music",
    label: "Apple Music",
    color: "#FA233B",
    bg: "rgba(250,35,59,0.10)",
    border: "rgba(250,35,59,0.30)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M23.994 6.124a9.23 9.23 0 0 0-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 0 0-1.877-.726 10.496 10.496 0 0 0-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026C4.786.07 4.043.15 3.34.428 2.004.958 1.04 1.88.475 3.208a5.857 5.857 0 0 0-.39 1.548c-.06.44-.087.882-.09 1.326 0 .06-.008.12-.01.18v12.777c.002.063.01.126.01.19.003.461.033.921.1 1.378.145.998.49 1.9 1.08 2.703.73.992 1.68 1.668 2.83 2.01.59.172 1.192.252 1.8.28.37.016.741.024 1.112.024h11.93c.335 0 .67-.016 1.003-.032.49-.024.978-.075 1.455-.193 1.254-.317 2.278-1 3.003-2.103.52-.782.796-1.65.886-2.585.025-.258.038-.518.04-.777.003-.134.01-.268.01-.402V6.508c0-.128-.007-.256-.01-.384zm-5.24 12.84a4.57 4.57 0 0 1-.073.586c-.118.59-.39 1.1-.83 1.51-.327.302-.71.507-1.123.62-.284.076-.576.116-.87.13-.144.007-.288.01-.432.01H8.565c-.149 0-.297-.003-.447-.01a4.45 4.45 0 0 1-.879-.132 3.02 3.02 0 0 1-1.092-.598c-.43-.392-.716-.88-.85-1.46a5.064 5.064 0 0 1-.095-.775c-.007-.14-.01-.28-.01-.42V8.886c0-.145.003-.29.01-.433.02-.288.06-.572.14-.85.17-.594.5-1.096.975-1.488.348-.284.748-.468 1.176-.572.27-.066.545-.097.822-.11.143-.006.285-.01.428-.01h6.723c.137 0 .274.004.41.01.28.012.557.045.828.112.53.136.992.397 1.37.79.312.322.527.71.636 1.14.063.254.093.513.1.774.003.13.007.26.007.39v10.312l-.013.314zM12 7.998a4.002 4.002 0 1 0 0 8.004A4.002 4.002 0 0 0 12 7.998zm0 6.578a2.576 2.576 0 1 1 0-5.152 2.576 2.576 0 0 1 0 5.152zm4.16-7.477a.936.936 0 1 0 0 1.872.936.936 0 0 0 0-1.872z"/>
      </svg>
    ),
  },
  {
    key: "soundcloudUrl" as keyof SmartLink,
    clickKey: "soundcloud",
    label: "SoundCloud",
    color: "#FF5500",
    bg: "rgba(255,85,0,0.10)",
    border: "rgba(255,85,0,0.30)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M1.175 12.225c-.015.065-.025.13-.025.195 0 .065.01.13.025.195l.467 2.043-.467 2.043c-.015.065-.025.13-.025.195 0 .065.01.13.025.195.077.327.374.562.717.562.344 0 .641-.235.717-.562l.531-2.43-.531-2.43c-.076-.327-.373-.562-.717-.562-.343 0-.64.235-.717.562zm2.21-2.8c-.019.08-.03.16-.03.242 0 .08.011.16.03.242l.582 4.63-.582 4.63c-.019.08-.03.16-.03.242 0 .35.278.625.627.625.348 0 .626-.276.626-.625l.66-5.115-.66-5.115c0-.35-.278-.626-.626-.626-.35 0-.627.276-.627.625zm2.233-.61c-.021.09-.033.18-.033.274 0 .094.012.184.033.274l.733 5.24-.733 5.24c-.021.09-.033.18-.033.274 0 .39.31.703.7.703.389 0 .7-.313.7-.703l.83-5.767-.83-5.767c0-.39-.311-.703-.7-.703-.39 0-.7.313-.7.703zm11.17-1.03c-.23-2.78-2.534-4.952-5.362-4.952-1.09 0-2.1.32-2.946.87-.323.215-.41.544-.41.852v10.92c0 .35.285.636.637.636h8.09c1.558 0 2.82-1.25 2.82-2.79 0-1.31-.904-2.41-2.132-2.72.088-.3.136-.617.136-.944 0-1.881-1.525-3.408-3.406-3.408-.217 0-.43.02-.636.06z"/>
      </svg>
    ),
  },
  {
    key: "tidalUrl" as keyof SmartLink,
    clickKey: "tidal",
    label: "Tidal",
    color: "#00FFFF",
    bg: "rgba(0,255,255,0.08)",
    border: "rgba(0,255,255,0.25)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996l4.004 4.004 4.004-4.004 4.004 4.004 4.004-4.004zM8.008 16.004l4.004-4.004 4.004 4.004L20.02 12l-4.004-4.004-4.004 4.004-4.004-4.004L4.004 12z"/>
      </svg>
    ),
  },
  {
    key: "deezerUrl" as keyof SmartLink,
    clickKey: "deezer",
    label: "Deezer",
    color: "#A04FFF",
    bg: "rgba(160,79,255,0.10)",
    border: "rgba(160,79,255,0.30)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
        <path d="M18.81 11.834h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0 6.967h3.19v1.969h-3.19zm-4.271 3.483h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm-4.27 10.45h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm-4.271 6.967h3.19v1.969H6v-1.969zm0-3.483h3.19v1.969H6v-1.969zm-4.27 3.483H5v1.969H1.73v-1.969z"/>
      </svg>
    ),
  },
];

export default function SmartLinkPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

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
      onSuccess: (targetUrl) => {
        window.open(targetUrl, "_blank", "noopener,noreferrer");
      },
    });
  }

  useEffect(() => {
    if (link) {
      document.title = `${link.title} — ${link.artist} | Studio LeFlow`;
    }
  }, [link]);

  const activePlatforms = link
    ? PLATFORMS.filter(p => link[p.key])
    : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (isError || !link) {
    return (
      <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center gap-4 text-center px-4">
        <p className="text-2xl font-bold text-white">Link nije pronađen</p>
        <p className="text-muted-foreground text-sm">Ovaj smart link ne postoji ili je obrisan.</p>
        <a href="/" className="text-primary text-sm underline underline-offset-4 mt-2">← Nazad na Studio LeFlow</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Blurred bg from cover */}
      {link.coverUrl && (
        <div
          className="absolute inset-0 opacity-20 blur-3xl scale-110"
          style={{ backgroundImage: `url(${link.coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
        />
      )}

      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_60%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#080808]/60 to-[#080808]" />

      {/* Content card */}
      <div className="relative z-10 w-full max-w-sm mx-auto px-5 py-10 flex flex-col items-center">
        {/* Cover art */}
        <div className="relative mb-6">
          {link.coverUrl ? (
            <img
              src={link.coverUrl}
              alt={link.title}
              className="w-52 h-52 rounded-2xl object-cover shadow-2xl"
              style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)" }}
            />
          ) : (
            <div
              className="w-52 h-52 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center"
              style={{ boxShadow: "0 25px 60px rgba(0,0,0,0.7)" }}
            >
              <svg className="w-16 h-16 text-primary/40" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
        </div>

        {/* Title & artist */}
        <h1 className="text-2xl font-bold text-white text-center leading-tight mb-1">{link.title}</h1>
        <p className="text-sm text-white/50 text-center mb-8 font-medium tracking-wide uppercase">{link.artist}</p>

        {/* Platform buttons */}
        <div className="w-full space-y-3">
          {activePlatforms.map(p => (
            <button
              key={p.key}
              onClick={() => handlePlatformClick(p.clickKey, link[p.key] as string)}
              className="w-full flex items-center gap-3 px-5 py-3.5 rounded-2xl font-semibold text-sm transition-all duration-200 active:scale-[0.98]"
              style={{
                background: p.bg,
                border: `1.5px solid ${p.border}`,
                color: p.color,
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.background = p.bg.replace("0.10", "0.20").replace("0.12", "0.22").replace("0.08", "0.16");
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.background = p.bg;
              }}
            >
              {p.icon}
              <span className="flex-1 text-left">Slušaj na {p.label}</span>
              <svg className="w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}

          {activePlatforms.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-4">Nema dostupnih platformi.</p>
          )}
        </div>

        {/* Branding */}
        <div className="mt-10 flex flex-col items-center gap-2 opacity-50 hover:opacity-80 transition-opacity">
          <a href="/" className="flex items-center gap-2">
            <img src="/leflow-logo-white.png" alt="Studio LeFlow" className="h-5 object-contain" />
          </a>
          <p className="text-[10px] text-white/40 tracking-widest uppercase">Studio LeFlow</p>
        </div>
      </div>
    </div>
  );
}
