"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ejs_1 = __importDefault(require("ejs"));
require("dotenv/config");
const sendMail = async (options) => {
    // Validate email configuration
    const smtpHost = process.env.SMTP_HOST;
    const smtpMail = process.env.SMTP_MAIL;
    const smtpPassword = process.env.SMTP_PASSWORD;
    // Use MAIL if set, otherwise fallback to SMTP_MAIL (they should be the same)
    const fromEmail = process.env.MAIL || smtpMail;
    if (!smtpHost || !smtpMail || !smtpPassword) {
        const missing = [];
        if (!smtpHost)
            missing.push("SMTP_HOST");
        if (!smtpMail)
            missing.push("SMTP_MAIL");
        if (!smtpPassword)
            missing.push("SMTP_PASSWORD");
        throw new Error(`Missing required email configuration: ${missing.join(", ")}. Please check your environment variables.`);
    }
    // Gmail app passwords are 16 characters without spaces
    // Remove spaces from password if present (common when copying from Gmail)
    const cleanedPassword = smtpPassword.replace(/\s+/g, "");
    const transporter = nodemailer_1.default.createTransport({
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
    }
    catch (error) {
        throw new Error(`SMTP configuration error: ${error instanceof Error
            ? error.message
            : "Unable to verify SMTP connection"}`);
    }
    const { email, subject, template, data } = options;
    const projectRoot = process.cwd();
    const candidateMailDirs = [
        path_1.default.join(projectRoot, "mails"),
        path_1.default.join(projectRoot, "src", "mails"),
        path_1.default.join(projectRoot, "dist", "mails"),
    ];
    const mailsDir = candidateMailDirs.find((p) => fs_1.default.existsSync(p)) || candidateMailDirs[0];
    const templatePath = path_1.default.join(mailsDir, template);
    if (!fs_1.default.existsSync(templatePath)) {
        throw new Error(`Email template not found: ${templatePath}`);
    }
    const html = await ejs_1.default.renderFile(templatePath, data);
    const mailOptions = {
        from: fromEmail,
        to: email,
        subject,
        html,
        attachments: options.attachments,
    };
    await transporter.sendMail(mailOptions);
};
exports.default = sendMail;
