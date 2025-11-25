import { Link } from "wouter";
import { AlertCircle, CheckCircle2, Clock, CreditCard, FileText, Shield, ArrowLeft, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FadeInWhenVisible } from "@/components/motion/FadeIn";

export default function Terms() {
  const termsSection = [
    {
      icon: CreditCard,
      title: "Politika Avansa",
      content: [
        "Za sve usluge Studio LeFlow zahteva se obavezan avans u iznosu od 30% ukupne cene projekta.",
        "Avans se plaća pri rezervaciji termina i potvrđivanju dogovora o projektu.",
        "Avans je nepovratan u svim slučajevima, osim u situacijama kada Studio LeFlow ne može ispuniti dogovorene usluge iz objektivnih razloga."
      ]
    },
    {
      icon: AlertCircle,
      title: "Razlozi Nepovrativosti Avansa",
      content: [
        "<strong>Rezervacija studio vremena:</strong> Vaš termin se rezerviše ekskluzivno za vas, što znači da studio odbija druge klijente u tom periodu. Otkazivanje termina u kratkom roku rezultira gubicima koje studio ne može nadoknaditi.",
        "<strong>Tehnička i kreativna priprema:</strong> Pre svakog termina, naš tim priprema opremu, podešava akustiku prostora i planira kreativni pristup na osnovu vaših potreba. Ova priprema zahteva vreme i stručnost.",
        "<strong>Angažovanje kreativnog tima:</strong> Za vaš projekat angažujemo profesionalce (producente, mix inženjere, video operatere) koji se pripremaju i rezervišu vreme specifično za vaš projekat.",
        "<strong>Organizacioni troškovi:</strong> Koordinacija rasporeda, komunikacija sa klijentom, priprema materijala i administracija projekta predstavljaju značajan uloženi trud pre same realizacije."
      ]
    },
    {
      icon: Clock,
      title: "Otkazivanje i Izmene Termina",
      content: [
        "Izmene termina moguće su uz obavezu da nas obavestite <strong>najmanje 48 sati unapred</strong>.",
        "Promena termina uz poštovanje ovog roka ne utiče na avans - jednostavno prenosimo rezervaciju.",
        "Otkazivanje ili pomeranje termina sa manje od 48 sati najave rezultira gubitkom avansa.",
        "Nepojavljivan je na zakazanom terminu bez prethodne najave smatra se otkazivanjem i avans se ne vraća.",
        "Studio LeFlow zadržava pravo da ponudi alternativni termin u slučaju tehničkih problema ili više sile."
      ]
    },
    {
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
      icon: Shield,
      title: "Revizije i Garancija Kvaliteta",
      content: [
        "<strong>Snimanje i Mix/Master:</strong> Uključeno je do <strong>3 besplatne revizije</strong> finalne verzije. Dodatne revizije se naplaćuju po cenovniku.",
        "<strong>Instrumentali:</strong> Uključena je <strong>1 revizija</strong> beat-a (izmene u aranžmanu, zvucima). Potpuno novi beat se smatra novim projektom.",
        "<strong>Video produkcija:</strong> Uključene su <strong>2 revizije</strong> montaže (izmene u editingu, boji, efektima). Potpuno nova snimanja naplaćuju se posebno.",
        "Garancija kvaliteta: Ako niste zadovoljni finalnim produktom zbog tehničkih grešaka sa naše strane, radićemo bez dodatne naplate dok ne budete zadovoljni.",
        "Revizije moraju biti konkretne i jasno definisane. Redefinisanje celokupnog kreativnog pravca smatra se novim projektom."
      ]
    }
  ];

  return (
    <div className="min-h-screen py-12 lg:py-20">
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

        <div className="space-y-8">
          {termsSection.map((section, index) => (
            <FadeInWhenVisible key={index} delay={index * 0.05}>
                <Card data-testid={`card-terms-${index}`} className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <CardTitle className="flex items-center gap-4 text-2xl">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 ring-2 ring-primary/20">
                        <section.icon className="w-6 h-6 text-primary" />
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
          <Card className="mt-8 border-muted-foreground/20">
            <CardContent className="p-8 md:p-10">
              <div className="flex flex-col md:flex-row items-start gap-6">
                <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-muted ring-4 ring-muted/10 flex-shrink-0">
                  <MessageSquare className="w-7 h-7 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-2xl font-bold mb-4" data-testid="text-messaging-privacy">
                    Privatnost Poruka
                  </h3>
                  <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
                    Administrator može da reguliše poruke na platformi radi bezbednosti, moderacije i poštovanja pravila. 
                    Ova mera osigurava profesionalno i sigurno okruženje za sve korisnike, sprečava zloupotrebe sistema 
                    i omogućava adekvatnu podršku u slučaju sporova ili tehničkih problema.
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
