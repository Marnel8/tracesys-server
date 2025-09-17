import multer from "multer";
import path from "path";
import fs from "fs";
import { BadRequestError } from "./error";

// Get current directory path
const currentDir = __dirname;

// Ensure uploads directory exists
const uploadsDir = path.join(currentDir, "../uploads");
if (!fs.existsSync(uploadsDir)) {
	fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure storage
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

// File filter for images
const imageFilter = (
	req: any,
	file: Express.Multer.File,
	cb: multer.FileFilterCallback
) => {
	const allowedMimeTypes = [
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/webp",
		"image/gif",
	];

	if (allowedMimeTypes.includes(file.mimetype)) {
		cb(null, true);
	} else {
		cb(
			new BadRequestError(
				`Invalid file type. Only ${allowedMimeTypes.join(", ")} are allowed.`
			)
		);
	}
};

// Configure multer with options
const upload = multer({
	storage: storage,
	limits: {
		fileSize: 5 * 1024 * 1024, // 5MB limit
		files: 10, // Maximum 10 files
	},
	fileFilter: imageFilter,
});

// Export different upload configurations
export const uploadSingle = (fieldName: string) => upload.single(fieldName);
export const uploadMultiple = (fieldName: string, maxCount: number = 10) =>
	upload.array(fieldName, maxCount);
export const uploadFields = (fields: { name: string; maxCount?: number }[]) =>
	upload.fields(fields);

// Utility functions for file validation
export const validateImageFile = (file: Express.Multer.File): boolean => {
	const allowedMimeTypes = [
		"image/jpeg",
		"image/jpg",
		"image/png",
		"image/webp",
		"image/gif",
	];

	return allowedMimeTypes.includes(file.mimetype);
};

export const validateImageFiles = (files: Express.Multer.File[]): boolean => {
	return files.every((file) => validateImageFile(file));
};

export const getFileSize = (file: Express.Multer.File): string => {
	const bytes = file.size;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	if (bytes === 0) return "0 Bytes";
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
};

export const cleanupTempFile = (filePath: string): void => {
	try {
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
	} catch (error) {
		console.error("Error cleaning up temp file:", error);
	}
};

export const cleanupTempFiles = (files: Express.Multer.File[]): void => {
	files.forEach((file) => cleanupTempFile(file.path));
};

// Image processing utilities
export interface ImageProcessingOptions {
	width?: number;
	height?: number;
	quality?: number;
	format?: "jpeg" | "png" | "webp";
}

export const generateThumbnail = async (
	inputPath: string,
	outputPath: string,
	options: ImageProcessingOptions = {}
): Promise<void> => {
	// This would require sharp library for image processing
	// For now, we'll just copy the file as a placeholder
	fs.copyFileSync(inputPath, outputPath);
};

// File metadata extraction
export const getImageMetadata = (file: Express.Multer.File) => {
	return {
		originalName: file.originalname,
		filename: file.filename,
		mimetype: file.mimetype,
		size: file.size,
		sizeFormatted: getFileSize(file),
		path: file.path,
		uploadDate: new Date().toISOString(),
	};
};

export const getImagesMetadata = (files: Express.Multer.File[]) => {
	return files.map((file) => getImageMetadata(file));
};

export default upload;
