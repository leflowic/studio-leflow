import { useState } from "react";
import { Languages } from "lucide-react";
import { SEO } from "@/components/SEO";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import leflowLogo from "@/assets/leflow-logo.png";

type Lang = "sr" | "en";

const ISSUED_DATE: Record<Lang, string> = {
  sr: "8. jul 2026.",
  en: "July 8, 2026",
};

const content: Record<Lang, {
  overline: string;
  title: string;
  location: string;
  issued: string;
  signatureLine: string;
  articles: { number: string; title: string; body: React.ReactNode }[];
}> = {
  sr: {
    overline: "Javna izjava",
    title: "Zaštita brenda Studio LeFlow",
    location: "Beograd, Srbija",
    issued: "Objavljeno",
    signatureLine: "Beograd, Srbija · studioleflow.com",
    articles: [
      {
        number: "Član 1",
        title: "Naziv i vizuelni identitet",
        body: (
          <>
            <p>
              Naziv <strong className="text-foreground">"Studio LeFlow"</strong>, skraćeni oblik{" "}
              <strong className="text-foreground">"LeFlow"</strong> i pripadajući logo koriste se u komercijalnoj
              delatnosti muzičke produkcije od 2020. godine.
            </p>
            <p>
              Logo prikazan na ovoj stranici je originalan i u kontinuiranoj upotrebi od svog nastanka, uključujući
              javno objavljivanje na zvaničnim društvenim mrežama studija tokom 2020. godine.
            </p>
          </>
        ),
      },
      {
        number: "Član 2",
        title: "Priroda ove izjave",
        body: (
          <>
            <p>
              Ova stranica predstavlja javnu, vremenski overenu izjavu Studio LeFlow-a o prvoj upotrebi navedenog
              naziva i vizuelnog identiteta. Služi kao dokaz da je studio korisnik ovog brenda pre bilo koje treće
              strane koja bi kasnije počela da koristi isti ili sličan naziv, logo ili vizuelni identitet.
            </p>
            <p>
              Ovo <strong className="text-foreground">nije</strong> zvanična registracija žiga kod Zavoda za
              intelektualnu svojinu Republike Srbije, niti je zamena za nju. Predstavlja javnu izjavu o prethodnoj
              upotrebi, koju Studio LeFlow zadržava kao dodatni dokaz uz internu, kriptografski overenu evidenciju
              datuma nastanka i upotrebe brenda.
            </p>
          </>
        ),
      },
      {
        number: "Član 3",
        title: "Neovlašćena upotreba",
        body: (
          <p>
            Korišćenje naziva "Studio LeFlow", "LeFlow" ili vizuelnog identiteta studija u komercijalne svrhe, bez
            prethodne pisane saglasnosti, nije dozvoljeno. Za saradnju, licenciranje ili bilo kakvo pitanje u vezi sa
            upotrebom brenda, obratite nam se putem stranice za kontakt.
          </p>
        ),
      },
    ],
  },
  en: {
    overline: "Public Statement",
    title: "Studio LeFlow Brand Protection",
    location: "Belgrade, Serbia",
    issued: "Published",
    signatureLine: "Belgrade, Serbia · studioleflow.com",
    articles: [
      {
        number: "Article 1",
        title: "Name and Visual Identity",
        body: (
          <>
            <p>
              The name <strong className="text-foreground">"Studio LeFlow"</strong>, its short form{" "}
              <strong className="text-foreground">"LeFlow"</strong>, and the accompanying logo have been used in
              commercial music production activity since 2020.
            </p>
            <p>
              The logo shown on this page is original and has been in continuous use since its creation, including
              public posting on the studio's official social media accounts during 2020.
            </p>
          </>
        ),
      },
      {
        number: "Article 2",
        title: "Nature of This Statement",
        body: (
          <>
            <p>
              This page constitutes a public, time-stamped statement by Studio LeFlow regarding first use of the
              above name and visual identity. It serves as evidence that the studio used this brand prior to any
              third party that may later adopt the same or a similar name, logo, or visual identity.
            </p>
            <p>
              This is <strong className="text-foreground">not</strong> an official trademark registration with the
              Intellectual Property Office of the Republic of Serbia, nor a substitute for one. It is a public
              statement of prior use, which Studio LeFlow retains as supporting evidence alongside its internal,
              cryptographically time-stamped record of the brand's creation and use.
            </p>
          </>
        ),
      },
      {
        number: "Article 3",
        title: "Unauthorized Use",
        body: (
          <p>
            Use of the name "Studio LeFlow", "LeFlow", or the studio's visual identity for commercial purposes,
            without prior written consent, is not permitted. For partnerships, licensing, or any question regarding
            use of the brand, please contact us through our contact page.
          </p>
        ),
      },
    ],
  },
};

