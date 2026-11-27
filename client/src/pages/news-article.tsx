import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion, useScroll, useSpring } from "framer-motion";
import { ArrowLeft, Check, ChevronRight, Link2, Newspaper, Play, Share2 } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Skeleton } from "@/components/ui/skeleton";
import { newsCategoryLabel } from "@shared/news";
import { type ArticleSummary, Kicker, StoryCard, formatDateLong } from "@/components/news/NewsParts";

interface Article {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  tags: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  category: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  readingMinutes: number;
  release: { slug: string; title: string; artist: string; coverUrl: string | null } | null;
}

// Thin oak bar under the fixed header that fills as you read.
function ReadingProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed left-0 right-0 top-[calc(4rem+env(safe-area-inset-top))] z-40 h-[2px] bg-primary origin-left"
      style={{ scaleX }}
    />
  );
}

function ShareButtons({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked - nothing to do */ }
  };

  const btn = "inline-flex items-center gap-2 h-9 px-4 rounded-full border border-border text-sm hover:border-primary/50 hover:text-primary transition-colors";
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={copy} className={btn} aria-live="polite">
        {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
        {copied ? "Kopirano" : "Kopiraj link"}
      </button>
      {canShare && (
        <button type="button" onClick={() => navigator.share({ title, url }).catch(() => {})} className={btn}>
          <Share2 className="w-4 h-4" /> Podeli
        </button>
      )}
    </div>
  );
}

