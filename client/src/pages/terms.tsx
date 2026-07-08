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

const rulesSections = [
  {
    id: "politika-avansa",
    title: "Politika Avansa",
    items: [
      "Za sve usluge Studio LeFlow zahteva se obavezan avans u iznosu od 30% ukupne cene projekta.",
      "Avans se plaća pri rezervaciji termina i potvrđivanju dogovora o projektu.",
      "Avans je nepovratan u svim slučajevima, osim u situacijama kada Studio LeFlow ne može ispuniti dogovorene usluge iz objektivnih razloga.",
    ],
  },
  {
    id: "nepovrativost-avansa",
    title: "Razlozi Nepovrativosti Avansa",
    items: [
      "<strong>Rezervacija studijskog vremena:</strong> Vaš termin se rezerviše ekskluzivno za vas, što znači da studio odbija druge klijente u tom periodu. Otkazivanje termina u kratkom roku rezultira gubicima koje studio ne može nadoknaditi.",
      "<strong>Tehnička i kreativna priprema:</strong> Pre svakog termina, naš tim priprema opremu, podešava akustiku prostora i planira kreativni pristup na osnovu vaših potreba.",
      "<strong>Angažovanje kreativnog tima:</strong> Za vaš projekat angažujemo profesionalce (producente, mix inženjere, video operatere) koji se pripremaju i rezervišu vreme specifično za vaš projekat.",
      "<strong>Organizacioni troškovi:</strong> Koordinacija rasporeda, komunikacija sa klijentom, priprema materijala i administracija projekta predstavljaju značajan uloženi trud pre same realizacije.",
    ],
  },
  {
    id: "otkazivanje",
    title: "Otkazivanje i Izmene Termina",
    items: [
      "Izmene termina moguće su uz obavezu da nas obavestite <strong>najmanje 48 sati unapred</strong>.",
      "Promena termina uz poštovanje ovog roka ne utiče na avans - jednostavno prenosimo rezervaciju.",
      "Otkazivanje ili pomeranje termina sa manje od 48 sati najave rezultira gubitkom avansa.",
      "Nepojavljivanje na zakazanom terminu bez prethodne najave smatra se otkazivanjem i avans se ne vraća.",
      "Studio LeFlow zadržava pravo da ponudi alternativni termin u slučaju tehničkih problema ili više sile.",
    ],
  },
  {
    id: "uslovi-placanja",
    title: "Uslovi Plaćanja",
    items: [
      "<strong>Prihvaćeni načini plaćanja:</strong> Gotovina, bankovna transakcija, PayPal.",
      "<strong>Avans (30%):</strong> Plaća se prilikom potvrde rezervacije.",
      "<strong>Preostali iznos (70%):</strong> Plaća se po završetku projekta, pre isporuke finalnih fajlova.",
      "Za veće projekte moguć je dogovor o ratama - kontaktirajte nas za poseban aranžman.",
      "Račun/Faktura se izdaje na zahtev klijenta.",
    ],
  },
  {
    id: "autorska-prava",
    title: "Autorska Prava i Vlasništvo",
    items: [
      "<strong>Snimanje i Mix/Master:</strong> Vi zadržavate sva prava na snimljeni materijal i finalni miks. Studio LeFlow ne koristi vaš materijal bez vaše dozvole.",
      "<strong>Instrumentali (Beatovi):</strong> U zavisnosti od dogovora, možete kupiti ekskluzivna prava (samo vi možete koristiti beat) ili neekskluzivnu licencu (beat može biti prodat i drugima). Uslovi se preciziraju u licenci.",
      "<strong>Video produkcija:</strong> Finalni video je vaše vlasništvo. Studio LeFlow zadržava pravo da koristi isečke videa u promotivne svrhe (portfolio, društvene mreže) uz vašu saglasnost.",
      "Za komercijalne projekte velikih razmera, autorska prava se detaljno definišu pisanom licencom.",
    ],
  },
  {
    id: "digitalne-licence",
    title: "Digitalne Licence",
    items: [
      "<strong>Šta je digitalna licenca?</strong> Studio LeFlow izdaje digitalne licence kao zvanični dokaz o pruženim uslugama, prenosu prava ili kupovini instrumentala. Svaka licenca ima jedinstven broj i verifikacioni kod koji garantuje njenu autentičnost.",
      "<strong>Verifikacija autentičnosti:</strong> Svaku licencu možete proveriti na adresi <strong>studioleflow.com/proveri/[kod]</strong>. Verifikaciona stranica prikazuje sve relevantne podatke o licenci.",
      "<strong>Zaštita od falsifikacija:</strong> Svaka licenca je kriptografski zaštićena HMAC algoritmom, što čini falsifikovanje dokumenta praktično nemogućim.",
      "<strong>Tipovi licenci:</strong> Izdajemo tri tipa licenci - <strong>Mix & Master licenca</strong>, <strong>Licenca za prenos autorskih prava</strong> i <strong>Licenca za prodaju instrumentala</strong>.",
      "<strong>Pravna vrednost:</strong> Licence predstavljaju zvaničan dokument koji potvrđuje poslovni odnos između Studio LeFlow i klijenta. U slučaju spora, verifikacioni sistem služi kao neutralan i proveriv izvor istine.",
    ],
  },
  {
    id: "revizije",
    title: "Revizije i Garancija Kvaliteta",
    items: [
      "<strong>Snimanje i Mix/Master:</strong> Uključene su do <strong>2 besplatne revizije</strong> finalne verzije. Dodatne revizije se naplaćuju posebno.",
      "<strong>Instrumentali:</strong> Uključene su do <strong>2 besplatne revizije</strong> beat-a. Potpuno novi beat se smatra novim projektom.",
      "<strong>Video produkcija:</strong> Uključene su do <strong>2 besplatne revizije</strong> montaže. Potpuno nova snimanja naplaćuju se posebno.",
      "Garancija kvaliteta: Ako niste zadovoljni finalnim produktom zbog tehničkih grešaka sa naše strane, radićemo bez dodatne naplate dok ne budete zadovoljni.",
      "Revizije moraju biti konkretne i jasno definisane. Redefinisanje celokupnog kreativnog pravca smatra se novim projektom.",
    ],
  },
];

