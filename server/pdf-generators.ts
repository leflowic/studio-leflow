import PDFDocument from "pdfkit";
import type { Readable } from "stream";
import path from "path";

export interface MixMasterContract {
  // Osnovno
  contractDate: string; // "DD/MM/YYYY"
  contractPlace: string;
  studioName: string;
  studioAddress: string;
  studioMaticniBroj: string;
  clientName: string;
  clientAddress: string;
  clientMaticniBroj: string;
  
  // Projekat
  projectName: string;
  channelCount: string;
  deliveryFormat: string;
  deliveryDate: string;
  
  // Finansije
  totalAmount: string;
  advancePayment: string;
  remainingPayment: string;
  paymentMethod: string;
  
  // Opciono
  vocalRecording: "yes" | "no";
  vocalRights: "client" | "studio" | "other";
  vocalRightsOther?: string;
  
  // Pravno
  jurisdiction: string;
  copies: string;
  finalDate: string;
}

export interface CopyrightTransferContract {
  // Osnovno
  contractDate: string;
  contractPlace: string;
  authorName: string;
  authorAddress: string;
  authorMaticniBroj: string;
  buyerName: string;
  buyerAddress: string;
  buyerMaticniBroj: string;
  
  // Delo
  songTitle: string;
  components: {
    text: boolean;
    music: boolean;
    vocals: boolean;
    mixMaster: boolean;
    other: boolean;
    otherText?: string;
  };
  
  // Prava
  rightsType: "exclusive" | "nonexclusive";
  rightsScope: {
    reproduction: boolean;
    distribution: boolean;
    performance: boolean;
    adaptation: boolean;
    other: boolean;
    otherText?: string;
  };
  territory: string;
  duration: string;
  
  // Finansije
  totalAmount: string;
  firstPayment: string;
  firstPaymentDate: string;
  secondPayment: string;
  secondPaymentDate: string;
  paymentMethod: string;
  
  // Streaming podela
  authorPercentage: string;
  buyerPercentage: string;
  
  // Pravno
  jurisdiction: string;
  copies: string;
  finalDate: string;
}

export interface InstrumentalSaleContract {
  // Osnovno
  contractDate: string;
  contractPlace: string;
  authorName: string;
  authorAddress: string;
  authorMaticniBroj: string;
  buyerName: string;
  buyerAddress: string;
  buyerMaticniBroj: string;
  
  // Instrumental
  instrumentalName: string;
  duration: string;
  
  // Prava
  rightsType: "exclusive" | "nonexclusive";
  rightsScope: {
    reproduction: boolean;
    distribution: boolean;
    performance: boolean;
    adaptation: boolean;
    other: boolean;
    otherText?: string;
  };
  territory: string;
  durationPeriod: string;
  
  // Finansije
  totalAmount: string;
  advancePayment: string;
  remainingPayment: string;
  paymentMethod: string;
  
  // Streaming podela
  authorPercentage: string;
  buyerPercentage: string;
  
  // Pravno
  jurisdiction: string;
  copies: string;
  finalDate: string;
}

/**
 * Helper function to draw Studio LeFlow logo at top-right of contract
 */
/**
 * Draw professional contract header with Studio LeFlow logo
 * Returns the Y position where body content should start
 */
function drawContractLogo(doc: PDFKit.PDFDocument): number {
  try {
    const logoPath = path.resolve(process.cwd(), 'attached_assets', 'logo', 'studioleflow-transparent.png');
    const logoWidth = 85; // Professional size for A4 header
    const headerHeight = 100; // Total header band height
    
    // Start from absolute page top (accounting for top margin)
    const headerTop = doc.page.margins.top;
    const pageWidth = doc.page.width;
    const leftMargin = doc.page.margins.left;
    const rightMargin = doc.page.margins.right;
    
    // Center logo horizontally
    const logoX = (pageWidth - logoWidth) / 2;
    
    // Draw logo centered in header
    doc.image(logoPath, logoX, headerTop + 10, {
      width: logoWidth,
      align: 'center'
    });
    
    // Studio info text below logo (centered)
    doc.fontSize(9)
      .font('DejaVuSans')
      .fillColor('#666666');
    
    const infoY = headerTop + 95; // Position below logo to avoid overlap
    doc.text('Studio LeFlow | Beograd, Srbija', leftMargin, infoY, {
      width: pageWidth - leftMargin - rightMargin,
      align: 'center'
    });
    
    // Draw horizontal separator line
    const lineY = headerTop + headerHeight - 10;
    doc.strokeColor('#cccccc')
      .lineWidth(1)
      .moveTo(leftMargin, lineY)
      .lineTo(pageWidth - rightMargin, lineY)
      .stroke();
    
    // Reset text color to black for body content
    doc.fillColor('#000000');
    
    // Return Y position where body content should start
    return headerTop + headerHeight + 10;
    
  } catch (error) {
    // Graceful fallback if logo is missing - return default starting position
    console.error('[PDF] Failed to load logo:', error);
    return doc.page.margins.top + 20;
  }
}

