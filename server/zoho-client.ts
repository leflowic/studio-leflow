import nodemailer from 'nodemailer';

const ZOHO_USER = 'podrska@studioleflow.com';

let transporter: nodemailer.Transporter | null = null;

export function getZohoTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const pass = process.env.ZOHO_APP_PASSWORD;
  if (!pass) throw new Error('ZOHO_APP_PASSWORD env var nije postavljen na Railway');

  transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: ZOHO_USER, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
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
