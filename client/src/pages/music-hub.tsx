import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Link } from "wouter";
import { motion, useReducedMotion } from "framer-motion";
import { Music2 } from "lucide-react";

type SmartLinkSummary = { slug: string; title: string; artist: string; coverUrl: string | null };

// Idle heights for the per-track ambient waveform - same visual language as
// WaveDivider.tsx (thin rounded bars), reused here as a per-row "now spinning"
// indicator rather than a static section divider.
const WAVE_BARS = [6, 11, 8, 15, 9];

function TrackWave() {
  return (
    <div className="track-wave flex items-end gap-[3px] h-4" aria-hidden="true">
      {WAVE_BARS.map((h, i) => (
        <span key={i} className="wavebar w-[3px] rounded-full bg-[#8b73ff]" style={{ height: h, animationDelay: `${i * 0.12}s` }} />
      ))}
    </div>
  );
}

export default function MusicHubPage() {
  const prefersReducedMotion = useReducedMotion();
  const { data: links, isLoading } = useQuery<SmartLinkSummary[]>({
    queryKey: ["/api/smart-links"],
    queryFn: async () => {
      const r = await fetch("/api/smart-links");
      if (!r.ok) throw new Error("Failed to load");
      return r.json();
    },
  });

  useEffect(() => {
    document.title = "Studio LeFlow Music";
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(99,82,255,0.12) 0%, transparent 70%)" }} />
      <div className="absolute inset-0 pointer-events-none" style={{
        opacity: 0.03,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "200px 200px",
      }} />

      <div className="relative z-10 w-full max-w-xl mx-auto px-5 py-16 sm:py-20">
        <div className="flex flex-col items-center text-center mb-11">
          <img src="/leflow-logo-white.png" alt="Studio LeFlow" className="h-8 mb-6 opacity-80" />
          <h1 className="font-[Figtree] text-[22px] font-bold text-white tracking-tight">Poslednja izdanja iz studija</h1>
          <p className="text-[13px] text-white/35 mt-1.5">Izaberi pesmu da je čuješ na svojoj platformi</p>
        </div>

        {isLoading ? (
          <div className="space-y-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-3">
                <div className="w-5 h-3 rounded bg-white/[0.05] animate-pulse" />
                <div className="w-12 h-12 rounded-xl bg-white/[0.05] animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/5 rounded bg-white/[0.05] animate-pulse" />
                  <div className="h-2.5 w-1/4 rounded bg-white/[0.04] animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !links?.length ? (
          <div className="text-center py-16">
            <p className="text-sm font-medium text-white/50">Još nema objavljenih pesama.</p>
            <p className="text-xs text-white/25 mt-1.5">Prve licence i izdanja se uskoro pojavljuju ovde.</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: prefersReducedMotion ? 0 : 0.05 } } }}
          >
            {links.map((link, i) => (
              <motion.div
                key={link.slug}
                variants={{
                  hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 10 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
                }}
              >
                <Link href={`/${link.slug}`}>
                  <a
                    className="track-row group flex items-center gap-4 py-3 px-2 -mx-2 rounded-xl transition-colors duration-200 hover:bg-white/[0.035]"
                    style={{ borderBottom: i < links.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}
                  >
                    <span className="w-5 shrink-0 text-right font-mono text-[11px] text-white/25 transition-colors duration-200 group-hover:text-[#a094ff]">
                      {String(i + 1).padStart(2, "0")}
                    </span>

                    <div
                      className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-white/[0.04] flex items-center justify-center transition-transform duration-200 group-hover:scale-[1.04]"
                      style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)" }}
                    >
                      {link.coverUrl ? (
                        <img src={link.coverUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Music2 className="w-5 h-5 text-white/15" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-[13.5px] font-semibold text-white/90 truncate">{link.title}</p>
                      <p className="text-[11.5px] text-white/40 truncate mt-0.5">{link.artist}</p>
                    </div>

                    <div className="shrink-0 hidden sm:block">
                      <TrackWave />
                    </div>
                  </a>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div className="mt-14 text-center">
          <a href="https://studioleflow.com" className="text-[11px] text-white/25 hover:text-white/50 transition-colors tracking-[0.15em] uppercase">
            studioleflow.com
          </a>
        </div>
      </div>

      <style>{`
        @keyframes wavebar-idle {
          0%, 100% { transform: scaleY(0.55); opacity: 0.55; }
          50% { transform: scaleY(1); opacity: 0.9; }
        }
        .wavebar {
          transform-origin: bottom;
          animation: wavebar-idle 1.8s ease-in-out infinite;
        }
        .track-row:hover .wavebar {
          animation-duration: 0.6s;
        }
        @media (prefers-reduced-motion: reduce) {
          .wavebar { animation: none; transform: scaleY(0.75); }
        }
      `}</style>
    </div>
  );
}