function ReleaseCard({ release }: { release: NonNullable<Article["release"]> }) {
  return (
    <a
      href={`https://music.studioleflow.com/${release.slug}`}
      target="_blank"
      rel="noopener noreferrer"
      className="group mt-14 flex items-center gap-5 rounded-2xl border border-border/60 bg-card p-4 pr-5 hover:border-primary/40 transition-colors"
    >
      <span className="relative w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-muted">
        {release.coverUrl && <img src={release.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Poslušaj</span>
        <span className="block mt-1 text-lg font-semibold leading-snug truncate">{release.title}</span>
        <span className="block text-sm text-muted-foreground truncate">{release.artist}</span>
      </span>
      <span className="w-12 h-12 shrink-0 rounded-full bg-primary text-primary-foreground flex items-center justify-center transition-transform group-hover:scale-105">
        <Play className="w-5 h-5 ml-0.5" />
      </span>
    </a>
  );
}

export default function NewsArticlePage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: article, isLoading, isError } = useQuery<Article>({
    queryKey: ["/api/news", slug],
    queryFn: async () => {
      const res = await fetch(`/api/news/${slug}`);
      if (!res.ok) throw new Error("Vest nije pronađena");
      return res.json();
    },
    enabled: !!slug,
  });

  const { data: latest } = useQuery<ArticleSummary[]>({
    queryKey: ["/api/news-related"],
    queryFn: async () => {
      const res = await fetch(`/api/news?limit=4&offset=0`);
      if (!res.ok) throw new Error("Greška pri učitavanju novosti");
      return res.json();
    },
    enabled: !!article,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 md:px-6 pt-10 md:pt-16 space-y-6">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-3/4" />
          <Skeleton className="h-6 w-2/3" />
        </div>
        <div className="max-w-6xl mx-auto px-4 md:px-6 mt-10">
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 md:px-6 py-24 md:py-32">
          <Newspaper className="w-8 h-8 text-muted-foreground/40 mb-5" />
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-3">Vest nije pronađena</h1>
          <p className="text-muted-foreground mb-8">Ova vest ne postoji ili je uklonjena.</p>
          <Link href="/news" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4">
            <ArrowLeft className="w-4 h-4" /> Sve novosti
          </Link>
        </div>
      </div>
    );
  }

  // tags double as SEO keywords and can get long - show a handful
  const tags = (article.tags ?? "").split(",").map(t => t.trim()).filter(Boolean).slice(0, 6);
  const keywords = (article.seoKeywords || article.tags || "").split(",").map(t => t.trim()).filter(Boolean);
  const related = (Array.isArray(latest) ? latest : []).filter(a => a.slug !== article.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={article.seoTitle || `${article.title} - Studio LeFlow Novosti`}
        description={article.seoDescription || article.excerpt}
        keywords={keywords.length > 0 ? keywords : undefined}
        ogImage={article.coverImage || undefined}
        ogType="article"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "NewsArticle",
          headline: article.title,
          description: article.seoDescription || article.excerpt,
          image: article.coverImage ? [article.coverImage] : undefined,
          datePublished: article.publishedAt ?? article.createdAt,
          dateModified: article.updatedAt,
          keywords: keywords.length > 0 ? keywords.join(", ") : undefined,
          articleSection: newsCategoryLabel(article.category),
          author: { "@type": "Organization", name: "Studio LeFlow" },
          publisher: {
            "@type": "Organization",
            name: "Studio LeFlow",
            logo: { "@type": "ImageObject", url: "https://studioleflow.com/leflow-logo-white.png" },
          },
        }}
      />

      <ReadingProgress />

      <article>
        <header className="max-w-4xl mx-auto px-4 md:px-6 pt-10 md:pt-16">
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-label="Putanja">
            <Link href="/news" className="hover:text-foreground transition-colors">Novosti</Link>
            {article.category && (
              <>
                <ChevronRight className="w-3.5 h-3.5" />
                <Link href={`/news?rubrika=${article.category}`} className="hover:text-foreground transition-colors">
                  {newsCategoryLabel(article.category)}
                </Link>
              </>
            )}
          </nav>

          <Kicker category={article.category} className="block mt-8" />
          <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-[-0.04em] leading-[1.02]">
            {article.title}
          </h1>
          <p className="mt-6 text-xl md:text-2xl text-muted-foreground leading-snug max-w-3xl">{article.excerpt}</p>

          <div className="mt-10 py-5 border-y border-border/60 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <img src="/favicon-192x192.png?v=2" alt="" className="w-10 h-10 rounded-full" />
              <div>
                <p className="text-sm font-medium">Studio LeFlow</p>
                <p className="font-mono text-[12px] text-muted-foreground">
                  {formatDateLong(article.publishedAt ?? article.createdAt)}  ·  {article.readingMinutes} min čitanja
                </p>
              </div>
            </div>
            <ShareButtons title={article.title} />
          </div>
        </header>

        {article.coverImage && (
          <figure className="max-w-6xl mx-auto px-4 md:px-6 mt-10 md:mt-12">
            <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-muted">
              <img src={article.coverImage} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
            </div>
          </figure>
        )}

        <div className="max-w-[42rem] mx-auto px-4 md:px-0 mt-12 md:mt-16">
          <div
            className={[
              "prose prose-lg dark:prose-invert max-w-none",
              "prose-p:leading-[1.8] prose-p:text-foreground/85",
              "prose-headings:font-semibold prose-headings:tracking-[-0.02em] prose-h2:mt-14",
              "prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:underline prose-a:underline-offset-4",
              "prose-strong:text-foreground prose-img:rounded-xl",
              "prose-blockquote:border-l-2 prose-blockquote:border-primary prose-blockquote:not-italic prose-blockquote:text-2xl prose-blockquote:font-medium prose-blockquote:leading-snug prose-blockquote:text-foreground",
              // lead paragraph reads a step larger, like a magazine standfirst
              "[&>p:first-child]:text-[1.3rem] [&>p:first-child]:leading-[1.7] [&>p:first-child]:text-foreground",
            ].join(" ")}
            dangerouslySetInnerHTML={{ __html: article.content }}
          />

          {article.release && <ReleaseCard release={article.release} />}

          {tags.length > 0 && (
            <div className="mt-14 pt-6 border-t border-border/60">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground mb-3">Teme</p>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full border border-border text-xs text-muted-foreground">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </article>

      <section className="mt-20 md:mt-28 border-t border-border/60">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 md:py-16">
          {related.length > 0 ? (
            <>
              <h2 className="border-t-2 border-foreground pt-3 mb-8 text-[13px] font-semibold uppercase tracking-[0.16em]">Pročitajte još</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
                {related.map(a => <StoryCard key={a.id} a={a} />)}
              </div>
            </>
          ) : (
            <Link href="/news" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4">
              <ArrowLeft className="w-4 h-4" /> Sve novosti
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
