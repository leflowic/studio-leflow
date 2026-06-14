import { Link } from "wouter";
import { Mic2, Music, Video, CheckCircle2, ArrowRight, Phone, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { SEO, pageStructuredData } from "@/components/SEO";

const services = [
  {
    icon: Mic2,
    title: "Snimanje & Mix/Mastering",
    description: "Profesionalno snimanje vokala i instrumenata uz kompletan signal chain — od ulaska u booth do finalnog mastered fajla.",
    features: [
      "Warm Audio WA-47 kondenzatorski mikrofon",
      "Universal Audio Apollo Twin X interface",
      "Realtime AutoTune i UAD plugin suite",
      "Yamaha HS8 studio monitori",
      "Finalni fajlovi u WAV i MP3 formatu",
      "Neograničen broj revizija mix-a",
    ],
    slug: "snimanje",
  },
  {
    icon: Music,
    title: "Instrumentali & Produkcija",
    description: "Custom bitovi i kompletna muzička produkcija pesama — od ideje do gotovog backing tracka.",
    features: [
      "Profesionalni synthesizeri i MIDI kontroleri",
      "Žanrovi: Hip-Hop, Pop, R&B, Trap, Balkan",
      "Ekskluzivna i neekskluzivna prava",
      "Produkcija od ideje do finalnog miksa",
      "Stem fajlovi dostupni",
      "Ugovorna zaštita autorskih prava",
    ],
    slug: "instrumentali",
  },
  {
    icon: Video,
    title: "Video Produkcija",
    description: "Snimanje i postprodukcija profesionalnih muzičkih spotova — od koncepta do finalne verzije optimizovane za YouTube.",
    features: [
      "4K video snimanje sa profesionalnom opremom",
      "Kreativni koncept i scenario",
      "Color grading i cinematic post-produkcija",
      "Kratak rok isporuke",
      "Optimizovano za YouTube, Instagram Reels",
      "Highlight clip za socijalne mreže",
    ],
    slug: "video",
  },
];

const extras = [
  { icon: Headphones, title: "Voice Over & Podcast", description: "Snimanje glasovnih reklama, podkast epizoda i audio knjiga u profesionalnom okruženju." },
  { icon: Mic2, title: "Demo snimanje", description: "Brzo snimanje demo verzije pesme za audicioniranje, pitch deck ili lični arhiv." },
  { icon: Music, title: "Aranžman & Orkestracija", description: "Aranžiranje gotove pesme — dodavanje instrumenata, harmonija i produkcijskih elemenata." },
];

export default function UslugePage() {
  return (
    <div className="min-h-screen">
      <SEO
        title="Usluge - Studio LeFlow | Snimanje, Mix/Mastering, Instrumentali, Video Spotovi Beograd"
        description="Profesionalne usluge muzičke produkcije u Beogradu: snimanje vokala, miks i mastering, custom instrumentali, video spotovi. Studio LeFlow — WA-47, Apollo Twin X, UAD plugins."
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
      <section className="py-20 lg:py-28 bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <FadeInWhenVisible>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Naše <span className="text-primary">Usluge</span>
            </h1>
          </FadeInWhenVisible>
          <FadeInWhenVisible delay={0.15}>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
              Sve što vam treba za profesionalnu muzičku produkciju — na jednom mestu, u Beogradu.
            </p>
          </FadeInWhenVisible>
          <FadeInWhenVisible delay={0.25}>
            <Link href="/kontakt">
              <Button size="lg" className="text-lg px-8">
                <Phone className="mr-2 w-5 h-5" />
                Zakažite Termin
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
            {services.map((service, i) => (
              <FadeInWhenVisible key={service.slug} delay={i * 0.1}>
                <Card className="overflow-hidden">
                  <CardContent className="p-0">
                    <div className="grid md:grid-cols-2 gap-0">
                      <div className="p-8 lg:p-10">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 mb-6">
                          <service.icon className="w-7 h-7 text-primary" />
                        </div>
                        <h2 className="text-2xl lg:text-3xl font-bold mb-4">{service.title}</h2>
                        <p className="text-muted-foreground text-lg mb-6">{service.description}</p>
                        <Link href="/kontakt">
                          <Button>
                            Pitajte za cenu
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </Button>
                        </Link>
                      </div>
                      <div className="bg-muted/30 p-8 lg:p-10 flex items-center">
                        <ul className="space-y-3 w-full">
                          {service.features.map((f) => (
                            <li key={f} className="flex items-start gap-3">
                              <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
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
      <section className="py-20 bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Dodatne Usluge</h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Pored glavnih usluga, nudimo i specijalizovane opcije za različite potrebe.
              </p>
            </div>
          </FadeInWhenVisible>
          <div className="grid md:grid-cols-3 gap-6">
            {extras.map((extra, i) => (
              <FadeInWhenVisible key={extra.title} delay={i * 0.1}>
                <Card className="h-full">
                  <CardHeader>
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 mb-2">
                      <extra.icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{extra.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm">{extra.description}</p>
                  </CardContent>
                </Card>
              </FadeInWhenVisible>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
          <FadeInWhenVisible>
            <h2 className="text-4xl font-bold mb-4">Gotovi za Snimanje?</h2>
          </FadeInWhenVisible>
          <FadeInWhenVisible delay={0.15}>
            <p className="text-xl text-primary-foreground/90 mb-10">
              Zakažite besplatnu konsultaciju i razgovarajmo o vašoj muzičkoj viziji.
            </p>
          </FadeInWhenVisible>
          <FadeInWhenVisible delay={0.25}>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/kontakt">
                <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 text-primary-foreground border-white/30 hover:bg-white/20">
                  Kontaktirajte Nas
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/projekti">
                <Button size="lg" variant="outline" className="text-lg px-8 bg-white/10 text-primary-foreground border-white/30 hover:bg-white/20">
                  Pogledajte Projekte
                </Button>
              </Link>
            </div>
          </FadeInWhenVisible>
        </div>
      </section>
    </div>
  );
}
