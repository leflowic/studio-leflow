import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

function wrap(body: string): string {
  return `<!DOCTYPE html>
<html lang="sr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>Studio LeFlow</title>
</head>
<body style="margin:0;padding:0;background-color:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#080808">
    <tr>
      <td align="center" style="padding:48px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;max-width:540px;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(145deg,#130826 0%,#0c1a4a 100%);border-radius:16px 16px 0 0;padding:36px 32px 28px;text-align:center;border:1px solid #2a1a5e;border-bottom:none;">
              <img src="${BASE_URL}/leflow-logo-white.png" alt="Studio LeFlow" width="48" height="48" style="display:block;margin:0 auto 12px;" />
              <div style="font-size:10px;letter-spacing:5px;color:#8b5cf6;text-transform:uppercase;margin-bottom:4px;font-weight:600;">Muzički Studio</div>
              <div style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:3px;text-transform:uppercase;line-height:1;">LeFlow</div>
            </td>
          </tr>

          <!-- DIVIDER LINE -->
          <tr>
            <td style="background:linear-gradient(90deg,transparent,#7c3aed,transparent);height:1px;border-left:1px solid #2a1a5e;border-right:1px solid #2a1a5e;"></td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="background:#111111;padding:40px 36px;border-left:1px solid #222222;border-right:1px solid #222222;">
              ${body}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="background:#0d0d0d;border-radius:0 0 16px 16px;padding:24px 36px;border:1px solid #1e1e1e;border-top:1px solid #1a1a1a;text-align:center;">
              <p style="margin:0 0 6px;color:#444444;font-size:12px;">Studio LeFlow &nbsp;·&nbsp; Beograd, Srbija</p>
              <p style="margin:0 0 6px;color:#333333;font-size:11px;">
                <a href="${BASE_URL}" style="color:#6d28d9;text-decoration:none;">studioleflow.com</a>
                &nbsp;&nbsp;·&nbsp;&nbsp;
                <a href="${BASE_URL}/pravila" style="color:#444444;text-decoration:none;">Pravila</a>
              </p>
              <p style="margin:0;color:#2a2a2a;font-size:11px;">© ${new Date().getFullYear()} Studio LeFlow. Sva prava zadržana.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function codeBlock(code: string, label: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0;">
      <tr>
        <td style="background:#1a1a1a;border:1px solid #2d1b69;border-radius:12px;padding:28px 24px;text-align:center;">
          <div style="font-size:44px;font-weight:800;letter-spacing:14px;color:#a78bfa;font-family:'Courier New',Courier,monospace;line-height:1;">${code}</div>
          <div style="font-size:11px;color:#555555;margin-top:10px;letter-spacing:2px;text-transform:uppercase;">${label}</div>
        </td>
      </tr>
    </table>`;
}

function heading(text: string): string {
  return `<h2 style="margin:0 0 16px;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${text}</h2>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;color:#888888;font-size:15px;line-height:1.7;">${text}</p>`;
}

function notice(text: string): string {
  return `<p style="margin:24px 0 0;color:#444444;font-size:13px;line-height:1.6;border-top:1px solid #1e1e1e;padding-top:20px;">${text}</p>`;
}

function button(label: string, url: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px auto;">
      <tr>
        <td style="border-radius:8px;background:linear-gradient(135deg,#7c3aed,#4f46e5);">
          <a href="${url}" style="display:inline-block;padding:14px 36px;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:0.5px;border-radius:8px;">${label}</a>
        </td>
      </tr>
    </table>`;
}

function infoRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #1e1e1e;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td style="color:#555555;font-size:13px;width:45%;">${label}</td>
            <td style="color:#cccccc;font-size:13px;font-weight:600;text-align:right;">${value}</td>
          </tr>
        </table>
      </td>
    </tr>`;
}

// ─── 1. Registration verification email ─────────────────────────────────────
export function verificationEmail(code: string, username: string): string {
  return wrap(`
    ${heading(`Dobrodošli, ${username}!`)}
    ${paragraph('Hvala što ste se registrovali. Da biste aktivirali nalog, unesite verifikacioni kod ispod:')}
    ${codeBlock(code, 'Verifikacioni Kod')}
    ${paragraph('Kod važi <strong style="color:#cccccc;">24 sata</strong>. Unesite ga na stranici za verifikaciju.')}
    ${notice('Ako niste kreirali nalog na Studio LeFlow, slobodno ignorišite ovaj email.')}
  `);
}

// ─── 2. Resend verification code ────────────────────────────────────────────
export function resendVerificationEmail(code: string): string {
  return wrap(`
    ${heading('Novi Verifikacioni Kod')}
    ${paragraph('Na Vaš zahtev, generisali smo novi verifikacioni kod:')}
    ${codeBlock(code, 'Verifikacioni Kod')}
    ${paragraph('Kod važi <strong style="color:#cccccc;">15 minuta</strong>.')}
    ${notice('Ako niste zatražili novi kod, ignorišite ovaj email.')}
  `);
}