/**
 * Generate PDF buffer for Mix/Master contract
 */
export function generateMixMasterPDF(data: MixMasterContract): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });
    
    // Register DejaVu Sans font for Serbian characters support
    doc.registerFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
    doc.registerFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');
    
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Draw professional contract header with logo
    const bodyStartY = drawContractLogo(doc);
    doc.y = bodyStartY;

    // Contract title
    doc.fontSize(14).font('DejaVuSans-Bold').text('UGOVOR O PRUŽANJU USLUGA MIXINGA I MASTERINGA', { align: 'center' });
    doc.moveDown(2);

    // Contract metadata
    doc.fontSize(10).font('DejaVuSans')
      .text(`Zaključen dana ${data.contractDate} godine u ${data.contractPlace}, između sledećih ugovornih strana:`, { align: 'left' });
    doc.moveDown();

    // Pružalac usluge
    doc.fontSize(11).font('DejaVuSans-Bold').text('1. Pružalac usluge (Studio)');
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ime i prezime / poslovno ime: ${data.studioName}`);
    doc.text(`Adresa: ${data.studioAddress}`);
    doc.text(`Matični broj: ${data.studioMaticniBroj}`);
    doc.moveDown();

    // Naručilac
    doc.fontSize(11).font('DejaVuSans-Bold').text('2. Naručilac usluge');
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ime i prezime / poslovno ime: ${data.clientName}`);
    doc.text(`Adresa: ${data.clientAddress}`);
    doc.text(`Matični broj: ${data.clientMaticniBroj}`);
    doc.moveDown();

    doc.fontSize(10).text('(u daljem tekstu zajednički: "Ugovorne strane").');
    doc.moveDown(2);

    // Član 1
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 1. Predmet ugovora', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Predmet ovog ugovora je pružanje usluge profesionalnog miksanja i masteringa sledećeg muzičkog dela:');
    doc.moveDown(0.5);
    doc.text(`Naziv pesme / projekta: ${data.projectName}`);
    doc.text(`Broj kanala / stemova: ${data.channelCount}`);
    doc.moveDown(2);

    // Član 2
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 2. Obaveze Pružaoca usluge', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Pružalac usluge se obavezuje da:');
    doc.text('– izvrši tehničku obradu materijala (mix i mastering) prema profesionalnim standardima;');
    doc.text(`– isporuči finalne fajlove u formatu: ${data.deliveryFormat}`);
    doc.text(`– isporuku izvrši najkasnije do ${data.deliveryDate}.`);
    doc.moveDown(2);

    // Član 3
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 3. Obaveze Naručioca', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Naručilac se obavezuje da:');
    doc.text('– dostavi sve potrebne fajlove i informacije potrebne za rad na projektu;');
    doc.text('– blagovremeno odobri radne verzije ili dostavi primedbe;');
    doc.text('– isplati ugovorenu naknadu u predviđenom roku.');
    doc.moveDown(2);

    // Član 4
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 4. Naknada i uslovi plaćanja', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ukupna naknada za izvršenje usluge iznosi: ${data.totalAmount} RSD / EUR.`);
    doc.moveDown(0.5);
    doc.text('Raspored plaćanja:');
    doc.text(`– Avans (pre početka rada): ${data.advancePayment} RSD / EUR`);
    doc.text(`– Ostatak (po završetku usluge, pre isporuke finalnih fajlova): ${data.remainingPayment} RSD / EUR`);
    doc.text(`Način plaćanja: ${data.paymentMethod}`);
    doc.moveDown();
    doc.text('U slučaju neplaćanja u predviđenom roku, Pružalac usluge zadržava pravo da raskine ovaj ugovor i da snimke ponudi trećim licima ili koristi u druge svrhe, bez prava Naručioca na naknadu štete.');
    doc.moveDown(2);

    // Član 5
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 5. Odgovornost i reklamacije', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Pružalac usluge garantuje kvalitet obrade prema profesionalnim standardima.');
    doc.text('Naručilac ima pravo na do dve runde revizija finalne verzije.');
    doc.text('Naknadne izmene i dodatne revizije se naplaćuju po dogovoru.');
    doc.text('Reklamacije se prihvataju isključivo u roku od 7 dana od dana isporuke finalnih fajlova.');
    doc.moveDown(2);

    // Član 6
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 6. Autorska prava', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Ovim ugovorom Pružalac usluge ne stiče nikakva autorska prava na muzičko delo koje je predmet obrade.');
    doc.text('Sva autorska prava na pesmu i originalne snimke ostaju u vlasništvu Naručioca.');
    doc.moveDown(2);

    // Član 7 - Snimanje vokala
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 7. Snimanje vokala i prava na snimke', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Snimanje vokala je izvršeno u studiju LeFlow Studio: ${data.vocalRecording === 'yes' ? 'DA' : 'NE'}`);
    doc.moveDown(0.5);
    
    if (data.vocalRecording === 'yes') {
      doc.text('Ugovorne strane se slažu da:');
      if (data.vocalRights === 'client') {
        doc.text('☑ Sva prava na vokalne snimke i izvedbu prenose se isključivo na Naručioca.');
      } else if (data.vocalRights === 'studio') {
        doc.text('☑ Pružalac usluge zadržava pravo da koristi snimke isključivo u promotivne svrhe studija (portfolio, sajt, društvene mreže), uz obavezu navođenja imena izvođača.');
      } else {
        doc.text(`☑ Drugo: ${data.vocalRightsOther || ''}`);
      }
    }
    doc.moveDown(2);

    // Član 8
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 8. Nadležnost', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Za rešavanje eventualnih sporova nadležan je sud u: ${data.jurisdiction}`);
    doc.moveDown(2);

    // Član 9
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 9. Završne odredbe', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ovaj ugovor je sačinjen u ${data.copies} istovetnih primeraka, od kojih svaka ugovorna strana zadržava po jedan.`);
    doc.moveDown();
    doc.text('Potpisivanjem ugovora, strane potvrđuju da su saglasne sa svim odredbama i da ga zaključuju slobodnom voljom.');
    doc.moveDown(3);

    // Signatures
    doc.fontSize(10).font('DejaVuSans');
    doc.text('____________________________', 100, doc.y, { continued: true, width: 200 });
    doc.text('____________________________', 320, doc.y - doc.currentLineHeight(), { width: 200 });
    doc.moveDown(2);
    doc.text(`Datum: ${data.finalDate}`, { align: 'center' });

    doc.end();
  });
}

