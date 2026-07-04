import PDFDocument from "pdfkit";
import type { Readable } from "stream";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function fontPath(name: string): string {
  // Bundled fonts (always available)
  const bundled = path.resolve(__dirname, '..', 'attached_assets', 'fonts', name);
  return bundled;
}

export interface MixMasterContract {
  // Osnovno
  contractDate: string; // "DD/MM/YYYY"
  contractPlace: string;
  studioName: string;
  studioAddress: string;
  studioMaticniBroj?: string;
  clientName: string;
  clientAddress: string;
  clientMaticniBroj: string;
  
  // Projekat
  projectName: string;
  channelCount: string;
  deliveryFormat: string;
  deliveryDate: string;

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

  // Streaming podela
  authorPercentage: string;
  buyerPercentage: string;

  // Pravno
  jurisdiction: string;
  copies: string;
  finalDate: string;
}

function drawLicenseFooter(doc: PDFKit.PDFDocument, licenseNumber: string, verificationHash: string): void {
  const pageWidth = doc.page.width;
  const leftMargin = doc.page.margins.left;
  const rightMargin = doc.page.margins.right;
  const contentWidth = pageWidth - leftMargin - rightMargin;

  doc.moveDown(2);
  doc.strokeColor('#aaaaaa').lineWidth(0.5)
    .moveTo(leftMargin, doc.y)
    .lineTo(pageWidth - rightMargin, doc.y)
    .stroke();
  doc.moveDown(0.5);

  doc.fontSize(8).font('DejaVuSans-Bold').fillColor('#222222');
  doc.text('DIGITALNA LICENCA - Studio LeFlow', leftMargin, doc.y, { width: contentWidth, align: 'center' });
  doc.moveDown(0.4);
  doc.fontSize(8).font('DejaVuSans').fillColor('#444444');
  doc.text(`Broj licence: ${licenseNumber}`, { width: contentWidth, align: 'center' });
  doc.moveDown(0.3);
  doc.text(`Proverite autentičnost ove licence na:`, { width: contentWidth, align: 'center' });
  doc.text(`studioleflow.com/proveri/${verificationHash}`, { width: contentWidth, align: 'center' });
  doc.fillColor('#000000');
}

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
export function generateMixMasterPDF(data: MixMasterContract, licenseNumber: string, verificationHash: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });
    
    // Register DejaVu Sans font for Serbian characters support
    doc.registerFont('DejaVuSans', fontPath('DejaVuSans.ttf'));
    doc.registerFont('DejaVuSans-Bold', fontPath('DejaVuSans-Bold.ttf'));
    
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Draw professional contract header with logo
    const bodyStartY = drawContractLogo(doc);
    doc.y = bodyStartY;

    // License title
    doc.fontSize(14).font('DejaVuSans-Bold').text('LICENCA ZA USLUGE MIXINGA I MASTERINGA', { align: 'center' });
    doc.moveDown(2);

    // License metadata
    doc.fontSize(10).font('DejaVuSans')
      .text(`Izdata dana ${data.contractDate} godine u ${data.contractPlace}, između sledećih strana:`, { align: 'left' });
    doc.moveDown();

    // Pružalac usluge
    doc.fontSize(11).font('DejaVuSans-Bold').text('1. Pružalac usluge (Studio)');
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ime i prezime / poslovno ime: ${data.studioName}`);
    doc.text(`Adresa: ${data.studioAddress}`);
    doc.moveDown();

    // Naručilac
    doc.fontSize(11).font('DejaVuSans-Bold').text('2. Naručilac usluge');
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ime i prezime / poslovno ime: ${data.clientName}`);
    doc.text(`Adresa: ${data.clientAddress}`);
    doc.text(`Matični broj: ${data.clientMaticniBroj}`);
    doc.moveDown();

    doc.fontSize(10).text('(u daljem tekstu zajednički: "Strane").');
    doc.moveDown(2);

    // Član 1
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 1. Predmet licence', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Predmet ove licence je pružanje usluge profesionalnog miksanja i masteringa sledećeg muzičkog dela:');
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
    doc.text('– blagovremeno odobri radne verzije ili dostavi primedbe.');
    doc.moveDown(2);

    // Član 4
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 4. Odgovornost i reklamacije', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Pružalac usluge garantuje kvalitet obrade prema profesionalnim standardima.');
    doc.text('Naručilac ima pravo na do dve runde revizija finalne verzije.');
    doc.text('Naknadne izmene i dodatne revizije se naplaćuju po dogovoru.');
    doc.text('Reklamacije se prihvataju isključivo u roku od 7 dana od dana isporuke finalnih fajlova.');
    doc.moveDown(2);

    // Član 5
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 5. Autorska prava', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Ovom licencom Pružalac usluge ne stiče nikakva autorska prava na muzičko delo koje je predmet obrade.');
    doc.text('Sva autorska prava na pesmu i originalne snimke ostaju u vlasništvu Naručioca.');
    doc.moveDown(2);

    // Član 6 - Snimanje vokala
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 6. Snimanje vokala i prava na snimke', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Snimanje vokala je izvršeno u studiju LeFlow Studio: ${data.vocalRecording === 'yes' ? 'DA' : 'NE'}`);
    doc.moveDown(0.5);

    if (data.vocalRecording === 'yes') {
      doc.text('Strane se slažu da:');
      if (data.vocalRights === 'client') {
        doc.text('☑ Sva prava na vokalne snimke i izvedbu prenose se isključivo na Naručioca.');
      } else if (data.vocalRights === 'studio') {
        doc.text('☑ Pružalac usluge zadržava pravo da koristi snimke isključivo u promotivne svrhe studija (portfolio, sajt, društvene mreže), uz obavezu navođenja imena izvođača.');
      } else {
        doc.text(`☑ Drugo: ${data.vocalRightsOther || ''}`);
      }
    }
    doc.moveDown(2);

    // Član 7
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 7. Nadležnost', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Za rešavanje eventualnih sporova nadležan je sud u: ${data.jurisdiction}`);
    doc.moveDown(2);

    // Član 8
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 8. Završne odredbe', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ova licenca je izdata dana ${data.finalDate} i stupa na snagu danom njenog izdavanja.`);
    doc.moveDown();
    doc.text('Korišćenjem usluge, Naručilac potvrđuje da prihvata sve uslove navedene u ovoj licenci.');

    drawLicenseFooter(doc, licenseNumber, verificationHash);

    doc.end();
  });
}

