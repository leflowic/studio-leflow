import { useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Disc3, Newspaper } from "lucide-react";
import { SEO } from "@/components/SEO";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NEWS_CATEGORIES, isNewsCategory, newsCategoryLabel } from "@shared/news";
import { type ArticleSummary, Cover, Kicker, MetaLine, StoryCard, formatDateLong } from "@/components/news/NewsParts";

// /news - editorial front page: masthead + rubrike, a lead story with a
// "Najnovije" rail next to it, then the rest as a three-column grid.
// See docs/features/news.md.

const PAGE_SIZE = 13; // lead + 4 in the rail + 8 in the grid
const RAIL = 4;

type Release = { slug: string; title: string; artist: string; coverUrl: string | null };

export default function NewsPage() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const raw = new URLSearchParams(search).get("rubrika");
  const category = isNewsCategory(raw) ? raw : null;
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: articles, isLoading, isError } = useQuery<ArticleSummary[]>({
    queryKey: ["/api/news", category, limit],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: String(limit), offset: "0" });
      if (category) qs.set("category", category);
      const res = await fetch(`/api/news?${qs}`);
      if (!res.ok) throw new Error("Greška pri učitavanju novosti");
      return res.json();
    },
    placeholderData: prev => prev,
  });

  const list = Array.isArray(articles) ? articles : [];
  const [lead, ...others] = list;
  const rail = others.slice(0, RAIL);
  const grid = others.slice(RAIL);

  // with nothing to put in the rail, it shows the newest songs from the studio
  const { data: releases } = useQuery<Release[]>({
    queryKey: ["/api/smart-links?featured=1"],
    enabled: !!lead && rail.length === 0,
    staleTime: 5 * 60 * 1000,
  });

  const pick = (value: string | null) => {
    setLimit(PAGE_SIZE);
    navigate(value ? `/news?rubrika=${value}` : "/news");
  };

  const tabs = [{ value: null as string | null, label: "Sve" }, ...NEWS_CATEGORIES.map(c => ({ value: c.value as string | null, label: c.label }))];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Novosti - Studio LeFlow | Muzičke novosti iz Beograda"
        description="Najnovije novosti o izdanjima, saradnjama i dešavanjima u muzičkoj sceni - iz Studio LeFlow-a u Beogradu."
        keywords={["studio leflow novosti", "muzičke novosti beograd", "novi singl", "muzička scena srbija", "izdanja beograd"]}
      />

      {/* Masthead */}
      <header className="border-b border-border/60">
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-10 md:pt-16">
          <div className="flex items-end justify-between gap-6 pb-8 md:pb-10">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-4">
                {formatDateLong(new Date())}
              </p>
              <h1 className="text-6xl md:text-8xl lg:text-[7.5rem] font-semibold tracking-[-0.045em] leading-[0.85]">
                Novosti
              </h1>
            </div>
            <p className="hidden md:block max-w-[17rem] text-sm text-muted-foreground text-right leading-relaxed pb-2">
              Izdanja, saradnje i dešavanja na sceni - iz studija u Beogradu.
            </p>
          </div>

          <nav className="flex gap-7 overflow-x-auto -mb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Rubrike">
            {tabs.map(t => {
              const active = t.value === category;
              return (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => pick(t.value)}
                  aria-current={active ? "page" : undefined}
                  className={
                    "shrink-0 pb-3.5 text-sm border-b-2 transition-colors " +
                    (active ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground")
                  }
                >
                  {t.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <EmptyState text="Novosti trenutno ne mogu da se učitaju. Pokušajte ponovo malo kasnije." />
      ) : !lead ? (
        <EmptyState
          text={category ? `U rubrici ${newsCategoryLabel(category)} još nema novosti.` : "Trenutno nema objavljenih novosti."}
          action={category ? <button type="button" onClick={() => pick(null)} className="text-sm font-medium text-primary hover:underline underline-offset-4">Sve novosti</button> : undefined}
        />
      ) : (
        <>
          {/* Lead + rail */}
          <section className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
            <FadeInWhenVisible>
              <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-12 lg:gap-14">
                <Link href={`/news/${lead.slug}`} className="group block">
                  <Cover src={lead.coverImage} alt={lead.title} className="aspect-[16/10] rounded-xl" />
                  <Kicker category={lead.category} className="block mt-7" />
                  <h2 className="mt-3 text-3xl md:text-5xl font-semibold tracking-[-0.035em] leading-[1.04] decoration-primary/70 decoration-[3px] underline-offset-[6px] group-hover:underline">
                    {lead.title}
                  </h2>
                  <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl line-clamp-3">{lead.excerpt}</p>
                  <MetaLine date={lead.publishedAt} minutes={lead.readingMinutes} className="mt-5" />
                </Link>

                <aside>
                  {rail.length > 0 ? (
                    <>
                      <RailHeading>Najnovije</RailHeading>
                      <ol className="divide-y divide-border/60">
                        {rail.map((a, i) => (
                          <li key={a.id}>
                            <Link href={`/news/${a.slug}`} className="group grid grid-cols-[1.75rem_minmax(0,1fr)_5.5rem] gap-4 py-5">
                              <span className="font-mono text-sm text-primary tabular-nums pt-0.5">{String(i + 2).padStart(2, "0")}</span>
                              <div className="min-w-0">
                                <Kicker category={a.category} />
                                <h3 className="mt-1.5 text-[17px] font-semibold leading-snug tracking-[-0.01em] line-clamp-3 decoration-primary/70 decoration-2 underline-offset-4 group-hover:underline">
                                  {a.title}
                                </h3>
                                <MetaLine date={a.publishedAt} className="mt-2" />
                              </div>
                              <Cover src={a.coverImage} alt="" className="aspect-square rounded-md" />
                            </Link>
                          </li>
                        ))}
                      </ol>
                    </>
                  ) : (
                    <ReleasesRail releases={Array.isArray(releases) ? releases.slice(0, 4) : []} />
                  )}
                </aside>
              </div>
            </FadeInWhenVisible>
          </section>

          {grid.length > 0 && (
            <section className="border-t border-border/60">
              <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
                <FadeInWhenVisible>
                  <RailHeading>Još novosti</RailHeading>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14 pt-4">
                    {grid.map(a => <StoryCard key={a.id} a={a} />)}
                  </div>
                </FadeInWhenVisible>

                {list.length >= limit && (
                  <div className="flex justify-center pt-14">
                    <Button variant="outline" onClick={() => setLimit(l => l + 9)}>
                      Učitaj još
                    </Button>
                  </div>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function RailHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-t-2 border-foreground pt-3 mb-1 text-[13px] font-semibold uppercase tracking-[0.16em]">
      {children}
    </h2>
  );
}

function ReleasesRail({ releases }: { releases: Release[] }) {
  if (releases.length === 0) return null;
  return (
    <>
      <RailHeading>Novo iz studija</RailHeading>
      <ul className="divide-y divide-border/60">
        {releases.map(r => (
          <li key={r.slug}>
            <a
              href={`https://music.studioleflow.com/${r.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4 py-4"
            >
              <span className="relative w-16 h-16 shrink-0 rounded-md overflow-hidden bg-muted">
                {r.coverUrl ? (
                  <img src={r.coverUrl} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <Disc3 className="absolute inset-0 m-auto w-6 h-6 text-muted-foreground/40" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold leading-snug truncate decoration-primary/70 decoration-2 underline-offset-4 group-hover:underline">{r.title}</span>
                <span className="block text-sm text-muted-foreground truncate">{r.artist}</span>
              </span>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground transition-colors group-hover:text-primary shrink-0" />
            </a>
          </li>
        ))}
      </ul>
      <a
        href="https://music.studioleflow.com"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline underline-offset-4"
      >
        Sve pesme iz studija <ArrowUpRight className="w-3.5 h-3.5" />
      </a>
    </>
  );
}

function EmptyState({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-24 md:py-32 flex flex-col items-start gap-4">
      <Newspaper className="w-8 h-8 text-muted-foreground/40" />
      <p className="text-lg text-muted-foreground">{text}</p>
      {action}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-14">
      <div className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-12 lg:gap-14">
        <div>
          <Skeleton className="aspect-[16/10] w-full rounded-xl" />
          <Skeleton className="h-3 w-20 mt-7" />
          <Skeleton className="h-10 w-4/5 mt-4" />
          <Skeleton className="h-5 w-3/5 mt-5" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-4 w-28" />
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    </div>
  );
}
