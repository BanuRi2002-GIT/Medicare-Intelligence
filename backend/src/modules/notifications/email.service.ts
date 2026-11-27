import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

export async function sendNotificationEmail(
  email: string,
  subject: string,
  message: string
) {
  if (
    !process.env.SMTP_HOST ||
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASSWORD ||
    !process.env.SMTP_FROM
  ) {
    throw new Error("SMTP configuration is incomplete");
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: email,
    subject,
    text: message,
  });
}