/**
 * Generate PDF buffer for Copyright Transfer contract
 */
export function generateCopyrightTransferPDF(data: CopyrightTransferContract, licenseNumber: string, verificationHash: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });
    
    // Register DejaVu Sans font for Serbian characters support
    doc.registerFont('DejaVuSans', fontPath('DejaVuSans.ttf'));
    doc.registerFont('DejaVuSans-Bold', fontPath('DejaVuSans-Bold.ttf'));
    
    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Draw professional contract header with logo
    const bodyStartY = drawContractLogo(doc);
    doc.y = bodyStartY;

    // License title
    doc.fontSize(14).font('DejaVuSans-Bold').text('LICENCA ZA PRENOS IMOVINSKIH AUTORSKIH PRAVA', { align: 'center' });
    doc.moveDown(2);

    // License metadata
    doc.fontSize(10).font('DejaVuSans')
      .text(`Izdata dana ${data.contractDate} godine u ${data.contractPlace}, između sledećih strana:`, { align: 'left' });
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

    doc.fontSize(10).text('(u daljem tekstu zajednički: "Strane").');
    doc.moveDown(3);

    // Član 1
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 1. Predmet licence', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Predmet ove licence je prenos imovinskih autorskih prava na sledećem autorskom delu:');
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
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 5. Podela prihoda od korišćenja dela (Streaming servis)', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Strane su saglasne da se prihod ostvaren od eksploatacije dela deli na sledeći način:');
    doc.text(`– Procenat prihoda koji pripada Autoru/Prodavcu: ${data.authorPercentage}%`);
    doc.text(`– Procenat prihoda koji pripada Kupcu: ${data.buyerPercentage}%`);
    doc.moveDown(2);

    // Član 6
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 6. Moralna prava', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Autor zadržava moralna prava na delu, uključujući:');
    doc.text('– Pravo da bude priznat i označen kao autor dela;');
    doc.text('– Pravo da delo ne bude menjano, obrađivano ili prilagođavano bez njegove prethodne pisane saglasnosti.');
    doc.moveDown(2);

    // Član 7
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 7. Nadležnost', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Za tumačenje i sprovođenje ove licence nadležan je sud u: ${data.jurisdiction}`);
    doc.moveDown(2);

    // Član 8
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 8. Završne odredbe', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ova licenca je izdata dana ${data.finalDate} i stupa na snagu danom njenog izdavanja.`);
    doc.text('Prenosom prava, Kupac potvrđuje da prihvata sve uslove navedene u ovoj licenci.');

    drawLicenseFooter(doc, licenseNumber, verificationHash);

    doc.end();
  });
}

/**
 * Generate PDF buffer for Instrumental Sale contract
 */
export function generateInstrumentalSalePDF(data: InstrumentalSaleContract, licenseNumber: string, verificationHash: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 72, right: 72 }
    });
    
    // Register DejaVu Sans font for Serbian characters support
    doc.registerFont('DejaVuSans', fontPath('DejaVuSans.ttf'));
    doc.registerFont('DejaVuSans-Bold', fontPath('DejaVuSans-Bold.ttf'));
    
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
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 5. Podela prihoda od korišćenja', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Prihod od korišćenja instrumentala deli se na sledeći način:');
    doc.text(`– Procenat prihoda koji pripada Izdavaču: ${data.authorPercentage}%`);
    doc.text(`– Procenat prihoda koji pripada Korisniku: ${data.buyerPercentage}%`);
    doc.moveDown(2);

    // Član 6
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 6. Autorska prava', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text('Izdavač zadržava sva autorska i moralna prava na instrumentalu, uključujući:');
    doc.text('– Pravo da bude priznat i označen kao autor instrumentala.');
    doc.text('– Pravo da instrumental ne bude menjan bez prethodne pisane saglasnosti.');
    doc.moveDown(2);

    // Član 7
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 7. Nadležnost', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Za rešavanje eventualnih sporova nadležan je sud u: ${data.jurisdiction}`);
    doc.moveDown(2);

    // Član 8
    doc.fontSize(12).font('DejaVuSans-Bold').text('Član 8. Važnost licence', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10).font('DejaVuSans');
    doc.text(`Ova licenca je izdata u ${data.copies} primerka i stupa na snagu danom njenog izdavanja.`);
    doc.moveDown();
    doc.text('Korišćenjem instrumentala, Korisnik potvrđuje da prihvata sve uslove navedene u ovoj licenci.');

    drawLicenseFooter(doc, licenseNumber, verificationHash);

    doc.end();
  });
}
