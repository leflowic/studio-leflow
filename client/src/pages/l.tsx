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
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
      </svg>
    ),
  },
  {
    key: "youtubeUrl" as keyof SmartLink,
    clickKey: "youtube",
    label: "YouTube",
    color: "#FF0033",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    key: "appleMusicUrl" as keyof SmartLink,
    clickKey: "apple_music",
    label: "Apple Music",
    color: "#FC3C44",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
      </svg>
    ),
  },
  {
    key: "soundcloudUrl" as keyof SmartLink,
    clickKey: "soundcloud",
    label: "SoundCloud",
    color: "#FF5500",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M1.175 12.225c-.015.065-.025.13-.025.195 0 .065.01.13.025.195l.467 2.043-.467 2.043c-.015.065-.025.13-.025.195 0 .065.01.13.025.195.077.327.374.562.717.562.344 0 .641-.235.717-.562l.531-2.43-.531-2.43c-.076-.327-.373-.562-.717-.562-.343 0-.64.235-.717.562zm2.21-2.8c-.019.08-.03.16-.03.242 0 .08.011.16.03.242l.582 4.63-.582 4.63c-.019.08-.03.16-.03.242 0 .35.278.625.627.625.348 0 .626-.276.626-.625l.66-5.115-.66-5.115c0-.35-.278-.626-.626-.626-.35 0-.627.276-.627.625zm2.233-.61c-.021.09-.033.18-.033.274 0 .094.012.184.033.274l.733 5.24-.733 5.24c-.021.09-.033.18-.033.274 0 .39.31.703.7.703.389 0 .7-.313.7-.703l.83-5.767-.83-5.767c0-.39-.311-.703-.7-.703-.39 0-.7.313-.7.703zm11.17-1.03c-.23-2.78-2.534-4.952-5.362-4.952-1.09 0-2.1.32-2.946.87-.323.215-.41.544-.41.852v10.92c0 .35.285.636.637.636h8.09c1.558 0 2.82-1.25 2.82-2.79 0-1.31-.904-2.41-2.132-2.72.088-.3.136-.617.136-.944 0-1.881-1.525-3.408-3.406-3.408-.217 0-.43.02-.636.06z" />
      </svg>
    ),
  },
  {
    key: "tidalUrl" as keyof SmartLink,
    clickKey: "tidal",
    label: "Tidal",
    color: "#00CFFF",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996l4.004 4.004 4.004-4.004 4.004 4.004 4.004-4.004zM8.008 16.004l4.004-4.004 4.004 4.004L20.02 12l-4.004-4.004-4.004 4.004-4.004-4.004L4.004 12z" />
      </svg>
    ),
  },
  {
    key: "deezerUrl" as keyof SmartLink,
    clickKey: "deezer",
    label: "Deezer",
    color: "#9B59FF",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px]">
        <path d="M18.81 11.834h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0 6.967h3.19v1.969h-3.19zm-4.271 3.483h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm-4.27 10.45h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm-4.271 6.967h3.19v1.969H6v-1.969zm0-3.483h3.19v1.969H6v-1.969zm-4.27 3.483H5v1.969H1.73v-1.969z" />
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
      onSuccess: (targetUrl) => window.open(targetUrl, "_blank", "noopener,noreferrer"),
    });
  }

  useEffect(() => {
    if (link) document.title = `${link.title} — ${link.artist}`;
  }, [link]);

  const activePlatforms = link ? PLATFORMS.filter(p => link[p.key]) : [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-[1.5px] border-white/10 border-t-white/60 animate-spin" />
      </div>
    );
  }

  if (isError || !link) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-xl font-bold text-white">Link nije pronađen</p>
        <p className="text-sm text-white/40">Ovaj smart link ne postoji ili je obrisan.</p>
        <a href="/" className="mt-3 text-xs text-white/30 hover:text-white/60 transition-colors tracking-widest uppercase">
          ← Studio LeFlow
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center">

      {/* Layer 1 — blurred cover background */}
      {link.coverUrl && (
        <div
          className="absolute inset-0 scale-[1.4]"
          style={{
            backgroundImage: `url(${link.coverUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(90px)",
            opacity: 0.28,
          }}
        />
      )}

      {/* Layer 2 — primary color ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,82,255,0.12) 0%, transparent 70%)",
        }}
      />

      {/* Layer 3 — dark vignette (edges stay black) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 30%, rgba(0,0,0,0.65) 70%, rgba(0,0,0,0.95) 100%)",
        }}
      />

      {/* Layer 4 — top/bottom darkening */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/70 via-transparent to-black/80" />

      {/* Layer 5 — subtle noise grain */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: 0.035,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[360px] mx-auto px-5 py-14 flex flex-col items-center">

        {/* Cover art */}
        <div className="mb-7 relative">
          {link.coverUrl ? (
            <img
              src={link.coverUrl}
              alt={link.title}
              className="w-[220px] h-[220px] object-cover"
              style={{
                borderRadius: "20px",
                boxShadow: "0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07)",
              }}
            />
          ) : (
            <div
              className="w-[220px] h-[220px] flex items-center justify-center bg-white/[0.04]"
              style={{
                borderRadius: "20px",
                boxShadow: "0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07)",
              }}
            >
              <svg className="w-14 h-14 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
        </div>

        {/* Title */}
        <h1
          className="text-center text-white font-black leading-[1.15] mb-[6px]"
          style={{ fontSize: "clamp(22px, 6vw, 28px)", letterSpacing: "-0.02em" }}
        >
          {link.title}
        </h1>

        {/* Artist */}
        <p className="text-center text-white/40 text-[12px] tracking-[0.22em] uppercase font-medium mb-9">
          {link.artist}
        </p>

        {/* Separator */}
        <div className="w-full flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-white/[0.07]" />
          <span className="text-[10px] text-white/25 tracking-[0.25em] uppercase font-medium">Izaberi platformu</span>
          <div className="flex-1 h-px bg-white/[0.07]" />
        </div>

        {/* Platform buttons */}
        <div className="w-full space-y-2.5">
          {activePlatforms.map(p => (
            <button
              key={p.key}
              onClick={() => handlePlatformClick(p.clickKey, link[p.key] as string)}
              className="group w-full flex items-center gap-4 px-5 rounded-2xl transition-all duration-200 active:scale-[0.985]"
              style={{
                height: "58px",
                background: "rgba(255,255,255,0.055)",
                border: "1px solid rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,255,255,0.10)";
                el.style.border = "1px solid rgba(255,255,255,0.15)";
                el.style.transform = "translateY(-2px)";
                el.style.boxShadow = "0 12px 40px rgba(0,0,0,0.5)";
              }}
              onMouseLeave={e => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,255,255,0.055)";
                el.style.border = "1px solid rgba(255,255,255,0.08)";
                el.style.transform = "";
                el.style.boxShadow = "";
              }}
            >
              {/* Platform icon */}
              <span
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${p.color}18`, color: p.color }}
              >
                {p.icon}
              </span>

              {/* Label */}
              <span className="flex-1 text-left text-[13.5px] font-semibold text-white/85 group-hover:text-white transition-colors">
                {p.label}
              </span>

              {/* Arrow */}
              <svg
                className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}

          {activePlatforms.length === 0 && (
            <p className="text-center text-white/25 text-sm py-6">Nema dostupnih platformi.</p>
          )}
        </div>

        {/* Studio LeFlow branding */}
        <div className="mt-12 flex flex-col items-center gap-[6px]">
          <a
            href="/"
            className="opacity-30 hover:opacity-60 transition-opacity"
          >
            <img src="/leflow-logo-white.png" alt="Studio LeFlow" className="h-[18px] object-contain" />
          </a>
          <p className="text-[9px] text-white/20 tracking-[0.3em] uppercase">Studio LeFlow</p>
        </div>
      </div>
    </div>
  );
}
