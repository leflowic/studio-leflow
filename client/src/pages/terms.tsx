import { Link } from "wouter";
import { AlertCircle, CheckCircle2, Clock, CreditCard, FileText, Shield, ArrowLeft, MessageSquare, BadgeCheck, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";
import { SEO } from "@/components/SEO";

export default function Terms() {
  const termsSection = [
    {
      id: "politika-avansa",
      icon: CreditCard,
      title: "Politika Avansa",
      content: [
        "Za sve usluge Studio LeFlow zahteva se obavezan avans u iznosu od 30% ukupne cene projekta.",
        "Avans se plaća pri rezervaciji termina i potvrđivanju dogovora o projektu.",
        "Avans je nepovratan u svim slučajevima, osim u situacijama kada Studio LeFlow ne može ispuniti dogovorene usluge iz objektivnih razloga."
      ]
    },
    {
      id: "nepovrativost-avansa",
      icon: AlertCircle,
      title: "Razlozi Nepovrativosti Avansa",
      content: [
        "<strong>Rezervacija studijskog vremena:</strong> Vaš termin se rezerviše ekskluzivno za vas, što znači da studio odbija druge klijente u tom periodu. Otkazivanje termina u kratkom roku rezultira gubicima koje studio ne može nadoknaditi.",
        "<strong>Tehnička i kreativna priprema:</strong> Pre svakog termina, naš tim priprema opremu, podešava akustiku prostora i planira kreativni pristup na osnovu vaših potreba. Ova priprema zahteva vreme i stručnost.",
        "<strong>Angažovanje kreativnog tima:</strong> Za vaš projekat angažujemo profesionalce (producente, mix inženjere, video operatere) koji se pripremaju i rezervišu vreme specifično za vaš projekat.",
        "<strong>Organizacioni troškovi:</strong> Koordinacija rasporeda, komunikacija sa klijentom, priprema materijala i administracija projekta predstavljaju značajan uloženi trud pre same realizacije."
      ]
    },
    {
      id: "otkazivanje",
      icon: Clock,
      title: "Otkazivanje i Izmene Termina",
      content: [
        "Izmene termina moguće su uz obavezu da nas obavestite <strong>najmanje 48 sati unapred</strong>.",
        "Promena termina uz poštovanje ovog roka ne utiče na avans - jednostavno prenosimo rezervaciju.",
        "Otkazivanje ili pomeranje termina sa manje od 48 sati najave rezultira gubitkom avansa.",
        "Nepojavljivanje na zakazanom terminu bez prethodne najave smatra se otkazivanjem i avans se ne vraća.",
        "Studio LeFlow zadržava pravo da ponudi alternativni termin u slučaju tehničkih problema ili više sile."
      ]
    },
    {
      id: "uslovi-placanja",
      icon: CreditCard,
      title: "Uslovi Plaćanja",
      content: [
        "<strong>Prihvaćeni načini plaćanja:</strong> Gotovina, bankovna transakcija, PayPal.",
        "<strong>Avans (30%):</strong> Plaća se prilikom potvrde rezervacije.",
        "<strong>Preostali iznos (70%):</strong> Plaća se po završetku projekta, pre isporuke finalnih fajlova.",
        "Za veće projekte moguć je dogovor o ratama - kontaktirajte nas za poseban aranžman.",
        "Račun/Faktura se izdaje na zahtev klijenta."
      ]
    },
    {
      id: "autorska-prava",
      icon: FileText,
      title: "Autorska Prava i Vlasništvo",
      content: [
        "<strong>Snimanje i Mix/Master:</strong> Vi zadržavate sva prava na snimljeni materijal i finalni miks. Studio LeFlow ne koristi vaš materijal bez vaše dozvole.",
        "<strong>Instrumentali (Beatovi):</strong> U zavisnosti od dogovora, možete kupiti ekskluzivna prava (samo vi možete koristiti beat) ili neekskluzivnu licencu (beat može biti prodat i drugima). Uslovi se preciziraju u ugovoru.",
        "<strong>Video produkcija:</strong> Finalni video je vaše vlasništvo. Studio LeFlow zadržava pravo da koristi isečke videa u promotivne svrhe (portfolio, društvene mreže) uz vašu saglasnost.",
        "Za komercijalne projekte velikih razmera, autorska prava se detaljno definišu pisanim ugovorom."
      ]
    },
    {
      id: "digitalne-licence",
      icon: BadgeCheck,
      title: "Digitalne Licence",
      content: [
        "<strong>Šta je digitalna licenca?</strong> Studio LeFlow izdaje digitalne licence kao zvanični dokaz o pruženim uslugama, prenosu prava ili kupovini instrumentala. Svaka licenca ima jedinstven broj i verifikacioni kod koji garantuje njenu autentičnost.",
        "<strong>Verifikacija autentičnosti:</strong> Svaku licencu možete proveriti na adresi <strong>studioleflow.com/proveri/[kod]</strong>. Verifikaciona stranica prikazuje sve relevantne podatke o licenci — kome je izdata, tip licence i datum izdavanja.",
        "<strong>Zaštita od falsifikacija:</strong> Svaka licenca je kriptografski zaštićena HMAC algoritmom. Nije moguće kreirati validnu licencu bez zvaničnog sistema Studio LeFlow, što čini falsifikovanje dokumenta praktično nemogućim.",
        "<strong>Tipovi licenci:</strong> Izdajemo tri tipa licenci — <strong>Mix & Master licenca</strong> (za usluge miksanja i masteringa), <strong>Licenca za prenos autorskih prava</strong> (za prenos prava na muzičko delo) i <strong>Licenca za prodaju instrumentala</strong> (za kupovinu beat-a).",
        "<strong>Čuvanje licence:</strong> Preporučujemo da sačuvate PDF licence koji ste dobili od nas. U slučaju gubitka, autentičnost uvek možete proveriti verifikacionim kodom koji ostaje trajno dostupan na našem sajtu.",
        "<strong>Pravna vrednost:</strong> Licence predstavljaju zvaničan dokument koji potvrđuje poslovni odnos između Studio LeFlow i klijenta. U slučaju spora, verifikacioni sistem služi kao neutralan i proveriv izvor istine."
      ]
    },
    {
      id: "revizije",
      icon: Shield,
      title: "Revizije i Garancija Kvaliteta",
      content: [
        "<strong>Snimanje i Mix/Master:</strong> Uključene su do <strong>2 besplatne revizije</strong> finalne verzije. Dodatne revizije se naplaćuju posebno.",
        "<strong>Instrumentali:</strong> Uključene su do <strong>2 besplatne revizije</strong> beat-a (izmene u aranžmanu, zvucima). Potpuno novi beat se smatra novim projektom.",
        "<strong>Video produkcija:</strong> Uključene su do <strong>2 besplatne revizije</strong> montaže (izmene u editingu, boji, efektima). Potpuno nova snimanja naplaćuju se posebno.",
        "Garancija kvaliteta: Ako niste zadovoljni finalnim produktom zbog tehničkih grešaka sa naše strane, radićemo bez dodatne naplate dok ne budete zadovoljni.",
        "Revizije moraju biti konkretne i jasno definisane. Redefinisanje celokupnog kreativnog pravca smatra se novim projektom."
      ]
    }
  ];

  return (
    <div className="min-h-screen py-12 lg:py-20">
      <SEO
        title="Pravila i Uslovi - Studio LeFlow | Politika Avansa i Saradnje"
        description="Uslovi saradnje Studio LeFlow: politika avansa, otkazivanje termina, prava i obaveze. Transparentna pravila za sve klijente muzičkog studija u Beogradu."
        keywords={["pravila studio leflow", "uslovi saradnje studio", "politika avansa studio", "studio leflow pravila", "uslovi muzički studio beograd"]}
      />
      <div className="max-w-5xl mx-auto px-4 md:px-6">
        <FadeInWhenVisible delay={0.1}>
          <div className="mb-8">
            <Link href="/">
              <Button variant="ghost" data-testid="button-back-home">
                <ArrowLeft className="mr-2 w-4 h-4" />
                Nazad na Početnu
              </Button>
            </Link>
          </div>
        </FadeInWhenVisible>

        <FadeInWhenVisible delay={0}>
          <div className="mb-16 text-center">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 tracking-tight" data-testid="text-terms-title">
              Pravila i Uslovi
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Studio LeFlow je posvećen transparentnosti i profesionalnosti. Molimo vas da pažljivo pročitate naša pravila 
              kako bismo zajedno obezbedili uspešnu saradnju.
            </p>
          </div>
        </FadeInWhenVisible>

        <div className="flex justify-center mb-8 -mt-4">
          <ChevronDown className="w-8 h-8 text-primary/60 animate-bounce" />
        </div>

        <FadeInWhenVisible delay={0.15}>
          <div className="mb-12 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
            {termsSection.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
              >
                <section.icon className="w-4 h-4 flex-shrink-0 text-primary" />
                <span className="leading-tight">{section.title}</span>
              </a>
            ))}
          </div>
        </FadeInWhenVisible>

        <div className="space-y-8">
          {termsSection.map((section, index) => (
            <div id={section.id} key={index}>
            <FadeInWhenVisible delay={index * 0.05}>
                <Card data-testid={`card-terms-${index}`} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <CardTitle className="flex items-center gap-3 text-lg md:text-2xl">
                      <div className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-primary/10 ring-2 ring-primary/20 flex-shrink-0">
                        <section.icon className="w-5 h-5 md:w-6 md:h-6 text-primary" />
                      </div>
                      <span data-testid={`text-section-title-${index}`}>{section.title}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <ul className="space-y-4">
                      {section.content.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-4" data-testid={`text-section-content-${index}-${itemIndex}`}>
                          <CheckCircle2 className="w-5 h-5 text-primary mt-1 flex-shrink-0" />
                          <span 
                            className="text-base md:text-lg leading-relaxed text-muted-foreground"
                            dangerouslySetInnerHTML={{ __html: item }}
                          />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </FadeInWhenVisible>
            </div>
            ))}
          </div>

        <FadeInWhenVisible delay={0}>
          <Card className="mt-16 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30 shadow-lg">
            <CardContent className="p-8 md:p-10">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-primary/20 ring-4 ring-primary/10 flex-shrink-0">
                  <Shield className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-4" data-testid="text-important-note-title">
                    Važna Napomena
                  </h3>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-4">
                    Ova pravila su kreirana da zaštite i vas i nas, osiguravajući profesionalan i pošten odnos. 
                    Razumemo da svaki projekat ima svoje specifičnosti - za bilo kakva pitanja, dodatne dogovore 
                    ili posebne okolnosti, slobodno nas kontaktirajte.
                  </p>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    <strong className="text-foreground">Kontakt:</strong> Dostupni smo za razgovor i spremni da prilagodimo naše usluge vašim potrebama, 
                    uz poštovanje ovih osnovnih principa rada.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </FadeInWhenVisible>

        <FadeInWhenVisible delay={0}>
          <div className="mt-16 text-center">
            <Link href="/kontakt">
              <Button size="lg" className="text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300" data-testid="button-contact-terms">
                Imate Pitanja? Kontaktirajte Nas
              </Button>
            </Link>
          </div>
        </FadeInWhenVisible>
      </div>
    </div>
  );
}