const faqs = [
  {
    question: "Da li moram da dođem sa gotovim tekstom?",
    answer:
      "Da, obavezno. Sesija snimanja je tu da snimimo ono što si kreirao, ne da pišemo pesmu. Ako dođeš sa pola teksta i računaš na \"malu pomoć\" - to nije mala pomoć, to je pisanje teksta. Dođi potpuno spreman.",
  },
  {
    question: "Mogu li da dođem kao potpuni početnik?",
    answer:
      "Tehnički da, ali iskreno - ne preporučujemo. Studio je opremljen vrhunskom profesionalnom opremom i ne bismo voleli da plaćaš profesionalne cene dok još razvijaš tehniku. Ako si početnik, stekni iskustvo na pristupačnijoj opremi, pa kad si spreman - vrata su otvorena.",
  },
  {
    question: "Šta dobijam na kraju sesije?",
    answer:
      "Zavisi od dogovorene usluge. Ako dolaziš samo na snimanje, dobijaš minimalno obrađen demo - autotune, kompresija i EQ po potrebi. Ako dolaziš na snimanje + mix/master, dobijaš demo priblično smixan, spreman za dalju obradu ili distribuciju.",
  },
  {
    question: "Koliko revizija je uključeno?",
    answer:
      "Za sve usluge uključene su 2 besplatne revizije. Dodatne revizije se naplaćuju posebno. Sve detalje možeš pronaći u pravilima iznad.",
  },
  {
    question: "Kako da zakažem termin?",
    answer:
      "Najbrže putem WhatsApp-a ili Instagram DM-a. Kontakt informacije su dostupne na stranici za kontakt.",
  },
  {
    question: "Da li snimate samo vokal ili i instrumente?",
    answer:
      "Primarno snimamo vokal. Za instrumentale i produkciju radimo custom bitove - žanrovi uključuju Hip-Hop, Pop, R&B, Trap i Balkan muziku.",
  },
];

export default function Terms() {
  return (
    <>
      <SEO
        title="Pravila i Česta Pitanja - Studio LeFlow"
        description="Uslovi saradnje Studio LeFlow (politika avansa, otkazivanje termina, autorska prava) i odgovori na najčešća pitanja o snimanju, mix/masteru i rezervaciji termina."
        keywords={["pravila studio leflow", "uslovi saradnje studio", "politika avansa studio", "studio leflow faq", "česta pitanja studio"]}
        canonicalUrl="/pravila"
        structuredData={pageStructuredData.faq}
      />

      <main className="min-h-screen bg-background">
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <FadeInWhenVisible>
              <div className="text-center mb-14">
                <h1 className="text-4xl md:text-5xl font-bold font-[Figtree] mb-4">
                  Pravila i Česta Pitanja
                </h1>
                <p className="text-lg text-muted-foreground">
                  Uslovi saradnje i odgovori na sve što treba da znaš pre dolaska u studio.
                </p>
              </div>
            </FadeInWhenVisible>

            <FadeInWhenVisible delay={0.1}>
              <div className="mb-16">
                <h2 className="text-2xl font-bold font-[Figtree] mb-6">Pravila i Uslovi Saradnje</h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {rulesSections.map((section) => (
                    <AccordionItem key={section.id} value={section.id} className="border rounded-lg px-6">
                      <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                        {section.title}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-5 leading-relaxed space-y-3">
                        {section.items.map((item, i) => (
                          <p key={i} dangerouslySetInnerHTML={{ __html: item }} />
                        ))}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </FadeInWhenVisible>

            <FadeInWhenVisible delay={0.15}>
              <div>
                <h2 className="text-2xl font-bold font-[Figtree] mb-6">Česta Pitanja</h2>
                <Accordion type="single" collapsible className="space-y-3">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`} className="border rounded-lg px-6">
                      <AccordionTrigger className="text-left font-semibold hover:no-underline py-5">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </FadeInWhenVisible>

            <FadeInWhenVisible delay={0.2}>
              <div className="mt-14 text-center bg-muted/40 rounded-xl p-8">
                <p className="text-muted-foreground mb-5">
                  Nisi pronašao odgovor ili imaš pitanje o dogovoru? Javi nam se direktno.
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
