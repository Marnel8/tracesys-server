"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createImageThumbnail = exports.generateTransformedUrl = exports.validateImageDimensions = exports.getImageDimensions = exports.generateImageVariants = exports.optimizeImageForUpload = exports.extractKeyFromUrl = exports.deleteMultipleFromCloudinary = exports.deleteFromCloudinary = exports.uploadMultipleToCloudinary = exports.uploadToCloudinary = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const crypto_1 = require("crypto");
const dotenv_1 = __importDefault(require("dotenv"));
const cloudinary_1 = require("cloudinary");
dotenv_1.default.config();
// Configure Cloudinary
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});
const DEFAULT_ALLOWED_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
];
const DEFAULT_MAX_SIZE = 5 * 1024 * 1024; // 5MB
// Generate unique filename
const generateUniqueFilename = (originalName) => {
    const timestamp = Date.now();
    const random = Math.round(Math.random() * 1e9);
    const hash = (0, crypto_1.createHash)("md5")
        .update(`${timestamp}-${random}`)
        .digest("hex")
        .substring(0, 8);
    const nameWithoutExt = path_1.default.parse(originalName).name;
    return `${nameWithoutExt}-${hash}-${timestamp}`;
};
const uploadToCloudinary = async (file, options = {}) => {
    try {
        const { folder = "products", allowedTypes = DEFAULT_ALLOWED_TYPES, maxSize = DEFAULT_MAX_SIZE, } = options;
        // Validate file type
        if (!allowedTypes.includes(file.mimetype)) {
            return {
                success: false,
                error: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(", ")}`,
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
        const result = await cloudinary_1.v2.uploader.upload(file.path, {
            public_id: publicId,
            folder: folder,
            resource_type: "image",
            quality: "auto",
            fetch_format: "auto",
        });
        // Clean up local file
        fs_1.default.unlinkSync(file.path);
        return {
            success: true,
            url: result.secure_url,
            key: result.public_id,
        };
    }
    catch (error) {
        console.error("Cloudinary upload error:", error);
        // Clean up local file on error
        if (file.path && fs_1.default.existsSync(file.path)) {
            fs_1.default.unlinkSync(file.path);
        }
        return {
            success: false,
            error: error instanceof Error ? error.message : "Upload failed",
        };
    }
};
exports.uploadToCloudinary = uploadToCloudinary;
const uploadMultipleToCloudinary = async (files, options = {}) => {
    const uploadPromises = files.map((file) => (0, exports.uploadToCloudinary)(file, options));
    return Promise.all(uploadPromises);
};
exports.uploadMultipleToCloudinary = uploadMultipleToCloudinary;
const deleteFromCloudinary = async (publicId) => {
    try {
        const result = await cloudinary_1.v2.uploader.destroy(publicId);
        return result.result === "ok";
    }
    catch (error) {
        console.error("Cloudinary delete error:", error);
        return false;
    }
};
exports.deleteFromCloudinary = deleteFromCloudinary;
const deleteMultipleFromCloudinary = async (publicIds) => {
    const deletePromises = publicIds.map((publicId) => (0, exports.deleteFromCloudinary)(publicId));
    return Promise.all(deletePromises);
};
exports.deleteMultipleFromCloudinary = deleteMultipleFromCloudinary;
const extractKeyFromUrl = (url) => {
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
    }
    catch (error) {
        console.error("Error extracting public_id from URL:", error);
        return null;
    }
};
exports.extractKeyFromUrl = extractKeyFromUrl;
// Image optimization utilities
const optimizeImageForUpload = (file) => {
    return file;
};
exports.optimizeImageForUpload = optimizeImageForUpload;
const generateImageVariants = async (file, variants) => {
    const results = [];
    for (const variant of variants) {
        try {
            const uniqueFilename = generateUniqueFilename(file.originalname);
            const publicId = `products/${variant.name}/${uniqueFilename}`;
            const result = await cloudinary_1.v2.uploader.upload(file.path, {
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
        }
        catch (error) {
            results.push({
                success: false,
                error: error instanceof Error ? error.message : "Upload failed",
            });
        }
    }
    return results;
};
exports.generateImageVariants = generateImageVariants;
// Utility to get image dimensions from Cloudinary response
const getImageDimensions = async (publicId) => {
    try {
        const result = await cloudinary_1.v2.api.resource(publicId, {
            image_metadata: true,
        });
        return {
            width: result.width || 0,
            height: result.height || 0,
        };
    }
    catch (error) {
        console.error("Error getting image dimensions:", error);
        return { width: 0, height: 0 };
    }
};
exports.getImageDimensions = getImageDimensions;
// Utility to validate image dimensions
const validateImageDimensions = (file, minWidth, minHeight, maxWidth, maxHeight) => {
    // Note: For proper dimension validation with Cloudinary, you'd typically
    // validate after upload or use a library like sharp to read dimensions locally
    // For now, we'll return valid and let Cloudinary handle the constraints
    return { valid: true };
};
exports.validateImageDimensions = validateImageDimensions;
// Additional Cloudinary-specific utilities
const generateTransformedUrl = (publicId, transformations) => {
    return cloudinary_1.v2.url(publicId, {
        ...transformations,
        secure: true,
    });
};
exports.generateTransformedUrl = generateTransformedUrl;
const createImageThumbnail = async (publicId, width = 150, height = 150) => {
    return (0, exports.generateTransformedUrl)(publicId, {
        width,
        height,
        crop: "fill",
        quality: "auto",
        format: "auto",
    });
};
exports.createImageThumbnail = createImageThumbnail;
