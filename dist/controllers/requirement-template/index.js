"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRequirementTemplateController = exports.updateRequirementTemplateController = exports.getRequirementTemplateController = exports.getRequirementTemplatesController = exports.createRequirementTemplateController = void 0;
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const path_1 = __importDefault(require("path"));
const requirement_template_1 = require("../../data/requirement-template.js");
const createRequirementTemplateController = async (req, res) => {
    const { title, description, category, priority, isRequired = true, instructions = null, allowedFileTypes = [], maxFileSize = null, isActive = true, } = req.body;
    if (!title || !description || !category || !priority) {
        throw new error_1.BadRequestError("Please provide all required fields.");
    }
    const createdBy = req.user?.id;
    if (!createdBy) {
        throw new error_1.BadRequestError("Missing authenticated user context");
    }
    // Handle optional uploaded file (field: templateFile)
    let fileMeta = {};
    const file = req.file;
    if (file) {
        // Enforce .docx files only
        const isDocxMime = file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const isDocxExt = path_1.default.extname(file.originalname).toLowerCase() === ".docx";
        if (!isDocxMime && !isDocxExt) {
            throw new error_1.BadRequestError("Only .docx template files are allowed");
        }
        fileMeta = {
            templateFileUrl: `/uploads/${path_1.default.basename(file.path)}`,
            templateFileName: file.originalname,
            templateFileType: file.mimetype,
            templateFileSize: file.size,
        };
    }
    const result = await (0, requirement_template_1.createRequirementTemplateData)({
        title,
        description,
        category,
        priority,
        isRequired,
        instructions,
        allowedFileTypes: ["DOCX"],
        maxFileSize,
        isActive,
        createdBy,
        ...fileMeta,
    });
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Requirement template created successfully",
        data: result,
    });
};
exports.createRequirementTemplateController = createRequirementTemplateController;
const getRequirementTemplatesController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;
    const result = await (0, requirement_template_1.getRequirementTemplatesData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
        status: status,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Requirement templates retrieved successfully",
        data: result,
    });
};
exports.getRequirementTemplatesController = getRequirementTemplatesController;
const getRequirementTemplateController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Template ID is required");
    }
    const template = await (0, requirement_template_1.findRequirementTemplateByID)(id);
    if (!template) {
        throw new error_1.NotFoundError("Requirement template not found");
    }
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Requirement template retrieved successfully",
        data: template,
    });
};
exports.getRequirementTemplateController = getRequirementTemplateController;
const updateRequirementTemplateController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Template ID is required");
    }
    const template = await (0, requirement_template_1.findRequirementTemplateByID)(id);
    if (!template) {
        throw new error_1.NotFoundError("Requirement template not found");
    }
    let update = { ...req.body };
    const file = req.file;
    if (file) {
        const isDocxMime = file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        const isDocxExt = path_1.default.extname(file.originalname).toLowerCase() === ".docx";
        if (!isDocxMime && !isDocxExt) {
            throw new error_1.BadRequestError("Only .docx template files are allowed");
        }
        update.templateFileUrl = `/uploads/${path_1.default.basename(file.path)}`;
        update.templateFileName = file.originalname;
        update.templateFileType = file.mimetype;
        update.templateFileSize = file.size;
    }
    // Force allowed file types to DOCX only
    update.allowedFileTypes = ["DOCX"];
    const result = await (0, requirement_template_1.updateRequirementTemplateData)(id, update);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Requirement template updated successfully",
        data: result,
    });
};
exports.updateRequirementTemplateController = updateRequirementTemplateController;
const deleteRequirementTemplateController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Template ID is required");
    }
    const template = await (0, requirement_template_1.findRequirementTemplateByID)(id);
    if (!template) {
        throw new error_1.NotFoundError("Requirement template not found");
    }
    await (0, requirement_template_1.deleteRequirementTemplateData)(id);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Requirement template deleted successfully",
    });
};
exports.deleteRequirementTemplateController = deleteRequirementTemplateController;
