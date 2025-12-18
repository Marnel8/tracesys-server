"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRequirementTemplateData = exports.updateRequirementTemplateData = exports.findRequirementTemplateByID = exports.getRequirementTemplatesData = exports.createRequirementTemplateData = void 0;
const sequelize_1 = require("sequelize");
const requirement_template_1 = __importDefault(require("../db/models/requirement-template.js"));
const requirement_1 = __importDefault(require("../db/models/requirement.js"));
const createRequirementTemplateData = async (data) => {
    try {
        // Prevent duplicate titles (case-insensitive)
        const existing = await requirement_template_1.default.findOne({
            where: {
                title: { [sequelize_1.Op.like]: data.title },
            },
        });
        if (existing) {
            throw new Error("Requirement template with this title already exists");
        }
        const template = await requirement_template_1.default.create({
            ...data,
            priority: data.priority || "medium", // Default to "medium" if not provided
            appliesToSchoolAffiliated: data.appliesToSchoolAffiliated !== undefined ? data.appliesToSchoolAffiliated : true, // Default to true if not provided
            allowedFileTypes: data.allowedFileTypes?.join(",") ?? null,
        });
        return { template };
    }
    catch (error) {
        throw new Error(error.message || "Failed to create requirement template");
    }
};
exports.createRequirementTemplateData = createRequirementTemplateData;
const getRequirementTemplatesData = async (params) => {
    try {
        const { page, limit, search, status } = params;
        const offset = (page - 1) * limit;
        const whereClause = {};
        if (search) {
            whereClause[sequelize_1.Op.or] = [
                { title: { [sequelize_1.Op.like]: `%${search}%` } },
                { description: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        if (status && status !== "all") {
            whereClause.isActive = status === "active";
        }
        const { count, rows } = await requirement_template_1.default.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [["createdAt", "DESC"]],
        });
        const totalPages = Math.ceil(count / limit);
        return {
            requirementTemplates: rows,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit,
            },
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to retrieve requirement templates");
    }
};
exports.getRequirementTemplatesData = getRequirementTemplatesData;
const findRequirementTemplateByID = async (id) => {
    try {
        const template = await requirement_template_1.default.findByPk(id);
        return template;
    }
    catch (error) {
        throw new Error(error.message || "Failed to find requirement template");
    }
};
exports.findRequirementTemplateByID = findRequirementTemplateByID;
const updateRequirementTemplateData = async (id, updateData) => {
    try {
        const template = await requirement_template_1.default.findByPk(id);
        if (!template) {
            throw new Error("Requirement template not found");
        }
        // Prevent duplicate titles when updating
        if (updateData.title && updateData.title !== template.title) {
            const existing = await requirement_template_1.default.findOne({
                where: {
                    title: { [sequelize_1.Op.like]: updateData.title },
                    id: { [sequelize_1.Op.ne]: id },
                },
            });
            if (existing) {
                throw new Error("Requirement template with this title already exists");
            }
        }
        const persistedUpdate = { ...updateData };
        if (Array.isArray(updateData.allowedFileTypes)) {
            persistedUpdate.allowedFileTypes = updateData.allowedFileTypes.join(",");
        }
        await template.update(persistedUpdate);
        return template;
    }
    catch (error) {
        throw new Error(error.message || "Failed to update requirement template");
    }
};
exports.updateRequirementTemplateData = updateRequirementTemplateData;
const deleteRequirementTemplateData = async (id) => {
    try {
        const template = await requirement_template_1.default.findByPk(id);
        if (!template) {
            throw new Error("Requirement template not found");
        }
        // Prevent deletion if there are associated requirements
        const requirementCount = await requirement_1.default.count({ where: { templateId: id } });
        if (requirementCount > 0) {
            throw new Error("Cannot delete template with existing requirements");
        }
        await template.destroy();
        return true;
    }
    catch (error) {
        throw new Error(error.message || "Failed to delete requirement template");
    }
};
exports.deleteRequirementTemplateData = deleteRequirementTemplateData;
