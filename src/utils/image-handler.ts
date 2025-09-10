import { Request, Response, NextFunction } from "express";
import {
	uploadSingle,
	uploadMultiple,
	validateImageFile,
	validateImageFiles,
	cleanupTempFiles,
	getImageMetadata,
	getImagesMetadata,
} from "./image-uploader";
import {
	uploadToCloudinary,
	uploadMultipleToCloudinary,
	UploadOptions,
	UploadResult,
	validateImageDimensions,
} from "./cloudinary-uploader";
import { BadRequestError } from "./error";

export interface ImageUploadConfig {
	field: string;
	multiple?: boolean;
	maxCount?: number;
	folder?: string;
	allowedTypes?: string[];
	maxSize?: number;
	minWidth?: number;
	minHeight?: number;
	maxWidth?: number;
	maxHeight?: number;
	uploadToCloud?: boolean;
}

export interface ImageUploadResult {
	success: boolean;
	files?: any[];
	cloudUrls?: string[];
	error?: string;
}

// Middleware factory for handling image uploads
export const createImageUploadMiddleware = (config: ImageUploadConfig) => {
	const multerMiddleware = config.multiple
		? uploadMultiple(config.field, config.maxCount)
		: uploadSingle(config.field);

	return async (req: Request, res: Response, next: NextFunction) => {
		multerMiddleware(req, res, async (err) => {
			if (err) {
				return next(new BadRequestError(err.message));
			}

			try {
				const files = req.files as Express.Multer.File[] | undefined;
				const file = req.file as Express.Multer.File | undefined;

				console.log("Image upload middleware - files:", files);
				console.log("Image upload middleware - file:", file);
				console.log("Image upload middleware - config:", config);

				const uploadedFiles = files || (file ? [file] : []);

				console.log("Image upload middleware - uploadedFiles:", uploadedFiles);

				if (uploadedFiles.length === 0) {
					console.log("No files uploaded, continuing...");
					return next();
				}

				// Validate files
				if (!validateImageFiles(uploadedFiles)) {
					cleanupTempFiles(uploadedFiles);
					return next(new BadRequestError("Invalid image files"));
				}

				// Validate dimensions if specified
				for (const uploadedFile of uploadedFiles) {
					console.log(
						"Validating dimensions for file:",
						uploadedFile.originalname
					);
					const dimensionValidation = validateImageDimensions(
						uploadedFile,
						config.minWidth,
						config.minHeight,
						config.maxWidth,
						config.maxHeight
					);

					console.log("Dimension validation result:", dimensionValidation);

					if (!dimensionValidation.valid) {
						cleanupTempFiles(uploadedFiles);
						return next(
							new BadRequestError(
								dimensionValidation.error || "Invalid image dimensions"
							)
						);
					}
				}

				// Upload to Cloudflare if enabled
				if (config.uploadToCloud) {
					const uploadOptions: UploadOptions = {
						folder: config.folder,
						allowedTypes: config.allowedTypes,
						maxSize: config.maxSize,
					};

					const uploadResults = await uploadMultipleToCloudinary(
						uploadedFiles,
						uploadOptions
					);

					// Check for upload failures
					const failedUploads = uploadResults.filter(
						(result) => !result.success
					);
					if (failedUploads.length > 0) {
						return next(
							new BadRequestError(`Upload failed: ${failedUploads[0].error}`)
						);
					}

					// Attach upload results to request
					req.uploadResults = uploadResults;
					req.cloudUrls = uploadResults
						.map((result) => result.url)
						.filter(Boolean) as string[];
				} else {
					// Just attach file metadata
					req.fileMetadata = config.multiple
						? getImagesMetadata(uploadedFiles)
						: getImageMetadata(uploadedFiles[0]);
				}

				next();
			} catch (error) {
				const uploadedFiles =
					(req.files as Express.Multer.File[]) || (req.file ? [req.file] : []);
				cleanupTempFiles(uploadedFiles);
				next(error);
			}
		});
	};
};

// Convenience functions for common upload scenarios
export const uploadProductImages = createImageUploadMiddleware({
	field: "images",
	multiple: true,
	maxCount: 10,
	folder: "products",
	maxSize: 5 * 1024 * 1024, // 5MB
	uploadToCloud: true,
});

export const uploadProductThumbnail = createImageUploadMiddleware({
	field: "thumbnail",
	multiple: false,
	folder: "products/thumbnails",
	maxSize: 2 * 1024 * 1024, // 2MB
	minWidth: 200,
	minHeight: 200,
	uploadToCloud: true,
});

export const uploadUserAvatar = createImageUploadMiddleware({
	field: "avatar",
	multiple: false,
	folder: "avatars",
	maxSize: 5 * 1024 * 1024, // 5MB (same as products)
	uploadToCloud: true,
});

// Specialized middleware for user avatar updates
export const uploadUserAvatarUpdate = createImageUploadMiddleware({
	field: "avatar",
	multiple: false,
	folder: "avatars",
	maxSize: 5 * 1024 * 1024, // 5MB
	uploadToCloud: true,
});

export const uploadBrandLogo = createImageUploadMiddleware({
	field: "logo",
	multiple: false,
	folder: "brands",
	maxSize: 1 * 1024 * 1024, // 1MB
	uploadToCloud: true,
});

export const uploadCategoryImage = createImageUploadMiddleware({
	field: "image",
	multiple: false,
	folder: "categories",
	maxSize: 2 * 1024 * 1024, // 2MB
	uploadToCloud: true,
});

// Helper function to process uploaded images
export const processUploadedImages = async (
	files: Express.Multer.File[],
	options: UploadOptions = {}
): Promise<ImageUploadResult> => {
	try {
		if (!validateImageFiles(files)) {
			cleanupTempFiles(files);
			return {
				success: false,
				error: "Invalid image files",
			};
		}

		const uploadResults = await uploadMultipleToCloudinary(files, options);
		const failedUploads = uploadResults.filter((result) => !result.success);

		if (failedUploads.length > 0) {
			return {
				success: false,
				error: `Upload failed: ${failedUploads[0].error}`,
			};
		}

		return {
			success: true,
			files: getImagesMetadata(files),
			cloudUrls: uploadResults
				.map((result) => result.url)
				.filter(Boolean) as string[],
		};
	} catch (error) {
		cleanupTempFiles(files);
		return {
			success: false,
			error:
				error instanceof Error ? error.message : "Upload processing failed",
		};
	}
};

// Extend Express Request interface
declare global {
	namespace Express {
		interface Request {
			uploadResults?: UploadResult[];
			cloudUrls?: string[];
			fileMetadata?: any;
		}
	}
}

export default {
	createImageUploadMiddleware,
	uploadProductImages,
	uploadProductThumbnail,
	uploadUserAvatar,
	uploadUserAvatarUpdate,
	uploadBrandLogo,
	uploadCategoryImage,
	processUploadedImages,
};
