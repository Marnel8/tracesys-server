"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const projectRoot = process.cwd();
const candidateUploads = [
    path_1.default.join(projectRoot, "uploads"),
    path_1.default.join(projectRoot, "src", "uploads"),
    path_1.default.join(projectRoot, "dist", "uploads"),
];
const uploadsDir = candidateUploads.find((p) => fs_1.default.existsSync(p)) || candidateUploads[0];
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
const upload = (0, multer_1.default)({ storage: storage });
exports.default = upload;
