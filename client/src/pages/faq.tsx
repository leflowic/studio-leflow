import { Link } from "wouter";
import { HelpCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { SEO } from "@/components/SEO";
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
      "Tehnički da, ali iskreno — ne preporučujemo. Studio je opremljen vrhunskom profesionalnom opremom i ne bismo voleli da plaćaš profesionalne cene dok još razvijaš tehniku. Ako si početnik, stekni iskustvo na pristupačnijoj opremi, pa kad si spreman — vrata su otvorena.",
  },
  {
    question: "Šta dobijam na kraju sesije?",
    answer:
      "Zavisi od dogovorene usluge. Ako dolaziš samo na snimanje, dobijaš minimalno obrađen demo — autotune, kompresija i EQ po potrebi. Ako dolaziš na snimanje + mix/master, dobijaš demo priblično smixan, spreman za dalju obradu ili distribuciju.",
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
      />

      <main className="min-h-screen bg-background">
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <FadeInWhenVisible>
              <div className="text-center mb-14">
                <div className="flex justify-center mb-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <HelpCircle className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold font-[Montserrat] mb-4">
                  Česta Pitanja
                </h1>
                <p className="text-lg text-muted-foreground">
                  Sve što trebaš da znaš pre dolaska u studio.
                </p>
              </div>
            </FadeInWhenVisible>

            <FadeInWhenVisible delay={0.1}>
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((faq, index) => (
                  <AccordionItem
                    key={index}
                    value={`item-${index}`}
                    className="border rounded-lg px-6"
                  >
                    <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </FadeInWhenVisible>

            <FadeInWhenVisible delay={0.2}>
              <div className="mt-14 text-center bg-muted/40 rounded-xl p-8">
                <p className="text-muted-foreground mb-5">
                  Nisi pronašao odgovor? Javi nam se direktno.
                </p>
                <Button asChild size="lg">
                  <Link href="/kontakt">
                    Kontaktiraj nas <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </Button>
              </div>
            </FadeInWhenVisible>
          </div>
        </section>
      </main>
    </>
  );
}
