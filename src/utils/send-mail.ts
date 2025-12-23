import nodemailer, { Transporter } from "nodemailer";
import path from "path";
import fs from "fs";
import ejs from "ejs";
import "dotenv/config";

interface EmailOptions {
  email: string;
  subject: string;
  template: string;
  data: { [key: string]: any };
  attachments?: { filename: string; path: string; cid: string }[];
}

const sendMail = async (options: EmailOptions): Promise<void> => {
  // Validate email configuration
  const smtpHost = process.env.SMTP_HOST;
  const smtpMail = process.env.SMTP_MAIL;
  const smtpPassword = process.env.SMTP_PASSWORD;
  // Use MAIL if set, otherwise fallback to SMTP_MAIL (they should be the same)
  const fromEmail = process.env.MAIL || smtpMail;

  if (!smtpHost || !smtpMail || !smtpPassword) {
    const missing = [];
    if (!smtpHost) missing.push("SMTP_HOST");
    if (!smtpMail) missing.push("SMTP_MAIL");
    if (!smtpPassword) missing.push("SMTP_PASSWORD");
    throw new Error(
      `Missing required email configuration: ${missing.join(
        ", "
      )}. Please check your environment variables.`
    );
  }

  // Gmail app passwords are 16 characters without spaces
  // Remove spaces from password if present (common when copying from Gmail)
  const cleanedPassword = smtpPassword.replace(/\s+/g, "");

  const transporter: Transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(process.env.SMTP_PORT || "587"),
    service: process.env.SMTP_SERVICE,
    auth: {
      user: smtpMail,
      pass: cleanedPassword,
    },
  });

  // Verify transporter configuration
  try {
    await transporter.verify();
  } catch (error) {
    throw new Error(
      `SMTP configuration error: ${
        error instanceof Error
          ? error.message
          : "Unable to verify SMTP connection"
      }`
    );
  }

  const { email, subject, template, data } = options;

  const projectRoot = process.cwd();
  const candidateMailDirs = [
    path.join(projectRoot, "mails"),
    path.join(projectRoot, "src", "mails"),
    path.join(projectRoot, "dist", "mails"),
  ];
  const mailsDir =
    candidateMailDirs.find((p) => fs.existsSync(p)) || candidateMailDirs[0];
  const templatePath = path.join(mailsDir, template);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template not found: ${templatePath}`);
  }

  const html: string = await ejs.renderFile(templatePath, data);

  const mailOptions = {
    from: fromEmail,
    to: email,
    subject,
    html,
    attachments: options.attachments,
  };

  await transporter.sendMail(mailOptions);
};

export default sendMail;
