import multer from "multer";
import path from "path";
import fs from "fs";

const projectRoot = process.cwd();
const candidateUploads = [
	path.join(projectRoot, "uploads"),
	path.join(projectRoot, "src", "uploads"),
	path.join(projectRoot, "dist", "uploads"),
];
const uploadsDir = candidateUploads.find((p) => fs.existsSync(p)) || candidateUploads[0];

const storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, uploadsDir);
	},
	filename: function (req, file, cb) {
		const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
		cb(
			null,
			file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
		);
	},
});

const upload = multer({ storage: storage });

export default upload;
