import { Link } from "wouter";
import { Mic2, Music, Video, CheckCircle2, ArrowRight, Phone, Headphones, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { SEO, pageStructuredData } from "@/components/SEO";

const services = [
  {
    icon: Mic2,
    title: "Snimanje & Mix/Mastering",
    description: "Kompletan signal chain — od ulaska u booth do finalnog mastered fajla. WA-47 mikrofon, Apollo Twin X, UAD plugin suite.",
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
    description: "Custom bitovi i kompletna muzička produkcija — od prvog bita do finalnog fajla. Ekskluzivna i neekskluzivna prava.",
    features: [
      "Profesionalni synthesizeri i MIDI kontroleri",
      "Žanrovi: Hip-Hop, Pop, R&B, Trap, Balkan",
      "Ekskluzivna i neekskluzivna prava",
      "Stem fajlovi dostupni",
      "Ugovorna zaštita autorskih prava",
    ],
    slug: "instrumentali",
  },
  {
    icon: Video,
    title: "Video Produkcija",
    description: "Snimanje i postprodukcija muzičkih spotova — od koncepta do finalne verzije optimizovane za YouTube i socijalne mreže.",
    features: [
      "4K video snimanje sa Sony FX3",
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
  { icon: Headphones, title: "Voice Over & Podcast", description: "Snimanje glasovnih reklama, podkast epizoda i audio knjiga u studiju." },
  { icon: Mic2, title: "Demo snimanje", description: "Brzo snimanje demo verzije pesme za audicioniranje, pitch deck ili lični arhiv." },
  { icon: Camera, title: "Aranžman & Orkestracija", description: "Aranžiranje gotove pesme — dodavanje instrumenata, harmonija i produkcijskih elemenata." },
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
      <section className="relative pt-24 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center relative">
          <FadeInWhenVisible>
            <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3">Studio LeFlow</p>
            <h1 className="heading-xl mb-4">
              Naše <span className="text-primary">Usluge</span>
            </h1>
          </FadeInWhenVisible>
          <FadeInWhenVisible delay={0.15}>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Sve što vam treba za muzičku produkciju — na jednom mestu, u Beogradu.
            </p>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* Main services */}
      <section className="py-20 bg-background">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="space-y-6">
            {services.map((service, i) => (
              <FadeInWhenVisible key={service.slug} delay={i * 0.08}>
                <div className="rounded-2xl border border-white/[0.07] bg-card/40 backdrop-blur-sm hover:border-primary/30 hover:shadow-[0_0_30px_-8px] hover:shadow-primary/20 transition-all duration-500 overflow-hidden">
                  <div className="grid md:grid-cols-2 gap-0">
                    <div className="p-7 md:p-10">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-5">
                        <service.icon className="w-6 h-6 text-primary" />
                      </div>
                      <h2 className="text-2xl lg:text-3xl font-bold mb-3">{service.title}</h2>
                      <p className="text-muted-foreground text-base mb-6 leading-relaxed">{service.description}</p>
                      <Link href="/kontakt">
                        <Button
                          variant="outline"
                          className="border-primary/40 text-primary hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 cursor-pointer"
                        >
                          Pitajte za cenu
                          <ArrowRight className="ml-2 w-4 h-4" />
                        </Button>
                      </Link>
                    </div>
                    <div className="border-t md:border-t-0 md:border-l border-white/[0.06] bg-white/[0.02] p-7 md:p-10 flex items-center">
                      <ul className="space-y-3 w-full">
                        {service.features.map((f) => (
                          <li key={f} className="flex items-start gap-3">
                            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-muted-foreground">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </FadeInWhenVisible>
            ))}
          </div>
        </div>
      </section>

      {/* Extra services */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <FadeInWhenVisible>
            <div className="text-center mb-12">
              <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3">Više opcija</p>
              <h2 className="heading-lg mb-4">Dodatne Usluge</h2>
              <p className="text-muted-foreground max-w-xl mx-auto text-center">
                Specijalizovane opcije za različite kreativne potrebe.
              </p>
            </div>
          </FadeInWhenVisible>
          <div className="grid md:grid-cols-3 gap-4">
            {extras.map((extra, i) => (
              <div
                key={extra.title}
                className="rounded-2xl border border-white/[0.07] bg-card/40 backdrop-blur-sm hover:border-primary/30 hover:shadow-[0_0_30px_-8px] hover:shadow-primary/20 transition-all duration-500 p-6"
              >
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 mb-4">
                  <extra.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-base mb-2">{extra.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{extra.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_70%_at_50%_50%,hsl(var(--primary)/0.10),transparent)] pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 md:px-6 text-center relative">
          <FadeInWhenVisible>
            <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3">Sledeći korak</p>
            <h2 className="heading-lg mb-4">Zakažite Termin</h2>
          </FadeInWhenVisible>
          <FadeInWhenVisible delay={0.1}>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
              Razgovarajmo o vašoj muzičkoj viziji. Besplatna konsultacija, bez obaveza.
            </p>
          </FadeInWhenVisible>
          <FadeInWhenVisible delay={0.2}>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/kontakt">
                <Button size="lg" className="text-base px-8 cursor-pointer">
                  <Phone className="mr-2 w-5 h-5" />
                  Kontaktirajte Nas
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/projekti">
                <Button size="lg" variant="outline" className="text-base px-8 border-white/[0.12] hover:border-primary/40 hover:text-primary cursor-pointer transition-all duration-300">
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