/**
 * Generate PDF buffer for Copyright Transfer contract
 */
export function generateCopyrightTransferPDF(data: CopyrightTransferContract): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });
    
    // Register DejaVu Sans font for Serbian characters support
    doc.registerFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
    doc.registerFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');
    
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Draw professional contract header with logo
    const bodyStartY = drawContractLogo(doc);
    doc.y = bodyStartY;

    // Contract title
    doc.fontSize(14).font('DejaVuSans-Bold').text('UGOVOR O PRENOSU IMOVINSKIH AUTORSKIH PRAVA', { align: 'center' });
    doc.moveDown(2);

    // Contract metadata
    doc.fontSize(10).font('DejaVuSans')
      .text(`Zaključen dana ${data.contractDate} godine u ${data.contractPlace}, između sledećih ugovornih strana:`, { align: 'left' });
    doc.moveDown(2);

    // Autor/Prodavac
    doc.fontSize(12).font('DejaVuSans-Bold').text('1. Autor/Prodavac', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ime i prezime / poslovno ime: ${data.authorName}`);
    doc.text(`Adresa: ${data.authorAddress}`);
    doc.text(`Matični broj: ${data.authorMaticniBroj}`);
    doc.moveDown(2);

    // Kupac
    doc.fontSize(12).font('DejaVuSans-Bold').text('2. Kupac', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ime i prezime / poslovno ime: ${data.buyerName}`);
    doc.text(`Adresa: ${data.buyerAddress}`);
    doc.text(`Matični broj: ${data.buyerMaticniBroj}`);
    doc.moveDown();

    doc.fontSize(10).text('(u daljem tekstu zajednički: "Ugovorne strane").');
    doc.moveDown(3);

    // Član 1
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 1. Predmet ugovora', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Predmet ovog ugovora je prenos imovinskih autorskih prava na sledećem autorskom delu:');
    doc.moveDown(0.5);
    doc.text(`Naziv pesme: ${data.songTitle}`);
    doc.moveDown();
    doc.text('Delo obuhvata sledeće komponente:');
    if (data.components.text) doc.text('☑ Tekst');
    if (data.components.music) doc.text('☑ Muziku (instrumental)');
    if (data.components.vocals) doc.text('☑ Snimanje vokala');
    if (data.components.mixMaster) doc.text('☑ Miks i mastering');
    if (data.components.other) doc.text(`☑ Ostalo: ${data.components.otherText || ''}`);
    doc.moveDown(2);

    // Član 2
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 2. Vrsta prenosa prava', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Autor prenosi sledeća imovinska autorska prava:');
    doc.text(data.rightsType === 'exclusive' ? '☑ Isključiva prava' : '☑ Neisključiva prava');
    doc.moveDown();
    doc.text('Obuhvat prenosa prava:');
    if (data.rightsScope.reproduction) doc.text('☑ Reprodukovanje i umnožavanje dela');
    if (data.rightsScope.distribution) doc.text('☑ Distribucija i digitalna prodaja');
    if (data.rightsScope.performance) doc.text('☑ Javno izvođenje i emitovanje');
    if (data.rightsScope.adaptation) doc.text('☑ Prerada i adaptacija');
    if (data.rightsScope.other) doc.text(`☑ Ostalo: ${data.rightsScope.otherText || ''}`);
    doc.moveDown(2);

    // Član 3
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 3. Teritorija korišćenja', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Prenos prava se odnosi na teritoriju: ${data.territory}`);
    doc.moveDown(2);

    // Član 4
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 4. Trajanje prenosa prava', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Prenos prava se zaključuje na period: ${data.duration}`);
    doc.moveDown(2);

    // Član 5
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 5. Naknada i uslovi plaćanja', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Kupac se obavezuje da Autor/Prodavcu isplati ukupan iznos naknade u visini od: ${data.totalAmount} RSD / EUR`);
    doc.moveDown();
    doc.text('Raspored plaćanja:');
    doc.text(`– I rata u iznosu od ${data.firstPayment} RSD/EUR, do ${data.firstPaymentDate}`);
    doc.text(`– II rata u iznosu od ${data.secondPayment} RSD/EUR, do ${data.secondPaymentDate}`);
    doc.text('(U slučaju neplaćanja u predviđenom roku, Autor zadržava pravo da delo ponudi i proda trećim licima.)');
    doc.moveDown();
    doc.text(`Način plaćanja: ${data.paymentMethod}`);
    doc.moveDown(2);

    // Član 6
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 6. Podela prihoda od korišćenja dela (Streaming servis)', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Ugovorne strane su saglasne da se prihod ostvaren od eksploatacije dela deli na sledeći način:');
    doc.text(`– Procenat prihoda koji pripada Autor/Prodavcu: ${data.authorPercentage}%`);
    doc.text(`– Procenat prihoda koji pripada Kupcu: ${data.buyerPercentage}%`);
    doc.moveDown(2);

    // Član 7
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 7. Moralna prava', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Autor zadržava moralna prava na delu, uključujući:');
    doc.text('– Pravo da bude priznat i označen kao autor dela;');
    doc.text('– Pravo da delo ne bude menjano, obrađivano ili prilagođavano bez njegove prethodne pisane saglasnosti.');
    doc.moveDown(2);

    // Član 8
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 8. Nadležnost', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Za tumačenje i sprovođenje ovog ugovora nadležan je sud u: ${data.jurisdiction}`);
    doc.moveDown(2);

    // Član 9
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 9. Završne odredbe', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ovaj ugovor je sačinjen u ${data.copies} istovetnih primeraka, od kojih svaka ugovorna strana zadržava po jedan.`);
    doc.text('Potpisivanjem ugovora strane potvrđuju da su saglasne sa svim odredbama i da ga zaključuju slobodnom voljom.');
    doc.moveDown(3);

    // Signatures
    doc.fontSize(10).font('DejaVuSans');
    doc.text('____________________________', { align: 'left' });
    doc.text('Autor/Prodavac', { align: 'left' });
    doc.moveDown(2);
    doc.text('____________________________', { align: 'left' });
    doc.text('Kupac', { align: 'left' });
    doc.moveDown(2);
    doc.text(`Datum: ${data.finalDate}`, { align: 'center' });

    doc.end();
  });
}

