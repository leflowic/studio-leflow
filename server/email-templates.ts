import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Transactional + newsletter email templates.
//
// Design (2026-11): light card on a warm off-white page, left-aligned copy,
// small logo + wordmark header, anthracite text and button, oak accent for
// links - the same anthracite + natural oak palette as the site. Deliberately
// avoids the "template" look: no dark hero banner, no letter-spaced caps
// eyebrows, no gradient rules, no centered wall of text, no Title Case.
//
// Email-client constraints this respects: tables for layout, inline styles,
// no SVG (Gmail strips it), web-safe font stack, 560px max width, a hidden
// preheader for the inbox preview line, and a prefers-color-scheme block so
// Apple Mail / iOS render a proper dark version instead of auto-inverting.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.APP_URL || 'https://studioleflow.com';

function loadLogo(): string | null {
  try {
    return fs.readFileSync(path.resolve(__dirname, '..', 'public', 'leflow-logo.png')).toString('base64');
  } catch {
    return null;
  }
}

const logoBase64 = loadLogo();

export const logoAttachment = logoBase64 ? {
  filename: 'leflow-logo.png',
  content: logoBase64,
  contentType: 'image/png',
  contentId: 'leflow-logo',
} : null;

// Palette
const INK = '#161718';      // anthracite - headings, button
const TEXT = '#3a3b3d';     // body copy
const MUTED = '#77736d';    // secondary text
const LINE = '#e7e2da';     // hairlines
const PAGE = '#f4f2ee';     // outside the card
const PANEL = '#f8f6f2';    // code / detail panels inside the card
const OAK = '#8a6740';      // links on white (darker oak, AA contrast)

const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type WrapOptions = {
  preheader: string;           // inbox preview line
  footerNote?: string;         // why the reader got this email
  unsubscribeUrl?: string;     // newsletters only
};

