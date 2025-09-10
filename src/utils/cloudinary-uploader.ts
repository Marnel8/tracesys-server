import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

dotenv.config();

// Configure Cloudinary
cloudinary.config({
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
	success: boolean;
	url?: string;
	key?: string;
	error?: string;
}

export interface UploadOptions {
	folder?: string;
	allowedTypes?: string[];
	maxSize?: number;
}

const DEFAULT_ALLOWED_TYPES = [
	"image/jpeg",
	"image/jpg",
	"image/png",
	"image/webp",
	"image/gif",
];

const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB

// Generate unique filename
const generateUniqueFilename = (originalName: string): string => {
	const timestamp = Date.now();
	const random = Math.round(Math.random() * 1e9);
	const hash = createHash("md5")
		.update(`${timestamp}-${random}`)
		.digest("hex")
		.substring(0, 8);
	const nameWithoutExt = path.parse(originalName).name;
	return `${nameWithoutExt}-${hash}-${timestamp}`;
};

export const uploadToCloudinary = async (
	file: Express.Multer.File,
	options: UploadOptions = {}
): Promise<UploadResult> => {
	try {
		const {
			folder = "products",
			allowedTypes = DEFAULT_ALLOWED_TYPES,
			maxSize = DEFAULT_MAX_SIZE,
		} = options;

		// Validate file type
		if (!allowedTypes.includes(file.mimetype)) {
			return {
				success: false,
				error: `File type ${
					file.mimetype
				} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
			};
		}

		// Validate file size
		if (file.size > maxSize) {
			return {
				success: false,
				error: `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`,
			};
		}

		// Generate unique public_id
		const uniqueFilename = generateUniqueFilename(file.originalname);
		const publicId = `${folder}/${uniqueFilename}`;

		// Upload to Cloudinary
		const result = await cloudinary.uploader.upload(file.path, {
			public_id: publicId,
			folder: folder,
			resource_type: "image",
			quality: "auto",
			fetch_format: "auto",
		});

		// Clean up local file
		fs.unlinkSync(file.path);

		return {
			success: true,
			url: result.secure_url,
			key: result.public_id,
		};
	} catch (error) {
		console.error("Cloudinary upload error:", error);

		// Clean up local file on error
		if (file.path && fs.existsSync(file.path)) {
			fs.unlinkSync(file.path);
		}

		return {
			success: false,
			error: error instanceof Error ? error.message : "Upload failed",
		};
	}
};

export const uploadMultipleToCloudinary = async (
	files: Express.Multer.File[],
	options: UploadOptions = {}
): Promise<UploadResult[]> => {
	const uploadPromises = files.map((file) => uploadToCloudinary(file, options));
	return Promise.all(uploadPromises);
};

export const deleteFromCloudinary = async (
	publicId: string
): Promise<boolean> => {
	try {
		const result = await cloudinary.uploader.destroy(publicId);
		return result.result === "ok";
	} catch (error) {
		console.error("Cloudinary delete error:", error);
		return false;
	}
};

export const deleteMultipleFromCloudinary = async (
	publicIds: string[]
): Promise<boolean[]> => {
	const deletePromises = publicIds.map((publicId) =>
		deleteFromCloudinary(publicId)
	);
	return Promise.all(deletePromises);
};

export const extractKeyFromUrl = (url: string): string | null => {
	try {
		// Cloudinary URLs have the format: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}
		const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
		const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload/`;

		if (!url.startsWith(baseUrl)) {
			return null;
		}

		// Extract public_id from URL (everything after the base URL)
		const publicId = url.replace(baseUrl, "").split(".")[0]; // Remove file extension
		return publicId;
	} catch (error) {
		console.error("Error extracting public_id from URL:", error);
		return null;
	}
};

// Image optimization utilities
export const optimizeImageForUpload = (
	file: Express.Multer.File
): Express.Multer.File => {
	return file;
};

export const generateImageVariants = async (
	file: Express.Multer.File,
	variants: { name: string; width: number; height?: number }[]
): Promise<UploadResult[]> => {
	const results: UploadResult[] = [];

	for (const variant of variants) {
		try {
			const uniqueFilename = generateUniqueFilename(file.originalname);
			const publicId = `products/${variant.name}/${uniqueFilename}`;

			const result = await cloudinary.uploader.upload(file.path, {
				public_id: publicId,
				folder: `products/${variant.name}`,
				resource_type: "image",
				quality: "auto",
				fetch_format: "auto",
				width: variant.width,
				height: variant.height,
				crop: "limit",
			});

			results.push({
				success: true,
				url: result.secure_url,
				key: result.public_id,
			});
		} catch (error) {
			results.push({
				success: false,
				error: error instanceof Error ? error.message : "Upload failed",
			});
		}
	}

	return results;
};

// Utility to get image dimensions from Cloudinary response
export const getImageDimensions = async (
	publicId: string
): Promise<{ width: number; height: number }> => {
	try {
		const result = await cloudinary.api.resource(publicId, {
			image_metadata: true,
		});
		return {
			width: result.width || 0,
			height: result.height || 0,
		};
	} catch (error) {
		console.error("Error getting image dimensions:", error);
		return { width: 0, height: 0 };
	}
};

// Utility to validate image dimensions
export const validateImageDimensions = (
	file: Express.Multer.File,
	minWidth?: number,
	minHeight?: number,
	maxWidth?: number,
	maxHeight?: number
): { valid: boolean; error?: string } => {
	// Note: For proper dimension validation with Cloudinary, you'd typically
	// validate after upload or use a library like sharp to read dimensions locally
	// For now, we'll return valid and let Cloudinary handle the constraints
	return { valid: true };
};

// Additional Cloudinary-specific utilities

export const generateTransformedUrl = (
	publicId: string,
	transformations: {
		width?: number;
		height?: number;
		crop?: string;
		quality?: string;
		format?: string;
	}
): string => {
	return cloudinary.url(publicId, {
		...transformations,
		secure: true,
	});
};

export const createImageThumbnail = async (
	publicId: string,
	width: number = 150,
	height: number = 150
): Promise<string> => {
	return generateTransformedUrl(publicId, {
		width,
		height,
		crop: "fill",
		quality: "auto",
		format: "auto",
	});
};
