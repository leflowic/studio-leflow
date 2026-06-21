import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import type { SmartLink } from "@shared/schema";
import { SiSpotify, SiYoutube, SiApplemusic, SiSoundcloud, SiTidal } from "react-icons/si";

const PLATFORMS = [
  { key: "spotifyUrl" as keyof SmartLink, clickKey: "spotify", label: "Spotify", color: "#1DB954", Icon: SiSpotify },
  { key: "youtubeUrl" as keyof SmartLink, clickKey: "youtube", label: "YouTube", color: "#FF0033", Icon: SiYoutube },
  { key: "appleMusicUrl" as keyof SmartLink, clickKey: "apple_music", label: "Apple Music", color: "#FC3C44", Icon: SiApplemusic },
  { key: "soundcloudUrl" as keyof SmartLink, clickKey: "soundcloud", label: "SoundCloud", color: "#FF5500", Icon: SiSoundcloud },
  { key: "tidalUrl" as keyof SmartLink, clickKey: "tidal", label: "Tidal", color: "#00CFFF", Icon: SiTidal },
  { key: "deezerUrl" as keyof SmartLink, clickKey: "deezer", label: "Deezer", color: "#9B59FF", Icon: () => <svg viewBox="0 0 24 24" fill="currentColor" width={18} height={18}><path d="M18.81 11.834h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0 6.967h3.19v1.969h-3.19zm-4.271 3.483h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm-4.27 10.45h3.19v1.969h-3.19zm0-3.483h3.19v1.969h-3.19zm0-3.484h3.19v1.969h-3.19zm-4.271 6.967h3.19v1.969H6v-1.969zm0-3.483h3.19v1.969H6v-1.969zm-4.27 3.483H5v1.969H1.73v-1.969z"/></svg> },
];

function getToken() {
  return localStorage.getItem("auth_token");
}

export default function SmartLinkPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [, setLocation] = useLocation();

  const [status, setStatus] = useState<number | null>(null);
  const [requiresVip, setRequiresVip] = useState(false);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  const { data: link, isLoading, isError } = useQuery<SmartLink>({
    queryKey: [`/api/l/${slug}`],
    queryFn: async () => {
      const token = getToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const r = await fetch(`/api/l/${slug}`, { headers });
      setStatus(r.status);
      if (!r.ok) {
        let body: any = {};
        try { body = await r.json(); } catch {}
        if (r.status === 401) setNotLoggedIn(true);
        if (r.status === 403 && body.requiresVip) setRequiresVip(true);
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      return r.json();
    },
    retry: false,
  });

  const clickMutation = useMutation({
    mutationFn: ({ platform, url }: { platform: string; url: string }) => {
      const token = getToken();
      return fetch(`/api/l/${slug}/click`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ platform }),
      }).then(() => url);
    },
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

  // Not logged in → redirect to auth
  if (notLoggedIn || status === 401) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.05] border border-white/[0.08] flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <p className="text-xl font-black text-white">Potrebna prijava</p>
        <p className="text-sm text-white/40 max-w-xs leading-relaxed">
          Prijavite se na Studio LeFlow nalog da biste pristupili ovom sadržaju.
        </p>
        <button
          onClick={() => setLocation(`/prijava?redirect=${encodeURIComponent(window.location.pathname)}`)}
          className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{ background: "rgba(99,82,255,0.85)", boxShadow: "0 0 30px rgba(99,82,255,0.3)" }}
        >
          Prijavi se
        </button>
        <a href="/" className="mt-2 text-xs text-white/25 hover:text-white/50 transition-colors tracking-widest uppercase">
          ← Studio LeFlow
        </a>
      </div>
    );
  }

  // Logged in but rank too low
  if (requiresVip || status === 403) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-amber-400/60" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </div>
        <p className="text-xl font-black text-white">VIP sadržaj</p>
        <p className="text-sm text-white/40 max-w-xs leading-relaxed">
          Ovaj sadržaj je dostupan samo korisnicima sa <span className="text-amber-400/80 font-semibold">VIP</span> rangom i višim.
        </p>
        <a href="/dashboard" className="mt-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white/80 border border-white/10 hover:bg-white/5 transition-all">
          Moj nalog
        </a>
        <a href="/" className="mt-1 text-xs text-white/25 hover:text-white/50 transition-colors tracking-widest uppercase">
          ← Studio LeFlow
        </a>
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
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(99,82,255,0.12) 0%, transparent 70%)" }} />

      {/* Layer 3 — dark vignette */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 120% 120% at 50% 50%, transparent 30%, rgba(0,0,0,0.65) 70%, rgba(0,0,0,0.95) 100%)" }} />

      {/* Layer 4 — top/bottom darkening */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/70 via-transparent to-black/80" />

      {/* Layer 5 — subtle noise grain */}
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: 0.035,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
      }} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-[360px] mx-auto px-5 py-14 flex flex-col items-center">

        {/* Cover art */}
        <div className="mb-7">
          {link.coverUrl ? (
            <img src={link.coverUrl} alt={link.title} className="w-[220px] h-[220px] object-cover"
              style={{ borderRadius: "20px", boxShadow: "0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07)" }} />
          ) : (
            <div className="w-[220px] h-[220px] flex items-center justify-center bg-white/[0.04]"
              style={{ borderRadius: "20px", boxShadow: "0 40px 100px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.07)" }}>
              <svg className="w-14 h-14 text-white/20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-center text-white font-black leading-[1.15] mb-[6px]"
          style={{ fontSize: "clamp(22px, 6vw, 28px)", letterSpacing: "-0.02em" }}>
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
              style={{ height: "58px", background: "rgba(255,255,255,0.055)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(12px)" }}
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
              <span className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: `${p.color}18`, color: p.color }}>
                <p.Icon size={18} />
              </span>
              <span className="flex-1 text-left text-[13.5px] font-semibold text-white/85 group-hover:text-white transition-colors">
                {p.label}
              </span>
              <svg className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors"
                fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
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
          <a href="/" className="opacity-30 hover:opacity-60 transition-opacity">
            <img src="/leflow-logo-white.png" alt="Studio LeFlow" className="h-[18px] object-contain" />
          </a>
          <p className="text-[9px] text-white/20 tracking-[0.3em] uppercase">Studio LeFlow</p>
        </div>
      </div>
    </div>
  );
}
