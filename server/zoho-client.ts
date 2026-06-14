import nodemailer from 'nodemailer';

const ZOHO_USER = 'podrska@studioleflow.com';

let transporter: nodemailer.Transporter | null = null;

export function getZohoTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const pass = process.env.ZOHO_APP_PASSWORD;
  if (!pass) throw new Error('ZOHO_APP_PASSWORD env var nije postavljen');

  transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    auth: { user: ZOHO_USER, pass },
  });

  return transporter;
}

export async function sendZohoEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const transport = getZohoTransporter();
  const info = await transport.sendMail({
    from: `"Studio LeFlow" <${ZOHO_USER}>`,
    to,
    subject,
    html,
  });
  return info;
}