/**
 * Generate PDF buffer for Instrumental Sale contract
 */
export function generateInstrumentalSalePDF(data: InstrumentalSaleContract): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });
    
    // Register DejaVu Sans font for Serbian characters support
    doc.registerFont('DejaVuSans', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf');
    doc.registerFont('DejaVuSans-Bold', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf');
    
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Draw professional contract header with logo
    const bodyStartY = drawContractLogo(doc);
    doc.y = bodyStartY;

    // License title
    doc.fontSize(14).font('DejaVuSans-Bold').text('LICENCA ZA KORIŠĆENJE INSTRUMENTALA', { align: 'center' });
    doc.moveDown(2);

    // License metadata
    doc.fontSize(10).font('DejaVuSans')
      .text(`Izdata dana ${data.contractDate} godine u ${data.contractPlace}`, { align: 'left' });
    doc.moveDown(2);

    // Autor/Prodavac (Studio)
    doc.fontSize(11).font('DejaVuSans-Bold').text('Izdavač licence (Studio)');
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ime i prezime / poslovno ime: ${data.authorName}`);
    doc.text(`Adresa: ${data.authorAddress}`);
    doc.moveDown(2);

    // Korisnik licence (Kupac)
    doc.fontSize(11).font('DejaVuSans-Bold').text('Korisnik licence');
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ime i prezime / poslovno ime: ${data.buyerName}`);
    doc.text(`Adresa: ${data.buyerAddress}`);
    doc.text(`Matični broj: ${data.buyerMaticniBroj}`);
    doc.moveDown(2);

    // Član 1
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 1. Predmet licence', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Predmet ove licence je korišćenje sledećeg muzičkog instrumentala:');
    doc.moveDown(0.5);
    doc.text(`Naziv instrumentala: ${data.instrumentalName}`);
    doc.text(`Trajanje: ${data.duration}`);
    doc.moveDown(2);

    // Član 2
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 2. Vrsta licence', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Korisniku se izdaje sledeća vrsta licence:');
    doc.moveDown();
    doc.text(data.rightsType === 'exclusive' ? '☑ Isključiva licenca' : '☑ Neisključiva licenca');
    doc.moveDown();
    doc.text('Opseg dozvoljenog korišćenja:');
    if (data.rightsScope.reproduction) doc.text('☑ Reprodukovanje i umnožavanje');
    if (data.rightsScope.distribution) doc.text('☑ Distribucija i digitalna prodaja');
    if (data.rightsScope.performance) doc.text('☑ Javno izvođenje i emitovanje');
    if (data.rightsScope.adaptation) doc.text('☑ Prerada i adaptacija');
    if (data.rightsScope.other) doc.text(`☑ Ostalo: ${data.rightsScope.otherText || ''}`);
    doc.moveDown(2);

    // Član 3
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 3. Teritorija korišćenja', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Licenca se odnosi na teritoriju: ${data.territory}`);
    doc.moveDown(2);

    // Član 4
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 4. Trajanje licence', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Licenca se izdaje na period: ${data.durationPeriod}`);
    doc.moveDown(2);

    // Član 5
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 5. Naknada za licencu', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ukupna naknada za licencu iznosi: ${data.totalAmount} RSD / EUR.`);
    doc.moveDown();
    doc.text('Raspored plaćanja:');
    doc.text(`– Avans: ${data.advancePayment} RSD / EUR`);
    doc.text(`– Ostatak: ${data.remainingPayment} RSD / EUR`);
    doc.moveDown();
    doc.text(`Način plaćanja: ${data.paymentMethod}`);
    doc.moveDown();
    doc.text('U slučaju neplaćanja u predviđenom roku, licenca postaje nevažeća.');
    doc.moveDown(2);

    // Član 6
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 6. Podela prihoda od korišćenja', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Prihod od korišćenja instrumentala deli se na sledeći način:');
    doc.text(`– Procenat prihoda koji pripada Izdavaču: ${data.authorPercentage}%`);
    doc.text(`– Procenat prihoda koji pripada Korisniku: ${data.buyerPercentage}%`);
    doc.moveDown(2);

    // Član 7
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 7. Autorska prava', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Izdavač zadržava sva autorska i moralna prava na instrumentalu, uključujući:');
    doc.text('– Pravo da bude priznat i označen kao autor instrumentala.');
    doc.text('– Pravo da instrumental ne bude menjan bez prethodne pisane saglasnosti.');
    doc.moveDown(2);

    // Član 8
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 8. Nadležnost', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Za rešavanje eventualnih sporova nadležan je sud u: ${data.jurisdiction}`);
    doc.moveDown(2);

    // Član 9
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 9. Važnost licence', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ova licenca je izdata u ${data.copies} primerka i stupa na snagu danom plaćanja naknade.`);
    doc.moveDown();
    doc.text('Korišćenjem instrumentala, Korisnik potvrđuje da prihvata sve uslove navedene u ovoj licenci.');
    doc.moveDown(3);

    // Signatures
    doc.fontSize(10).font('DejaVuSans');
    doc.text('____________________________', 100, doc.y, { continued: true, width: 200 });
    doc.text('____________________________', 320, doc.y - doc.currentLineHeight(), { width: 200 });
    doc.moveDown(2);
    doc.text(`Datum izdavanja: ${data.finalDate}`, { align: 'center' });

    doc.end();
  });
}
