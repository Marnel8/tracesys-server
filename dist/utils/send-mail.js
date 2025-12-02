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
    const transporter = nodemailer_1.default.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        service: process.env.SMTP_SERVICE,
        auth: {
            user: process.env.SMTP_MAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });
    const { email, subject, template, data } = options;
    const projectRoot = process.cwd();
    const candidateMailDirs = [
        path_1.default.join(projectRoot, "mails"),
        path_1.default.join(projectRoot, "src", "mails"),
        path_1.default.join(projectRoot, "dist", "mails"),
    ];
    const mailsDir = candidateMailDirs.find((p) => fs_1.default.existsSync(p)) || candidateMailDirs[0];
    const templatePath = path_1.default.join(mailsDir, template);
    const html = await ejs_1.default.renderFile(templatePath, data);
    const mailOptions = {
        from: process.env.MAIL,
        to: email,
        subject,
        html,
        attachments: options.attachments,
    };
    await transporter.sendMail(mailOptions);
};
exports.default = sendMail;
