import { Link } from "wouter";
import { Newspaper } from "lucide-react";
import { newsCategoryLabel } from "@shared/news";

// Shared pieces of the /news portal (list + article page). Editorial layout in
// the spirit of the big music magazines: kicker (rubrika) above the headline,
// mono meta line under it, no boxed cards.

export interface ArticleSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  category: string | null;
  publishedAt: string | null;
  readingMinutes: number;
}

const MONTHS_GEN = ["januara", "februara", "marta", "aprila", "maja", "juna", "jula", "avgusta", "septembra", "oktobra", "novembra", "decembra"];

/** "8. jula 2026." - Serbian Latin, month in the genitive */
export function formatDateLong(value: string | Date | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()}. ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()}.`;
}

export function Kicker({ category, className = "" }: { category: string | null | undefined; className?: string }) {
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-[0.16em] text-primary ${className}`}>
      {newsCategoryLabel(category)}
    </span>
  );
}

export function MetaLine({ date, minutes, className = "" }: { date: string | null; minutes?: number; className?: string }) {
  const parts = [formatDateLong(date), minutes ? `${minutes} min čitanja` : ""].filter(Boolean);
  return <p className={`font-mono text-[12px] text-muted-foreground ${className}`}>{parts.join("  ·  ")}</p>;
}

export function Cover({ src, alt, className = "" }: { src: string | null; alt: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <Newspaper className="w-8 h-8 text-muted-foreground/30" />
        </div>
      )}
    </div>
  );
}

/** Standard story tile: image, kicker, headline, two-line dek, meta. */
export function StoryCard({ a }: { a: ArticleSummary }) {
  return (
    <Link href={`/news/${a.slug}`} className="group block">
      <Cover src={a.coverImage} alt={a.title} className="aspect-[3/2] rounded-lg" />
      <Kicker category={a.category} className="block mt-5" />
      <h3 className="mt-2 text-xl font-semibold tracking-[-0.02em] leading-snug line-clamp-3 decoration-primary/70 decoration-2 underline-offset-4 group-hover:underline">
        {a.title}
      </h3>
      <p className="mt-2 text-[15px] text-muted-foreground leading-relaxed line-clamp-2">{a.excerpt}</p>
      <MetaLine date={a.publishedAt} minutes={a.readingMinutes} className="mt-3" />
    </Link>
  );
}