function wrap(body: string, opts: WrapOptions): string {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Studio LeFlow</title>
  <style>
    /* Staff-written newsletter HTML (rich text editor) */
    .content h1, .content h2, .content h3 { color:${INK}; margin:0 0 12px; line-height:1.3; }
    .content h1 { font-size:22px; } .content h2 { font-size:20px; } .content h3 { font-size:17px; }
    .content p { margin:0 0 16px; }
    .content a { color:${OAK}; text-decoration:underline; }
    .content img { max-width:100%; height:auto; border-radius:8px; }
    .content ul, .content ol { margin:0 0 16px; padding-left:22px; }
    .content > :first-child { margin-top:0; }
    @media (prefers-color-scheme: dark) {
      .content h1, .content h2, .content h3 { color:#f3efe9 !important; }
      .content a { color:#c9a27a !important; }
      .page { background:#111213 !important; }
      .card { background:#1b1c1e !important; border-color:#2a2b2e !important; }
      .ink { color:#f3efe9 !important; }
      .text { color:#c9c5bf !important; }
      .muted { color:#8f8a83 !important; }
      .panel { background:#232427 !important; border-color:#2f3033 !important; }
      .line { border-color:#2a2b2e !important; }
      .link { color:#c9a27a !important; }
      .btn { background:#c9a27a !important; }
      .btn a { color:#161718 !important; }
      .logo-light { display:none !important; }
      .logo-dark { display:inline-block !important; }
    }
    @media (max-width: 600px) {
      .card-pad { padding:28px 22px !important; }
    }
  </style>
</head>
<body class="page" style="margin:0;padding:0;background:${PAGE};font-family:${FONT};-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${esc(opts.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
  <table role="presentation" class="page" width="100%" cellspacing="0" cellpadding="0" bgcolor="${PAGE}" style="background:${PAGE};">
    <tr>
      <td align="center" style="padding:40px 16px 32px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;max-width:560px;">

          <tr>
            <td style="padding:0 4px 18px;">
              <a href="${BASE_URL}" style="text-decoration:none;">
                <img class="logo-light" src="${BASE_URL}/leflow-logo.png" alt="" width="30" height="23" style="display:inline-block;vertical-align:middle;border:0;" />
                <img class="logo-dark" src="${BASE_URL}/leflow-logo-white.png" alt="" width="30" height="23" style="display:none;vertical-align:middle;border:0;" />
                <span class="ink" style="display:inline-block;vertical-align:middle;margin-left:10px;color:${INK};font-size:15px;font-weight:700;">Studio LeFlow</span>
              </a>
            </td>
          </tr>

          <tr>
            <td class="card card-pad" style="background:#ffffff;border:1px solid ${LINE};border-radius:12px;padding:36px 36px 32px;">
              ${body}
            </td>
          </tr>

          <tr>
            <td style="padding:22px 4px 0;">
              ${opts.footerNote ? `<p class="muted" style="margin:0 0 10px;color:${MUTED};font-size:12px;line-height:1.6;">${opts.footerNote}</p>` : ''}
              <p class="muted" style="margin:0;color:${MUTED};font-size:12px;line-height:1.6;">
                Studio LeFlow, Beograd &middot;
                <a class="link" href="${BASE_URL}" style="color:${MUTED};text-decoration:underline;">studioleflow.com</a> &middot;
                <a class="link" href="mailto:podrska@studioleflow.com" style="color:${MUTED};text-decoration:underline;">podrska@studioleflow.com</a>
                ${opts.unsubscribeUrl ? `&middot; <a class="link" href="${opts.unsubscribeUrl}" style="color:${MUTED};text-decoration:underline;">Odjavi se</a>` : ''}
              </p>
              <p class="muted" style="margin:6px 0 0;color:${MUTED};font-size:12px;">&copy; ${year} Studio LeFlow</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function heading(text: string): string {
  return `<h1 class="ink" style="margin:0 0 14px;color:${INK};font-size:22px;line-height:1.3;font-weight:700;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p class="text" style="margin:0 0 16px;color:${TEXT};font-size:15px;line-height:1.65;">${text}</p>`;
}

function small(text: string): string {
  return `<p class="muted" style="margin:0 0 12px;color:${MUTED};font-size:13px;line-height:1.6;">${text}</p>`;
}

function divider(): string {
  return `<div class="line" style="border-top:1px solid ${LINE};margin:24px 0 20px;line-height:0;font-size:0;">&nbsp;</div>`;
}

function link(href: string, label: string): string {
  return `<a class="link" href="${href}" style="color:${OAK};text-decoration:underline;">${label}</a>`;
}

function codeBlock(code: string, label: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:8px 0 22px;">
      <tr>
        <td class="panel" style="background:${PANEL};border:1px solid ${LINE};border-radius:10px;padding:20px 22px;">
          <div class="muted" style="color:${MUTED};font-size:12px;margin-bottom:8px;">${label}</div>
          <div class="ink" style="color:${INK};font-size:30px;font-weight:700;letter-spacing:6px;font-family:'SFMono-Regular',Menlo,Consolas,'Courier New',monospace;line-height:1.1;">${code}</div>
        </td>
      </tr>
    </table>`;
}

function button(label: string, url: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:6px 0 22px;">
      <tr>
        <td class="btn" style="border-radius:999px;background:${INK};">
          <a href="${url}" style="display:inline-block;padding:12px 26px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;border-radius:999px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

function details(rows: Array<[string, string]>): string {
  const tr = rows.map(([k, v], i) => `
      <tr>
        <td class="muted line" style="padding:11px 0;color:${MUTED};font-size:14px;width:38%;vertical-align:top;${i ? `border-top:1px solid ${LINE};` : ''}">${k}</td>
        <td class="ink line" style="padding:11px 0;color:${INK};font-size:14px;font-weight:600;vertical-align:top;${i ? `border-top:1px solid ${LINE};` : ''}">${v}</td>
      </tr>`).join('');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 22px;">${tr}</table>`;
}

function signoff(): string {
  return `<p class="text" style="margin:8px 0 0;color:${TEXT};font-size:15px;line-height:1.6;">Pozdrav,<br>Studio LeFlow</p>`;
}

// ─── 1. Registration verification ───────────────────────────────────────────
export function verificationEmail(code: string, username: string): string {
  return wrap(`
    ${heading(`Dobrodošli, ${esc(username)}`)}
    ${paragraph('Još jedan korak do aktivnog naloga. Unesite ovaj kod na stranici za verifikaciju:')}
    ${codeBlock(code, 'Verifikacioni kod')}
    ${small('Kod važi 24 sata.')}
    ${divider()}
    ${small('Niste pravili nalog na studioleflow.com? Ignorišite ovaj email, bez koda nalog neće biti aktiviran.')}
  `, { preheader: `Vaš verifikacioni kod je ${code}. Važi 24 sata.`, footerNote: 'Ovaj email ste dobili jer je ova adresa upisana pri registraciji na studioleflow.com.' });
}

// ─── 2. Resend verification code ────────────────────────────────────────────
export function resendVerificationEmail(code: string): string {
  return wrap(`
    ${heading('Novi verifikacioni kod')}
    ${paragraph('Zatražili ste novi kod. Prethodni više ne važi.')}
    ${codeBlock(code, 'Verifikacioni kod')}
    ${small('Kod važi 15 minuta.')}
    ${divider()}
    ${small('Niste tražili novi kod? Ignorišite ovaj email.')}
  `, { preheader: `Novi verifikacioni kod: ${code}. Važi 15 minuta.` });
}

// ─── 3. Password reset ──────────────────────────────────────────────────────
export function passwordResetEmail(code: string): string {
  return wrap(`
    ${heading('Promena lozinke')}
    ${paragraph('Neko je zatražio promenu lozinke za Vaš nalog. Ako ste to bili Vi, unesite ovaj kod:')}
    ${codeBlock(code, 'Kod za promenu lozinke')}
    ${small('Kod važi 15 minuta.')}
    ${divider()}
    ${small('Niste tražili promenu? Lozinka ostaje ista i ništa ne morate da radite.')}
  `, { preheader: `Kod za promenu lozinke: ${code}. Važi 15 minuta.` });
}

// ─── 4. Admin 2FA login ─────────────────────────────────────────────────────
export function adminLoginEmail(code: string): string {
  return wrap(`
    ${heading('Prijava na admin panel')}
    ${paragraph('Za završetak prijave unesite ovaj kod:')}
    ${codeBlock(code, 'Kod za prijavu')}
    ${small('Kod važi 15 minuta.')}
    ${divider()}
    ${paragraph(`<strong class="ink" style="color:${INK};">Niste se Vi prijavljivali?</strong> Neko zna Vašu lozinku. Promenite je odmah i javite se na ${link('mailto:podrska@studioleflow.com', 'podrska@studioleflow.com')}.`)}
  `, { preheader: `Kod za prijavu na admin panel: ${code}` });
}

// ─── 5. Newsletter double opt-in ────────────────────────────────────────────
export function newsletterConfirmEmail(confirmUrl: string): string {
  return wrap(`
    ${heading('Potvrdite prijavu na newsletter')}
    ${paragraph('Kliknite dugme da potvrdite da želite da dobijate naš newsletter: nova izdanja iz studija i povremene akcije. Ne šaljemo često.')}
    ${button('Potvrdi prijavu', confirmUrl)}
    ${small(`Dugme ne radi? Otvorite ovaj link:<br>${link(confirmUrl, confirmUrl)}`)}
    ${divider()}
    ${small('Niste se prijavljivali? Ignorišite ovaj email, bez potvrde Vas nećemo dodati na listu.')}
  `, { preheader: 'Još samo jedan klik do prijave na newsletter Studio LeFlow.' });
}

// ─── 6. Contact form notification (internal, to podrska@) ──────────────────
export function contactFormEmail(data: {
  service: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredDate?: string;
  demoUrl?: string;
}): string {
  const rows: Array<[string, string]> = [
    ['Usluga', data.service],
    ['Ime', data.name],
    ['Email', link(`mailto:${data.email}`, data.email)],
    ['Telefon', data.phone ? link(`tel:${data.phone.replace(/[^\d+]/g, '')}`, data.phone) : '-'],
  ];
  if (data.preferredDate) rows.push(['Željeni termin', data.preferredDate]);
  if (data.demoUrl) rows.push(['Demo snimak', `<span style="word-break:break-all;">${link(data.demoUrl, data.demoUrl)}</span>`]);

  return wrap(`
    ${heading(`Novi upit: ${data.service}`)}
    ${paragraph(`${data.name} je poslao/la upit preko kontakt forme.`)}
    ${details(rows)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 22px;">
      <tr>
        <td class="panel" style="background:${PANEL};border:1px solid ${LINE};border-radius:10px;padding:18px 20px;">
          <div class="muted" style="color:${MUTED};font-size:12px;margin-bottom:8px;">Poruka</div>
          <div class="text" style="color:${TEXT};font-size:15px;line-height:1.65;">${data.message.replace(/\n/g, '<br>')}</div>
        </td>
      </tr>
    </table>
    ${button('Odgovori', `mailto:${data.email}?subject=${encodeURIComponent('Re: upit - Studio LeFlow')}`)}
    ${small('Obećali smo odgovor u roku od 24h.')}
  `, { preheader: `${data.name}: ${data.message.slice(0, 90)}` });
}

// ─── 7. Custom admin email (EmailTab) ───────────────────────────────────────
export function customEmail(body: string): string {
  const htmlBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return wrap(`
    <div class="text" style="color:${TEXT};font-size:15px;line-height:1.7;">${htmlBody}</div>
    ${signoff()}
  `, { preheader: body.replace(/\s+/g, ' ').slice(0, 110) });
}

// ─── 8. License delivery ────────────────────────────────────────────────────
export function licenseDeliveryEmail(data: {
  contractNumber: string;
  contractType: string;
  createdAt: Date;
  verificationHash?: string | null;
}): string {
  const typeLabel = data.contractType === 'mix_master'
    ? 'Mix i master'
    : data.contractType === 'copyright_transfer'
      ? 'Prenos autorskih prava'
      : 'Prodaja instrumentala';
  const issued = new Date(data.createdAt).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const verifyUrl = data.verificationHash ? `${BASE_URL}/proveri/${data.verificationHash}` : null;

  return wrap(`
    ${heading('Vaša licenca je u prilogu')}
    ${paragraph('U prilogu je PDF licence. Sačuvajte ga, to je zvanični dokument o pravima na delo.')}
    ${details([
      ['Broj licence', data.contractNumber],
      ['Vrsta', typeLabel],
      ['Datum izdavanja', issued],
    ])}
    ${verifyUrl ? `${paragraph('Svako može da proveri da je licenca prava:')}${button('Proveri licencu', verifyUrl)}` : ''}
    ${divider()}
    ${small(`Pitanja u vezi sa licencom: ${link('mailto:podrska@studioleflow.com', 'podrska@studioleflow.com')}`)}
  `, { preheader: `Licenca ${data.contractNumber} (${typeLabel}) je u prilogu.` });
}

// ─── 9. Delivery + review request ───────────────────────────────────────────
// Same link as the "Recenzije na Google-u" button on home.tsx - a Google
// search page, not a direct "write a review" composer (no Place ID on file
// yet). Swap both places if a search.google.com/local/writereview?placeid=
// link is obtained.
const GOOGLE_REVIEW_URL = 'https://www.google.com/search?q=Studio+LeFlow+Beograd';

export function reviewRequestEmail(data: { jobTitle: string; username: string }): string {
  return wrap(`
    ${heading('Vaša pesma je isporučena')}
    ${paragraph(`Ćao ${esc(data.username)}, "${esc(data.jobTitle)}" je završena i isporučena. Hvala što ste radili sa nama.`)}
    ${paragraph('Ako ste zadovoljni, recenzija na Google-u nam mnogo znači. Tako nas pronalaze drugi izvođači.')}
    ${button('Ostavi recenziju', GOOGLE_REVIEW_URL)}
    ${small(`Kratak utisak možete ostaviti i na svom ${link(`${BASE_URL}/dashboard`, 'nalogu')}, pored statusa pesme.`)}
    ${signoff()}
  `, { preheader: `"${data.jobTitle}" je isporučena.` });
}

// ─── 10. Newsletter campaign ────────────────────────────────────────────────
// Wraps the staff-written rich-text HTML (NewsletterTab / RichTextEditor) in
// the brand layout and adds the per-subscriber unsubscribe link.
export function newsletterCampaignEmail(contentHtml: string, unsubscribeUrl: string, preheader: string): string {
  return wrap(`
    <div class="text content" style="color:${TEXT};font-size:15px;line-height:1.7;">${contentHtml}</div>
    ${signoff()}
  `, {
    preheader,
    unsubscribeUrl,
    footerNote: 'Ovaj email ste dobili jer ste se prijavili na newsletter Studio LeFlow.',
  });
}

// ─── 11. Weekly smart link report (owners) ───────────────────────────────────
// Sent Monday mornings by server/engagement-jobs.ts to users who own a smart
// link with at least one visitor last week. Numbers are unique visitors (one
// per network), the same metric the owner sees on the dashboard.
const PLATFORM_NAME: Record<string, string> = {
  spotify: 'Spotify', youtube: 'YouTube', apple_music: 'Apple Music', soundcloud: 'SoundCloud', tidal: 'Tidal', deezer: 'Deezer',
};

function posetilaca(n: number): string {
  const m10 = n % 10, m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'posetilac';
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'posetioca';
  return 'posetilaca';
}

export function weeklySmartLinkReportEmail(data: {
  username: string;
  links: Array<{ title: string; slug: string; thisWeek: number; lastWeek: number; topPlatform: string | null }>;
}): string {
  const sorted = [...data.links].sort((a, b) => b.thisWeek - a.thisWeek);
  const total = sorted.reduce((a, l) => a + l.thisWeek, 0);
  const rows = sorted.map(l => {
    const diff = l.thisWeek - l.lastWeek;
    const trend = l.lastWeek === 0 ? (l.thisWeek > 0 ? 'prva nedelja sa posetama' : '') : `${diff >= 0 ? '+' : ''}${diff} u odnosu na prošlu nedelju`;
    const top = l.topPlatform ? `, najviše preko ${PLATFORM_NAME[l.topPlatform] ?? l.topPlatform}` : '';
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid ${LINE};">
          <div class="ink" style="color:${INK};font-size:15px;font-weight:600;">${esc(l.title)}</div>
          <div class="muted" style="color:${MUTED};font-size:13px;line-height:1.5;">${esc(trend)}${esc(top)}</div>
        </td>
        <td align="right" style="padding:10px 0 10px 16px;border-bottom:1px solid ${LINE};white-space:nowrap;">
          <span class="ink" style="color:${INK};font-size:18px;font-weight:700;">${l.thisWeek}</span>
          <span class="muted" style="color:${MUTED};font-size:12px;"> ${posetilaca(l.thisWeek)}</span>
        </td>
      </tr>`;
  }).join('');
  return wrap(`
    ${heading('Tvoja muzika prošle nedelje')}
    ${paragraph(`Ćao ${esc(data.username)}, tvoji smart linkovi su prošle nedelje imali ${total} ${posetilaca(total)}.`)}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 22px;border-collapse:collapse;">${rows}</table>
    ${button('Pogledaj detalje', `${BASE_URL}/dashboard`)}
    ${small(`Brojimo jedinstvene posetioce, ne klikove. Izveštaj možeš da isključiš u ${link(`${BASE_URL}/settings#obavestenja`, 'Podešavanjima')}.`)}
    ${signoff()}
  `, {
    preheader: `Prošle nedelje: ${total} ${posetilaca(total)} na tvojim linkovima.`,
    footerNote: 'Ovaj email dobijaš jer imaš smart link na Studio LeFlow.',
  });
}
