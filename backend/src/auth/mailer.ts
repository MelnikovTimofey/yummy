import nodemailer from 'nodemailer';
import { config } from '../config';

type MailOptions = {
  to: string;
  subject: string;
  text: string;
};

const hasAuth = Boolean(config.smtp.user && config.smtp.pass);

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: hasAuth
    ? {
        user: config.smtp.user,
        pass: config.smtp.pass,
      }
    : undefined,
});

export const sendMail = async ({ to, subject, text }: MailOptions) => {
  await transporter.sendMail({
    from: config.smtp.from,
    to,
    subject,
    text,
  });
};
