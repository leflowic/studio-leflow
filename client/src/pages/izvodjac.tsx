import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { ArrowRight, ExternalLink, Music } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AvatarWithInitials } from "@/components/ui/avatar-with-initials";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";

// Public artist page (/izvodjac/:username). Opt-in per verified artist from
// Podešavanja. Meant as the link artists put in their Instagram bio, so it
// must work logged out and stay fast. Releases come from smart links the
// studio assigned to this artist (smart_links.userId).

type PublicArtist = {
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: string;
  releases: Array<{ slug: string; title: string; artist: string; coverUrl: string | null; createdAt: string }>;
};

export default function IzvodjacPage() {
  const { username } = useParams<{ username: string }>();
  const { data, isLoading, isError, error } = useQuery<PublicArtist>({
    queryKey: [`/api/public/artists/${username}`],
    retry: false,
  });

  // The server's own 404 message comes through as the error text
  const notFound = isError && String((error as any)?.message ?? "") === "Profil nije pronađen";

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={data ? `${data.username} - izvođač | Studio LeFlow` : "Izvođač | Studio LeFlow"}
        description={data?.bio || `Pesme izvođača ${username} snimljene u Studio LeFlow, Beograd.`}
        canonicalUrl={`/izvodjac/${username}`}
      />

      <section className="py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          {isLoading && (
            <div className="flex items-center gap-5">
              <Skeleton className="w-24 h-24 rounded-full" />
              <div className="space-y-3 flex-1"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-72" /></div>
            </div>
          )}

          {isError && (
            <div className="py-20">
              <h1 className="text-3xl font-bold mb-3">{notFound ? "Profil nije pronađen" : "Profil trenutno ne može da se učita"}</h1>
              <p className="text-muted-foreground mb-8">
                {notFound ? "Ovaj izvođač nema javni profil ili je link pogrešan." : "Pokušajte ponovo za par minuta."}
              </p>
              <Link href="/"><Button variant="outline">Početna</Button></Link>
            </div>
          )}

          {data && (
            <FadeInWhenVisible>
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-12">
                <AvatarWithInitials src={data.avatarUrl} name={data.username} className="w-24 h-24 text-2xl" />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Izvođač · Studio LeFlow</p>
                  <h1 className="text-4xl md:text-5xl font-bold tracking-tight">{data.username}</h1>
                  {data.bio && <p className="text-muted-foreground mt-3 max-w-xl whitespace-pre-line">{data.bio}</p>}
                </div>
              </div>

              <h2 className="text-xl font-bold mb-5">Pesme</h2>
              {data.releases.length === 0 ? (
                <p className="text-muted-foreground">Pesme će se pojaviti ovde kad izađu.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {data.releases.map(r => (
                    <a
                      key={r.slug}
                      href={`https://music.studioleflow.com/${r.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card p-3 hover:border-primary/50 transition-colors"
                    >
                      {r.coverUrl ? (
                        <img src={r.coverUrl} alt={r.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" loading="lazy" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <Music className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold truncate">{r.title}</p>
                        <p className="text-sm text-muted-foreground truncate">{r.artist}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0 mr-1" />
                    </a>
                  ))}
                </div>
              )}

              <div className="mt-16 border-t border-border/50 pt-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-semibold">Snimljeno u Studio LeFlow, Beograd</p>
                  <p className="text-sm text-muted-foreground">Snimanje vokala, mix i mastering, instrumentali i spotovi.</p>
                </div>
                <Link href="/kontakt" className="shrink-0">
                  <Button>
                    Zakažite termin
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </FadeInWhenVisible>
          )}
        </div>
      </section>
    </div>
  );
}
