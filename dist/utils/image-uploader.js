"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getImagesMetadata = exports.getImageMetadata = exports.generateThumbnail = exports.cleanupTempFiles = exports.cleanupTempFile = exports.getFileSize = exports.validateImageFiles = exports.validateImageFile = exports.uploadFields = exports.uploadMultiple = exports.uploadSingle = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const error_1 = require("./error.js");
// Resolve uploads directory without relying on __dirname (works in CJS and ESM)
const projectRoot = process.cwd();
const candidateUploads = [
    path_1.default.join(projectRoot, "uploads"),
    path_1.default.join(projectRoot, "src", "uploads"),
    path_1.default.join(projectRoot, "dist", "uploads"),
];
const uploadsDir = candidateUploads.find((p) => fs_1.default.existsSync(p)) || candidateUploads[0];
// Ensure uploads directory exists
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure storage
const storage = multer_1.default.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path_1.default.extname(file.originalname));
    },
});
// File filter for images
const imageFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    ];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new error_1.BadRequestError(`Invalid file type. Only ${allowedMimeTypes.join(", ")} are allowed.`));
    }
};
// Configure multer with options
const upload = (0, multer_1.default)({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
        files: 10, // Maximum 10 files
    },
    fileFilter: imageFilter,
});
// Export different upload configurations
const uploadSingle = (fieldName) => upload.single(fieldName);
exports.uploadSingle = uploadSingle;
const uploadMultiple = (fieldName, maxCount = 10) => upload.array(fieldName, maxCount);
exports.uploadMultiple = uploadMultiple;
const uploadFields = (fields) => upload.fields(fields);
exports.uploadFields = uploadFields;
// Utility functions for file validation
const validateImageFile = (file) => {
    const allowedMimeTypes = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/gif",
    ];
    return allowedMimeTypes.includes(file.mimetype);
};
exports.validateImageFile = validateImageFile;
const validateImageFiles = (files) => {
    return files.every((file) => (0, exports.validateImageFile)(file));
};
exports.validateImageFiles = validateImageFiles;
const getFileSize = (file) => {
    const bytes = file.size;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    if (bytes === 0)
        return "0 Bytes";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
};
exports.getFileSize = getFileSize;
const cleanupTempFile = (filePath) => {
    try {
        if (fs_1.default.existsSync(filePath)) {
            fs_1.default.unlinkSync(filePath);
        }
    }
    catch (error) {
        console.error("Error cleaning up temp file:", error);
    }
};
exports.cleanupTempFile = cleanupTempFile;
const cleanupTempFiles = (files) => {
    files.forEach((file) => (0, exports.cleanupTempFile)(file.path));
};
exports.cleanupTempFiles = cleanupTempFiles;
const generateThumbnail = async (inputPath, outputPath, options = {}) => {
    // This would require sharp library for image processing
    // For now, we'll just copy the file as a placeholder
    fs_1.default.copyFileSync(inputPath, outputPath);
};
exports.generateThumbnail = generateThumbnail;
// File metadata extraction
const getImageMetadata = (file) => {
    return {
        originalName: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        sizeFormatted: (0, exports.getFileSize)(file),
        path: file.path,
        uploadDate: new Date().toISOString(),
    };
};
exports.getImageMetadata = getImageMetadata;
const getImagesMetadata = (files) => {
    return files.map((file) => (0, exports.getImageMetadata)(file));
};
exports.getImagesMetadata = getImagesMetadata;
exports.default = upload;
