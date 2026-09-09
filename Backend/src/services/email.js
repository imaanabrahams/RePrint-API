import nodemailer from "nodemailer";

const createTransporter = () => {
  const required = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD"];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(
      `Email service is not configured. Missing: ${missing.join(", ")}`,
    );
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

export const sendMarketingEmail = ({ to, subject, text, html }) => {
  const transporter = createTransporter();
  return transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
    html,
  });
};
