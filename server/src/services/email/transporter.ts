import nodemailer from 'nodemailer'

let transporter: nodemailer.Transporter | null = null

export function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
  })

  return transporter
}

export async function sendEmail(options: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const transport = getTransporter()
  const from = process.env.SMTP_FROM || 'ContentForge <noreply@contentforge.app>'

  await transport.sendMail({
    from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  })
}
