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
	const transporter: Transporter = nodemailer.createTransport({
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
		path.join(projectRoot, "mails"),
		path.join(projectRoot, "src", "mails"),
		path.join(projectRoot, "dist", "mails"),
	];
	const mailsDir = candidateMailDirs.find((p) => fs.existsSync(p)) || candidateMailDirs[0];
	const templatePath = path.join(mailsDir, template);

	const html: string = await ejs.renderFile(templatePath, data);

	const mailOptions = {
		from: process.env.MAIL,
		to: email,
		subject,
		html,
		attachments: options.attachments,
	};

	await transporter.sendMail(mailOptions);
};

export default sendMail;
