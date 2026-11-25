import { Link } from "wouter";
import { ArrowRight, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { SEO, pageStructuredData } from "@/components/SEO";

const services = [
  {
    title: "Snimanje, mix i mastering",
    description: "Snimamo vokal i instrumente, pa radimo mix i mastering. Dobijate master fajl spreman za objavu na striming servisima.",
    features: [
      "Warm Audio WA-47 kondenzatorski mikrofon",
      "Universal Audio Apollo Twin X interface",
      "Realtime AutoTune i UAD plugin suite",
      "Yamaha HS8 studio monitori",
      "Finalni fajlovi u WAV i MP3 formatu",
      "2 besplatne revizije mix-a",
    ],
    slug: "snimanje",
  },
  {
    title: "Instrumentali i produkcija",
    description: "Bit po meri ili kompletna produkcija pesme, sa gotovim backing trackom na koji se snima vokal.",
    features: [
      "Žanrovi: Hip-Hop, Pop, R&B, Trap, Balkan",
      "Ekskluzivna i neekskluzivna prava",
      "Stem fajlovi dostupni",
      "Zaštita autorskih prava putem licence",
    ],
    slug: "instrumentali",
  },
  {
    title: "Video produkcija",
    description: "Snimamo i montiramo muzičke spotove. Pored glavne verzije za YouTube dobijate i kraće formate za društvene mreže.",
    features: [
      "4K snimanje",
      "Koncept i scenario spota",
      "Montaža i color grading",
      "Formati za YouTube i Instagram Reels",
      "Kratak isečak za društvene mreže",
    ],
    slug: "video",
  },
];

const extras = [
  { title: "Voice over i podcast", description: "Snimanje glasovnih reklama, podkast epizoda i audio knjiga." },
  { title: "Demo snimanje", description: "Brzo snimanje demo verzije pesme za audicioniranje, pitch deck ili lični arhiv." },
  { title: "Aranžman i orkestracija", description: "Aranžiranje gotove pesme - dodavanje instrumenata, harmonija i produkcijskih elemenata." },
];

export default function UslugePage() {
  return (
    <div className="min-h-screen">
      <SEO
        title="Usluge - Studio LeFlow | Snimanje, Mix/Mastering, Instrumentali, Video Spotovi Beograd"
        description="Profesionalne usluge muzičke produkcije u Beogradu: snimanje vokala, miks i mastering, custom instrumentali, video spotovi. Studio LeFlow - WA-47, Apollo Twin X, UAD plugins."
        keywords={[
          "snimanje vokala beograd cena",
          "mix mastering beograd",
          "custom beat beograd",
          "muzički studio usluge beograd",
          "studio leflow usluge",
          "snimanje pesme studio beograd",
          "mastering pesme beograd",
          "video spot produkcija beograd",
          "voice over studio beograd",
          "podcast snimanje beograd",
          "instrumentalna produkcija srbija",
        ]}
        structuredData={pageStructuredData.services}
      />

      {/* Hero */}
      <section className="py-20 lg:py-28 bg-background border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              Usluge
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl mb-8">
              Snimanje vokala, mix i mastering, instrumentali po meri i video spotovi. Cene ne objavljujemo jer zavise od projekta. Pošaljite upit i tačnu ponudu dobijate u roku od 24h.
            </p>
            <Link href="/kontakt">
              <Button size="lg" className="text-base px-8">
                <Phone className="mr-2 w-5 h-5" />
                Zakažite termin
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* Main services */}
      <section className="py-20 bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="space-y-12">
            {services.map((service) => (
              <FadeInWhenVisible key={service.slug}>
                <Card id={service.slug} className="overflow-hidden scroll-mt-24">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-2 gap-0">
                      <div className="p-5 md:p-8 lg:p-10">
                        <h2 className="text-2xl lg:text-3xl font-bold mb-4">{service.title}</h2>
                        <p className="text-muted-foreground text-lg">{service.description}</p>
                      </div>
                      <div className="bg-muted/30 p-5 md:p-8 lg:p-10 flex items-center">
                        <ul className="space-y-3 w-full">
                          {service.features.map((f) => (
                            <li key={f} className="flex items-start gap-3">
                              <span className="text-muted-foreground mt-0.5 flex-shrink-0">-</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </FadeInWhenVisible>
            ))}
          </div>
        </div>
      </section>

      {/* Extra services */}
      <section id="dodatne" className="py-20 bg-muted/10 border-t border-border/40 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <h2 className="text-2xl font-bold mb-8">Dodatne usluge</h2>
          </FadeInWhenVisible>
          <div className="space-y-0 divide-y divide-border/50 max-w-4xl">
            {extras.map((extra) => (
              <div key={extra.title}>
                <div className="py-6 grid sm:grid-cols-[200px_1fr] gap-2 sm:gap-6">
                  <p className="font-semibold text-foreground">{extra.title}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{extra.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-background border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <h2 className="text-3xl font-bold mb-3">Zakažite termin</h2>
            <p className="text-muted-foreground mb-8 max-w-lg">
              Konsultacija je besplatna. Dođite u studio ili pišite, pa dogovorimo šta vam treba.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/kontakt">
                <Button size="lg" className="text-base px-8">
                  Kontaktirajte nas
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/projekti">
                <Button size="lg" variant="outline" className="text-base px-8">
                  Pogledajte projekte
                </Button>
              </Link>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>
    </div>
  );
}
