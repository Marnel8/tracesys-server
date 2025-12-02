"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processUploadedImages = exports.uploadCategoryImage = exports.uploadBrandLogo = exports.uploadUserAvatarUpdate = exports.uploadUserAvatar = exports.uploadProductThumbnail = exports.uploadProductImages = exports.createImageUploadMiddleware = void 0;
const image_uploader_1 = require("./image-uploader.js");
const cloudinary_uploader_1 = require("./cloudinary-uploader.js");
const error_1 = require("./error.js");
// Middleware factory for handling image uploads
const createImageUploadMiddleware = (config) => {
    const multerMiddleware = config.multiple
        ? (0, image_uploader_1.uploadMultiple)(config.field, config.maxCount)
        : (0, image_uploader_1.uploadSingle)(config.field);
    return async (req, res, next) => {
        multerMiddleware(req, res, async (err) => {
            if (err) {
                return next(new error_1.BadRequestError(err.message));
            }
            try {
                const files = req.files;
                const file = req.file;
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
                if (!(0, image_uploader_1.validateImageFiles)(uploadedFiles)) {
                    (0, image_uploader_1.cleanupTempFiles)(uploadedFiles);
                    return next(new error_1.BadRequestError("Invalid image files"));
                }
                // Validate dimensions if specified
                for (const uploadedFile of uploadedFiles) {
                    console.log("Validating dimensions for file:", uploadedFile.originalname);
                    const dimensionValidation = (0, cloudinary_uploader_1.validateImageDimensions)(uploadedFile, config.minWidth, config.minHeight, config.maxWidth, config.maxHeight);
                    console.log("Dimension validation result:", dimensionValidation);
                    if (!dimensionValidation.valid) {
                        (0, image_uploader_1.cleanupTempFiles)(uploadedFiles);
                        return next(new error_1.BadRequestError(dimensionValidation.error || "Invalid image dimensions"));
                    }
                }
                // Upload to Cloudflare if enabled
                if (config.uploadToCloud) {
                    const uploadOptions = {
                        folder: config.folder,
                        allowedTypes: config.allowedTypes,
                        maxSize: config.maxSize,
                    };
                    const uploadResults = await (0, cloudinary_uploader_1.uploadMultipleToCloudinary)(uploadedFiles, uploadOptions);
                    // Check for upload failures
                    const failedUploads = uploadResults.filter((result) => !result.success);
                    if (failedUploads.length > 0) {
                        return next(new error_1.BadRequestError(`Upload failed: ${failedUploads[0].error}`));
                    }
                    // Attach upload results to request
                    req.uploadResults = uploadResults;
                    req.cloudUrls = uploadResults
                        .map((result) => result.url)
                        .filter(Boolean);
                }
                else {
                    // Just attach file metadata
                    req.fileMetadata = config.multiple
                        ? (0, image_uploader_1.getImagesMetadata)(uploadedFiles)
                        : (0, image_uploader_1.getImageMetadata)(uploadedFiles[0]);
                }
                next();
            }
            catch (error) {
                const uploadedFiles = req.files || (req.file ? [req.file] : []);
                (0, image_uploader_1.cleanupTempFiles)(uploadedFiles);
                next(error);
            }
        });
    };
};
exports.createImageUploadMiddleware = createImageUploadMiddleware;
// Convenience functions for common upload scenarios
exports.uploadProductImages = (0, exports.createImageUploadMiddleware)({
    field: "images",
    multiple: true,
    maxCount: 10,
    folder: "products",
    maxSize: 5 * 1024 * 1024, // 5MB
    uploadToCloud: true,
});
exports.uploadProductThumbnail = (0, exports.createImageUploadMiddleware)({
    field: "thumbnail",
    multiple: false,
    folder: "products/thumbnails",
    maxSize: 2 * 1024 * 1024, // 2MB
    minWidth: 200,
    minHeight: 200,
    uploadToCloud: true,
});
exports.uploadUserAvatar = (0, exports.createImageUploadMiddleware)({
    field: "avatar",
    multiple: false,
    folder: "avatars",
    maxSize: 5 * 1024 * 1024, // 5MB (same as products)
    uploadToCloud: true,
});
// Specialized middleware for user avatar updates
exports.uploadUserAvatarUpdate = (0, exports.createImageUploadMiddleware)({
    field: "avatar",
    multiple: false,
    folder: "avatars",
    maxSize: 5 * 1024 * 1024, // 5MB
    uploadToCloud: true,
});
exports.uploadBrandLogo = (0, exports.createImageUploadMiddleware)({
    field: "logo",
    multiple: false,
    folder: "brands",
    maxSize: 1 * 1024 * 1024, // 1MB
    uploadToCloud: true,
});
exports.uploadCategoryImage = (0, exports.createImageUploadMiddleware)({
    field: "image",
    multiple: false,
    folder: "categories",
    maxSize: 2 * 1024 * 1024, // 2MB
    uploadToCloud: true,
});
// Helper function to process uploaded images
const processUploadedImages = async (files, options = {}) => {
    try {
        if (!(0, image_uploader_1.validateImageFiles)(files)) {
            (0, image_uploader_1.cleanupTempFiles)(files);
            return {
                success: false,
                error: "Invalid image files",
            };
        }
        const uploadResults = await (0, cloudinary_uploader_1.uploadMultipleToCloudinary)(files, options);
        const failedUploads = uploadResults.filter((result) => !result.success);
        if (failedUploads.length > 0) {
            return {
                success: false,
                error: `Upload failed: ${failedUploads[0].error}`,
            };
        }
        return {
            success: true,
            files: (0, image_uploader_1.getImagesMetadata)(files),
            cloudUrls: uploadResults
                .map((result) => result.url)
                .filter(Boolean),
        };
    }
    catch (error) {
        (0, image_uploader_1.cleanupTempFiles)(files);
        return {
            success: false,
            error: error instanceof Error ? error.message : "Upload processing failed",
        };
    }
};
exports.processUploadedImages = processUploadedImages;
exports.default = {
    createImageUploadMiddleware: exports.createImageUploadMiddleware,
    uploadProductImages: exports.uploadProductImages,
    uploadProductThumbnail: exports.uploadProductThumbnail,
    uploadUserAvatar: exports.uploadUserAvatar,
    uploadUserAvatarUpdate: exports.uploadUserAvatarUpdate,
    uploadBrandLogo: exports.uploadBrandLogo,
    uploadCategoryImage: exports.uploadCategoryImage,
    processUploadedImages: exports.processUploadedImages,
};