// ─── 3. Password reset email ─────────────────────────────────────────────────
export function passwordResetEmail(code: string): string {
  return wrap(`
    ${heading('Resetovanje Lozinke')}
    ${paragraph('Primili smo zahtev za resetovanje Vaše lozinke. Unesite kod ispod da nastavite:')}
    ${codeBlock(code, 'Kod za Reset Lozinke')}
    ${paragraph('Kod važi <strong style="color:#cccccc;">15 minuta</strong>. Nakon toga biće automatski poništen.')}
    ${notice('Ako niste zatražili resetovanje lozinke, Vaš nalog je bezbedan - ignorišite ovaj email.')}
  `);
}

// ─── 4. Admin 2FA login email ────────────────────────────────────────────────
export function adminLoginEmail(code: string): string {
  return wrap(`
    ${heading('Admin Prijava - Verifikacija')}
    ${paragraph('Detektovana je prijava na admin panel. Unesite kod ispod da potvrdite identitet:')}
    ${codeBlock(code, 'Admin Verifikacioni Kod')}
    ${paragraph('Kod važi <strong style="color:#cccccc;">15 minuta</strong>.')}
    ${notice('⚠️ Ako ovo niste Vi, Vaš nalog je možda kompromitovan. Odmah promenite lozinku.')}
  `);
}

// ─── 5. Newsletter confirmation email ───────────────────────────────────────
export function newsletterConfirmEmail(confirmUrl: string): string {
  return wrap(`
    ${heading('Potvrdite Prijavu na Newsletter')}
    ${paragraph('Hvala što ste se prijavili na Studio LeFlow newsletter! Kliknite dugme ispod da potvrdite Vašu email adresu i počnete da primate najnovije vesti, promocije i ekskluzivan sadržaj.')}
    ${button('Potvrdi Email Adresu', confirmUrl)}
    ${paragraph(`Ili kopirajte link u pretraživač:<br><span style="color:#6d28d9;font-size:12px;word-break:break-all;">${confirmUrl}</span>`)}
    ${notice('Ako niste zatražili prijavu na newsletter, ignorišite ovaj email.')}
  `);
}

// ─── 6. Contact form notification (internal) ────────────────────────────────
export function contactFormEmail(data: {
  service: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  preferredDate?: string;
}): string {
  return wrap(`
    ${heading('Novi Upit Sa Sajta')}
    ${paragraph('Stigao je novi upit putem kontakt forme.')}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1a1a1a;border:1px solid #222;border-radius:10px;padding:4px 16px;margin:24px 0;">
      <tbody>
        ${infoRow('Usluga', data.service)}
        ${infoRow('Ime', data.name)}
        ${infoRow('Email', `<a href="mailto:${data.email}" style="color:#7c3aed;text-decoration:none;">${data.email}</a>`)}
        ${infoRow('Telefon', data.phone)}
        ${data.preferredDate ? infoRow('Željeni termin', data.preferredDate) : ''}
      </tbody>
    </table>
    <div style="background:#1a1a1a;border:1px solid #222;border-radius:10px;padding:16px;margin-top:8px;">
      <div style="font-size:12px;color:#555;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;">Poruka</div>
      <div style="color:#bbbbbb;font-size:14px;line-height:1.7;">${data.message.replace(/\n/g, '<br>')}</div>
    </div>
  `);
}

// ─── 7. Custom admin email ───────────────────────────────────────────────────
export function customEmail(body: string): string {
  const htmlBody = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  return wrap(`
    <div style="color:#cccccc;font-size:15px;line-height:1.8;">${htmlBody}</div>
  `);
}

// ─── 8. License delivery email ───────────────────────────────────────────────
export function licenseDeliveryEmail(data: {
  contractNumber: string;
  contractType: string;
  createdAt: Date;
  verificationHash?: string | null;
}): string {
  const typeLabel = data.contractType === 'mix_master'
    ? 'Mix & Master'
    : data.contractType === 'copyright_transfer'
      ? 'Prenos Autorskih Prava'
      : 'Prodaja Instrumentala';

  const verifySection = data.verificationHash
    ? `${paragraph(`Autentičnost ove licence možete proveriti na:`)}
       <div style="background:#1a1a1a;border:1px solid #2d1b69;border-radius:8px;padding:12px 16px;margin:0 0 16px;text-align:center;">
         <a href="${BASE_URL}/proveri/${data.verificationHash}" style="color:#8b5cf6;font-size:13px;text-decoration:none;word-break:break-all;">${BASE_URL}/proveri/${data.verificationHash}</a>
       </div>`
    : '';

  return wrap(`
    ${heading('Vaša Licenca Je Spremna')}
    ${paragraph('U prilogu se nalazi Vaša digitalna licenca od Studio LeFlow. Čuvajte PDF dokument - on predstavlja zvanični dokaz o izdatoj licenci.')}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#1a1a1a;border:1px solid #222;border-radius:10px;padding:4px 16px;margin:24px 0;">
      <tbody>
        ${infoRow('Broj licence', data.contractNumber)}
        ${infoRow('Tip licence', typeLabel)}
        ${infoRow('Datum izdavanja', new Date(data.createdAt).toLocaleDateString('sr-RS', { day: '2-digit', month: '2-digit', year: 'numeric' }))}
      </tbody>
    </table>
    ${verifySection}
    ${notice('Ova poruka je automatski generisana. Za sva pitanja kontaktirajte nas na <a href="mailto:podrska@studioleflow.com" style="color:#6d28d9;text-decoration:none;">podrska@studioleflow.com</a>.')}
  `);
}
