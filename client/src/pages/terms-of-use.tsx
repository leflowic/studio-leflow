import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, AlertTriangle, FileText, Scale, Megaphone } from "lucide-react";

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-4xl mx-auto px-4 md:px-6">
        <Link href="/giveaway" data-testid="link-back-giveaway">
          <Button variant="ghost" className="mb-8" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Nazad na Giveaway
          </Button>
        </Link>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3" data-testid="heading-terms">
            Uslovi Korišćenja - Studio LeFlow Giveaway
          </h1>
          <p className="text-muted-foreground text-lg" data-testid="text-subtitle">
            Molimo vas da pažljivo pročitate sledeće uslove pre učešća u mesečnom konkursu
          </p>
        </div>

        <div className="space-y-6">
          {/* Prihvatanje Uslova */}
          <Card data-testid="card-acceptance">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                1. Prihvatanje Uslova
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                Pristupanjem i korišćenjem Studio LeFlow Giveaway platforme (u daljem tekstu "Platforma"), 
                potvrđujete da ste pročitali, razumeli i prihvatili sve uslove korišćenja navedene u ovom 
                dokumentu.
              </p>
              <p>
                Učešće u mesečnom konkursu podrazumeva potpuno i bezuslovno prihvatanje svih pravila i 
                obaveza navedenih u ovim Uslovima korišćenja.
              </p>
              <p className="font-medium text-foreground">
                Ako ne prihvatate ove uslove, molimo vas da ne učestvujete u konkursu niti koristite Platformu.
              </p>
            </CardContent>
          </Card>

          {/* Pravila Učešća */}
          <Card data-testid="card-participation">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                2. Pravila Učešća u Konkursu
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">2.1 Upload Projekata</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Svaki registrovani korisnik može uploadovati <strong>maksimalno jedan (1) projekat mesečno</strong></li>
                  <li>Projekti moraju biti u MP3 formatu, maksimalne veličine <strong>100MB</strong></li>
                  <li>Učesnik garantuje da je <strong>vlasnik svih autorskih prava</strong> na uploadovani projekat</li>
                  <li>Zabranjeno je uploadovanje sadržaja koji krši autorska prava trećih lica</li>
                  <li>Zabranjeno je uploadovanje sadržaja koji sadrži uvredljiv, diskriminatorni ili nezakonit materijal</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">2.2 Glasanje</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Svaki korisnik može glasati za <strong>više različitih projekata</strong></li>
                  <li>Zabranjeno je glasati više puta za isti projekat</li>
                  <li>Sistem automatski prati IP adrese kako bi sprečio zloupotrebe</li>
                  <li>Pokušaji manipulacije glasovima (korišćenje više naloga, VPN, proxy servisi) rezultovaće <strong>trajnim banom</strong></li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">2.3 Komentarisanje</h3>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Komentari moraju biti konstruktivni i poštovati druge učesnike</li>
                  <li>Zabranjeni su uvredljivi, diskriminatorni ili neprimereni komentari</li>
                  <li>Studio LeFlow zadržava pravo brisanja neprimerenih komentara bez prethodne najave</li>
                  <li>Korisnici koji ponavljaju kršenje pravila ponašanja mogu biti trajno banovani</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* KRITIČNO: Zabrana Downloadovanja */}
          <Card data-testid="card-download-prohibition" className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-destructive">
                <AlertTriangle className="w-5 h-5" />
                3. ZABRANA DOWNLOADOVANJA I DELJENJA SADRŽAJA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-destructive/10 p-4 rounded-lg border border-destructive/30">
                <p className="font-bold text-destructive mb-3 text-lg flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  STROGO ZABRANJENO
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground ml-4">
                  <li><strong>Downloadovanje</strong> bilo kog projekta uploadovanog na Platformu</li>
                  <li><strong>Snimanje, kopiranje ili čuvanje</strong> audio fajlova sa Platforme</li>
                  <li><strong>Deljenje projekata</strong> izvan Studio LeFlow Giveaway platforme (social media, streaming servisi, file sharing platforme)</li>
                  <li><strong>Komercijalna upotreba</strong> bilo kog sadržaja sa Platforme bez eksplicitne dozvole autora</li>
                  <li><strong>Re-upload</strong> tuđih projekata kao sopstvenih</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">3.1 Tehnička Zaštita</h3>
                <p className="text-muted-foreground">
                  Audio playerima je <strong>onemogućena download opcija</strong> putem HTML5 atributa. 
                  Međutim, svesni smo da tehnička zaštita nije apsolutna i da korisnici sa tehničkim znanjem 
                  mogu pronaći načine da preuzmu fajlove.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">3.2 Pravno Odricanje</h3>
                <p className="text-muted-foreground mb-3">
                  <strong>KORISTEĆI OVU PLATFORMU, POTVRĐUJETE DA NEĆETE:</strong>
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Pokušavati da zaobiđete tehničke mere zaštite</li>
                  <li>Koristiti alate ili skripte za automatsko preuzimanje sadržaja</li>
                  <li>Snimati audio preko screen/audio recording softvera</li>
                  <li>Deliti linkove ka audio fajlovima van Platforme</li>
                </ul>
              </div>

              <div className="bg-amber-500/10 p-4 rounded-lg border border-amber-500/30 mt-4">
                <p className="font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                  <Megaphone className="w-5 h-5" />
                  Socijalna Odgovornost
                </p>
                <p className="text-muted-foreground">
                  Svi učesnici su vidljivi sa svojim korisničkim imenima. Poštovanje autorskih prava 
                  i pravila zajednice je pitanje <strong>lične etike i odgovornosti</strong>. 
                  Studio LeFlow zajednica se zasniva na poverenju i međusobnom poštovanju umetnika.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Autorska Prava */}
          <Card data-testid="card-copyright">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Scale className="w-5 h-5 text-primary" />
                4. Autorska Prava i Intelektualna Svojina
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">4.1 Vlasništvo Nad Projektima</h3>
                <p className="text-muted-foreground">
                  Uploadovanjem projekta na Platformu, učesnik zadržava <strong>sva autorska prava</strong> 
                  na svoj rad. Studio LeFlow NE preuzima vlasništvo nad projektima niti stiče ekskluzivna 
                  prava na distribuciju.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">4.2 Licenca za Platformu</h3>
                <p className="text-muted-foreground mb-3">
                  Uploadovanjem projekta, učesnik daje Studio LeFlow-u <strong>neekskluzivnu, ograničenu licencu</strong> za:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Hosting i prikazivanje projekta na Platformi tokom trajanja konkursa</li>
                  <li>Streaming audio sadržaja registrovanim korisnicima</li>
                  <li>Promociju pobedničkog projekta na zvaničnim Studio LeFlow kanalima (Instagram, website)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">4.3 Automatsko Brisanje</h3>
                <p className="text-muted-foreground">
                  Svi uploadovani projekti se čuvaju na Ufile.io servisu koji <strong>automatski briše 
                  fajlove nakon 30 dana</strong>. Učesnici su odgovorni za čuvanje originalnih kopija 
                  svojih projekata.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">4.4 Prijava Kršenja Autorskih Prava</h3>
                <p className="text-muted-foreground">
                  Ako smatrate da vaša autorska prava bivaju povređena sadržajem na Platformi, 
                  kontaktirajte nas na: <strong>info@studioleflow.com</strong>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Nagrade i Pobednici */}
          <Card data-testid="card-prizes">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                5. Nagrade i Pobednici
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">5.1 Nagrada</h3>
                <p className="text-muted-foreground mb-3">
                  Pobednik mesečnog konkursa osvaja <strong>BESPLATNU produkciju</strong> svog projekta 
                  u Studio LeFlow-u, koja uključuje:
                </p>
                <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                  <li>Profesionalni recording vokal(a)</li>
                  <li>Mixing & Mastering finalnog projekta</li>
                  <li>Konsultacije sa producentima i inženjerima</li>
                </ul>
                <p className="text-muted-foreground mt-3">
                  Vrednost nagrade: <strong>~15.000 - 25.000 RSD</strong> (u zavisnosti od kompleksnosti projekta)
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">5.2 Određivanje Pobednika</h3>
                <p className="text-muted-foreground">
                  Pobednik se određuje na osnovu <strong>najvećeg broja glasova</strong> do kraja mesečnog konkursa. 
                  U slučaju izjednačenog broja glasova, pobednik će biti određen na osnovu datuma uploada 
                  (raniji upload ima prednost).
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">5.3 Zakazivanje Produkcije</h3>
                <p className="text-muted-foreground">
                  Pobednik mora zakazati termin produkcije <strong>u roku od 60 dana</strong> od objave rezultata. 
                  Nakon isteka roka, nagrada se poništava bez mogućnosti obnove.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">5.4 Prenošenje Nagrade</h3>
                <p className="text-muted-foreground">
                  Nagrada se <strong>ne može preneti na drugu osobu</strong> niti zameniti za novčani ekvivalent.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Odgovornost i Garancije */}
          <Card data-testid="card-liability">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-primary" />
                6. Odgovornost i Odricanje Garancija
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">6.1 Platforma "Takva Kakva Jeste"</h3>
                <p className="text-muted-foreground">
                  Platforma se pruža <strong>"as is"</strong> bez garancija bilo koje vrste. Studio LeFlow 
                  ne garantuje neprekinut ili bezgreshan rad Platforme.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">6.2 Gubitak Podataka</h3>
                <p className="text-muted-foreground">
                  Studio LeFlow <strong>nije odgovoran</strong> za gubitak uploadovanih projekata usled 
                  tehničkih problema, brisanja naloga, ili automatskog brisanja nakon 30 dana.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">6.3 Ponašanje Korisnika</h3>
                <p className="text-muted-foreground">
                  Studio LeFlow <strong>nije odgovoran</strong> za ponašanje korisnika, sadržaj komentara, 
                  ili eventualne sporove između učesnika.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-foreground mb-2">6.4 Kršenje Pravila</h3>
                <p className="text-muted-foreground">
                  Studio LeFlow zadržava pravo da <strong>diskvalifikuje učesnike</strong> koji krše ove Uslove 
                  korišćenja, bez prethodne najave ili objašnjenja.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Izmene Uslova */}
          <Card data-testid="card-changes">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-primary" />
                7. Izmene Uslova Korišćenja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                Studio LeFlow zadržava pravo da <strong>izmeni ili dopuni</strong> ove Uslove korišćenja 
                u bilo kom trenutku. Izmene stupaju na snagu odmah nakon objavljivanja na Platformi.
              </p>
              <p>
                Nastavak korišćenja Platforme nakon izmena podrazumeva prihvatanje novih uslova.
              </p>
              <p className="font-medium text-foreground">
                Datum poslednje izmene: <strong>Novembar 2025</strong>
              </p>
            </CardContent>
          </Card>

          {/* Privatnost Poruka */}
          <Card data-testid="card-messaging-privacy">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                8. Privatnost i Bezbednost Poruka
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                Studio LeFlow platforma omogućava korisnicima razmenu privatnih poruka u svrhu komunikacije 
                o projektima, saradnji i pitanjima vezanim za produkciju.
              </p>
              <p>
                <strong className="text-foreground">Administrator platforme ima pristup privatnim porukama u svrhu:</strong>
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Bezbednosti platforme i zaštite korisnika od zloupotrebe</li>
                <li>Moderacije sadržaja i sprečavanja uvredljivog ili neprimerenog ponašanja</li>
                <li>Tehničke podrške i rešavanja sporova između korisnika</li>
                <li>Inspekcije u slučaju prijava kršenja pravila ili nezakonitog sadržaja</li>
              </ul>
              <p className="font-medium text-foreground mt-3">
                Korišćenjem sistema za razmenu poruka, korisnik potvrđuje da je svestan da administrator 
                može pristupiti sadržaju poruka u napred navedene svrhe.
              </p>
            </CardContent>
          </Card>

          {/* Kontakt */}
          <Card data-testid="card-contact">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                9. Kontakt Informacije
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                Za pitanja u vezi sa Uslovima korišćenja, prijavama kršenja pravila, ili tehničkim problemima, 
                kontaktirajte nas:
              </p>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="font-semibold text-foreground mb-2">Studio LeFlow</p>
                <p>Email: <strong>info@studioleflow.com</strong></p>
                <p>Telefon: <strong>+381 63 734 7023</strong></p>
                <p>Instagram: <strong>@studioleflow</strong></p>
                <p>Lokacija: Beograd, Srbija</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer Actions */}
        <div className="mt-12 text-center">
          <Link href="/giveaway" data-testid="link-back-footer">
            <Button size="lg" data-testid="button-back-footer">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Nazad na Giveaway
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
