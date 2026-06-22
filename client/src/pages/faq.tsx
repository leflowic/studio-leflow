import { Link } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { SEO, pageStructuredData } from "@/components/SEO";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Da li moram da dođem sa gotovim tekstom?",
    answer:
      "Da, obavezno. Sesija snimanja je tu da snimimo ono što si kreirao, ne da pišemo pesmu. Ako dođeš sa pola teksta i računaš na \"malu pomoć\" — to nije mala pomoć, to je pisanje teksta. Dođi potpuno spreman.",
  },
  {
    question: "Mogu li da dođem kao potpuni početnik?",
    answer:
      "Tehnički da, ali iskreno — ne preporučujemo. Studio nije za početnike koji još razvijaju tehniku. Ako si početnik, stekni iskustvo na pristupačnijoj opremi, pa kad si spreman — vrata su otvorena.",
  },
  {
    question: "Šta dobijam na kraju sesije?",
    answer:
      "Zavisi od dogovorene usluge. Ako dolaziš samo na snimanje, dobijaš minimalno obrađen demo — autotune, kompresija i EQ po potrebi. Ako dolaziš na snimanje + mix/master, dobijaš pesmu smixanu i masterovanu, spremu za distribuciju.",
  },
  {
    question: "Koliko revizija je uključeno?",
    answer:
      "Za snimanje i mix uključene su 3 besplatne revizije finalne verzije. Za produkciju beata uključena je 1 revizija (izmene u aranžmanu ili zvucima). Za video produkciju uključene su 2 revizije montaže. Sve detalje možeš pronaći u Pravilima i Uslovima.",
  },
  {
    question: "Kako da zakažem termin?",
    answer:
      "Najbrže putem WhatsApp-a ili Instagram DM-a. Kontakt informacije su dostupne na stranici za kontakt.",
  },
  {
    question: "Da li snimate samo vokal ili i instrumente?",
    answer:
      "Primarno snimamo vokal. Za instrumentale i produkciju radimo custom bitove — žanrovi uključuju Hip-Hop, Pop, R&B, Trap i Balkan muziku.",
  },
];

export default function FAQPage() {
  return (
    <>
      <SEO
        title="Česta Pitanja — Studio LeFlow"
        description="Odgovori na najčešća pitanja o snimanju, mix/masteru, instrumentalima i rezervaciji termina u Studio LeFlow Beograd."
        keywords={["studio leflow faq", "pitanja snimanje", "kako zakazati studio", "revizije mix", "početnik studio beograd"]}
        canonicalUrl="/faq"
        structuredData={pageStructuredData.faq}
      />

      <main className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative pt-24 pb-12 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,hsl(var(--primary)/0.12),transparent)] pointer-events-none" />
          <div className="max-w-4xl mx-auto px-4 text-center relative">
            <FadeInWhenVisible>
              <p className="text-primary text-sm font-semibold uppercase tracking-[0.2em] mb-3">Česta Pitanja</p>
              <h1 className="heading-xl mb-4">
                Sve što trebaš da znaš
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Odgovori na najčešća pitanja pre dolaska u studio.
              </p>
            </FadeInWhenVisible>
          </div>
        </section>

        {/* Accordion */}
        <section className="pb-24 px-4">
          <div className="max-w-3xl mx-auto">
            <FadeInWhenVisible delay={0.1}>
              <Accordion type="single" collapsible className="space-y-2">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border border-white/[0.07] rounded-xl bg-card/30 backdrop-blur-sm overflow-hidden"
                  >
                    <AccordionTrigger className="px-6 py-5 text-left font-semibold hover:text-primary hover:no-underline transition-colors duration-200">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-5 text-muted-foreground leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </FadeInWhenVisible>

            <div className="text-center mt-12">
              <p className="text-muted-foreground mb-4">Imaš još pitanja?</p>
              <Link href="/kontakt">
                <Button size="lg" className="cursor-pointer">
                  Kontaktiraj nas <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
