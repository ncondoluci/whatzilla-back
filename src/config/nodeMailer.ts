import nodemailer, { Transporter } from 'nodemailer';

export const createSmtpTransport = (): Transporter => {
  const host = process.env.NODE_MAILER_HOST;
  const port = parseInt(process.env.NODE_MAILER_PORT || '0', 10);
  const user = process.env.NODE_MAILER_USER;
  const pass = process.env.NODE_MAILER_PASSWORD;

  if (!host || !port || !user || !pass) {
    throw new Error('Missing configuration variables for create smtp transport.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};
