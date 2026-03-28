import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mailserver',
  port: parseInt(process.env.SMTP_PORT || '25'),
  secure: false,
  tls: {
    rejectUnauthorized: false,
  },
})

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@localhost'

interface SendMailOptions {
  to: string
  subject: string
  html: string
}

export async function sendMail({ to, subject, html }: SendMailOptions) {
  const info = await transporter.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    html,
  })

  console.log('Mail sent:', info.messageId)
  return info
}