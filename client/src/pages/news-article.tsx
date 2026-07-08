import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Newspaper } from "lucide-react";
import { SEO } from "@/components/SEO";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

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
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  authorUsername: string;
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-16 md:py-20">
        <div className="container px-4 mx-auto max-w-3xl space-y-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (isError || !article) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-24">
        <div className="container px-4 mx-auto max-w-2xl text-center">
          <Newspaper className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Vest nije pronađena</h1>
          <p className="text-muted-foreground mb-6">Ova vest ne postoji ili je uklonjena.</p>
          <Link href="/news">
            <a className="inline-flex items-center gap-2 text-primary hover:underline">
              <ArrowLeft className="w-4 h-4" />
              Nazad na vesti
            </a>
          </Link>
        </div>
      </div>
    );
  }

  const tags = (article.tags ?? "").split(",").map(t => t.trim()).filter(Boolean);
  const keywords = (article.seoKeywords || article.tags || "").split(",").map(t => t.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <SEO
        title={article.seoTitle || `${article.title} - Studio LeFlow Vesti`}
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
          author: { "@type": "Organization", name: "Studio LeFlow" },
          publisher: {
            "@type": "Organization",
            name: "Studio LeFlow",
            logo: { "@type": "ImageObject", url: "https://studioleflow.com/leflow-logo-white.png" },
          },
        }}
      />

      <article className="py-16 md:py-20">
        <div className="container px-4 mx-auto max-w-3xl">
          <FadeInWhenVisible>
            <Link href="/news">
              <a className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Nazad na vesti
              </a>
            </Link>

            {article.coverImage && (
              <div className="relative aspect-video rounded-2xl overflow-hidden mb-8 border border-border/60">
                <img src={article.coverImage} alt={article.title} className="absolute inset-0 w-full h-full object-cover" />
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-muted-foreground/70 mb-4">
              <CalendarDays className="w-4 h-4" />
              {article.publishedAt && format(new Date(article.publishedAt), "dd.MM.yyyy")}
              <span>-</span>
              <span>Studio LeFlow</span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight">{article.title}</h1>
            <p className="text-lg text-muted-foreground mb-8">{article.excerpt}</p>

            <div
              className="prose prose-neutral dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary"
              dangerouslySetInnerHTML={{ __html: article.content }}
            />

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-10 pt-6 border-t border-border/60">
                {tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            )}
          </FadeInWhenVisible>
        </div>
      </article>
    </div>
  );
}
