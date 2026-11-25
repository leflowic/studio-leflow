import { PLATFORM_ICONS } from "@/lib/platform-icons";

// Infinite logo marquee of streaming platforms, single color (muted, brightens
// on hover). The list is rendered twice and the track slides by -50%, so the
// loop is seamless. Pauses on hover; edges fade out via a mask. With
// prefers-reduced-motion the global rule in index.css stops the animation.

function Row({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="flex shrink-0 items-center gap-12 pr-12" aria-hidden={hidden || undefined}>
      {PLATFORM_ICONS.map(icon => (
        <li key={icon.slug} className="flex items-center gap-2.5 text-muted-foreground/80 hover:text-foreground transition-colors">
          <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="currentColor" role="img" aria-label={icon.name}>
            <path d={icon.path} />
          </svg>
          <span className="text-[15px] font-medium whitespace-nowrap">{icon.name}</span>
        </li>
      ))}
    </ul>
  );
}

export function PlatformMarquee() {
  return (
    <section className="relative z-10 bg-background border-b border-border/40 py-10" aria-label="Striming servisi">
      <p className="text-center text-sm text-muted-foreground mb-7 px-4">
        Master pripremljen za objavu na striming servisima
      </p>
      <div className="marquee group relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
        <div className="marquee-track flex w-max">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  );
}
