/**
 * Pluggable email sender. Default 'dev' provider logs the message (and any
 * action link) to stdout so the flows work without an email account. Wire
 * 'smtp' or 'resend' later via env without touching call sites.
 */

import { config } from '../config.js';

async function sendResend({ to, subject, text }) {
  // Minimal Resend HTTP call; only used when EMAIL_PROVIDER=resend.
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.email.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: config.email.from, to, subject, text })
  });
  if (!res.ok) throw new Error(`Resend failed: ${res.status} ${await res.text()}`);
}

let _smtpTransport = null;
async function sendSmtp({ to, subject, text }) {
  if (!_smtpTransport) {
    const nodemailer = (await import('nodemailer')).default;
    _smtpTransport = nodemailer.createTransport(config.email.smtpUrl);
  }
  await _smtpTransport.sendMail({ from: config.email.from, to, subject, text });
}

function logDev({ to, subject, text }) {
  console.error('\n──────── EMAIL (dev mode) ────────');
  console.error(`To:      ${to}`);
  console.error(`Subject: ${subject}`);
  console.error(text);
  console.error('──────────────────────────────────\n');
}

export async function sendEmail({ to, subject, text }) {
  const provider = config.email.provider;
  if (provider === 'resend' && config.email.resendApiKey) return sendResend({ to, subject, text });
  if (provider === 'smtp' && config.email.smtpUrl) return sendSmtp({ to, subject, text });
  // dev (default) or misconfigured provider: log so flows remain usable.
  logDev({ to, subject, text });
}

/** Build an absolute portal action URL (verification / reset links). */
export function portalLink(path, params = {}) {
  const url = new URL(`/access${path}`, config.publicBaseUrl);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}
