import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Newspaper, CalendarDays } from "lucide-react";
import { SEO } from "@/components/SEO";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

interface ArticleSummary {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string | null;
  tags: string | null;
  publishedAt: string | null;
  authorUsername: string;
}

const PAGE_SIZE = 12;

export default function NewsPage() {
  const [limit, setLimit] = useState(PAGE_SIZE);

  const { data: articles, isLoading } = useQuery<ArticleSummary[]>({
    queryKey: ["/api/news", limit],
    queryFn: async () => {
      const res = await fetch(`/api/news?limit=${limit}&offset=0`);
      if (!res.ok) throw new Error("Greška pri učitavanju vesti");
      return res.json();
    },
  });

  const [featured, ...rest] = articles ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <SEO
        title="Vesti - Studio LeFlow | Muzičke Novosti iz Beograda"
        description="Najnovije vesti o izdanjima, saradnjama i dešavanjima u muzičkoj sceni - iz Studio LeFlow-a u Beogradu."
        keywords={["studio leflow vesti", "muzičke vesti beograd", "novi singl", "muzička scena srbija", "izdanja beograd"]}
      />

      <section className="py-16 md:py-20">
        <div className="container px-4 mx-auto max-w-6xl">
          <FadeInWhenVisible>
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-bold mb-3">Vesti</h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Izdanja, saradnje i dešavanja iz muzičke scene - iz Studio LeFlow-a u Beogradu.
              </p>
            </div>
          </FadeInWhenVisible>

          {isLoading ? (
            <div className="space-y-8">
              <Skeleton className="h-96 w-full rounded-2xl" />
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-72 rounded-2xl" />)}
              </div>
            </div>
          ) : !articles || articles.length === 0 ? (
            <FadeInWhenVisible>
              <div className="flex flex-col items-center text-center py-24 border border-border/60 rounded-2xl">
                <Newspaper className="w-10 h-10 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Trenutno nema objavljenih vesti</p>
              </div>
            </FadeInWhenVisible>
          ) : (
            <div className="space-y-10">
              {featured && (
                <FadeInWhenVisible>
                  <Link href={`/news/${featured.slug}`}>
                    <a className="group grid md:grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-border/60 bg-card hover-elevate active-elevate-2 transition-all">
                      <div className="relative aspect-video md:aspect-auto md:h-full bg-muted overflow-hidden">
                        {featured.coverImage ? (
                          <img
                            src={featured.coverImage}
                            alt={featured.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Newspaper className="w-12 h-12 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="p-6 md:p-10 flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground/70 mb-3">
                          <CalendarDays className="w-3.5 h-3.5" />
                          {featured.publishedAt && format(new Date(featured.publishedAt), "dd.MM.yyyy")}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-bold mb-3 group-hover:text-primary transition-colors">
                          {featured.title}
                        </h2>
                        <p className="text-muted-foreground line-clamp-3">{featured.excerpt}</p>
                      </div>
                    </a>
                  </Link>
                </FadeInWhenVisible>
              )}

              {rest.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map((article, index) => (
                    <FadeInWhenVisible key={article.id} delay={Math.min(index * 0.05, 0.3)}>
                      <Link href={`/news/${article.slug}`}>
                        <a className="group flex flex-col h-full rounded-2xl overflow-hidden border border-border/60 bg-card hover-elevate active-elevate-2 transition-all">
                          <div className="relative aspect-video bg-muted overflow-hidden">
                            {article.coverImage ? (
                              <img
                                src={article.coverImage}
                                alt={article.title}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              />
                            ) : (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Newspaper className="w-8 h-8 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>
                          <div className="p-5 flex flex-col flex-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground/70 mb-2">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {article.publishedAt && format(new Date(article.publishedAt), "dd.MM.yyyy")}
                            </div>
                            <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                              {article.title}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-3">{article.excerpt}</p>
                          </div>
                        </a>
                      </Link>
                    </FadeInWhenVisible>
                  ))}
                </div>
              )}

              {articles.length >= limit && (
                <div className="flex justify-center pt-4">
                  <Button variant="outline" onClick={() => setLimit(l => l + PAGE_SIZE)}>
                    Učitaj još
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