export default function ZastitaBrendaPage() {
  const [lang, setLang] = useState<Lang>("sr");
  const c = content[lang];

  return (
    <>
      <SEO
        title="Zaštita brenda - Studio LeFlow"
        description="Javna izjava o vlasništvu i prvoj upotrebi naziva Studio LeFlow, LeFlow i pripadajućeg vizuelnog identiteta (logo)."
        keywords={["studio leflow zaštita brenda", "leflow žig", "studio leflow logo", "zaštita naziva studio leflow"]}
        canonicalUrl="/zastita-brenda"
        noIndex={false}
      />

      <main className="min-h-screen bg-background">

        {/* Language switcher - deliberately above the fold, unmissable for a non-Serbian reader */}
        <div className="border-b border-border/60 bg-muted/20">
          <div className="max-w-[720px] mx-auto px-6 py-3 flex items-center justify-center gap-3">
            <Languages className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <div className="flex items-center rounded-full border border-border p-0.5">
              <button
                type="button"
                onClick={() => setLang("sr")}
                className={`h-7 px-4 rounded-full text-xs font-semibold transition-colors ${
                  lang === "sr" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="button-brand-protection-lang-sr"
              >
                Srpski
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`h-7 px-4 rounded-full text-xs font-semibold transition-colors ${
                  lang === "en" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid="button-brand-protection-lang-en"
              >
                English
              </button>
            </div>
          </div>
        </div>

        <section className="py-16 md:py-24 px-6">
          <FadeInWhenVisible>
            <div className="max-w-[720px] mx-auto">

              <div className="rounded-lg border border-border bg-card shadow-sm">
                <div className="px-8 md:px-16 pt-14 md:pt-16 pb-12 md:pb-14">

                  {/* Letterhead */}
                  <div className="text-center mb-10">
                    <img
                      src={leflowLogo}
                      alt="Studio LeFlow"
                      draggable={false}
                      onContextMenu={e => e.preventDefault()}
                      className="h-10 w-auto dark:invert select-none mx-auto mb-6 opacity-90"
                    />
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-3">
                      {c.overline}
                    </p>
                    <h1 className="text-3xl md:text-[2.65rem] font-bold font-[Figtree] tracking-tight mb-4">
                      {c.title}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      {c.location} &nbsp;·&nbsp; {c.issued} {ISSUED_DATE[lang]}
                    </p>
                  </div>

                  <div className="border-t border-border mb-10" />

                  {/* Articles */}
                  <div className="space-y-10">
                    {c.articles.map((article) => (
                      <div key={article.number}>
                        <div className="flex items-baseline gap-3 mb-3">
                          <span className="text-xs font-semibold uppercase tracking-widest text-primary/80 shrink-0">
                            {article.number}
                          </span>
                          <h2 className="text-base font-semibold text-foreground">{article.title}</h2>
                        </div>
                        <div className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
                          {article.body}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border mt-12 pt-8">
                    <p className="text-sm font-semibold font-[Figtree]">Studio LeFlow</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.signatureLine}</p>
                  </div>

                </div>
              </div>
            </div>
          </FadeInWhenVisible>
        </section>
      </main>
    </>
  );
}
