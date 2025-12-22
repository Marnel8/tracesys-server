"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDeleteRequirementTemplateData = exports.restoreRequirementTemplateData = exports.archiveRequirementTemplateData = exports.getArchivedRequirementTemplatesData = exports.deleteRequirementTemplateData = exports.updateRequirementTemplateData = exports.findRequirementTemplateByID = exports.getRequirementTemplatesData = exports.createRequirementTemplateData = void 0;
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
        const { page, limit, search, status, createdBy } = params;
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
        if (createdBy) {
            whereClause.createdBy = createdBy;
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
        // Prevent deletion if there are associated active (non-archived) requirements
        // that have been worked on (not just pending with no files)
        // Try to filter by isActive if the column exists, otherwise count all requirements
        let requirementsWithWork = 0;
        try {
            // Count requirements that are not just "pending with no files"
            // (i.e., have files uploaded, or have been submitted/approved/rejected/in-progress)
            // Only count active (non-archived) requirements
            requirementsWithWork = await requirement_1.default.count({
                where: {
                    templateId: id,
                    [sequelize_1.Op.and]: [
                        {
                            [sequelize_1.Op.or]: [
                                { isActive: true },
                                { isActive: { [sequelize_1.Op.is]: null } } // Include null for backward compatibility
                            ]
                        },
                        {
                            [sequelize_1.Op.or]: [
                                // Has file uploaded
                                { fileUrl: { [sequelize_1.Op.ne]: null } },
                                { fileName: { [sequelize_1.Op.ne]: null } },
                                // Or status is not pending
                                { status: { [sequelize_1.Op.ne]: "pending" } }
                            ]
                        }
                    ]
                }
            });
        }
        catch (queryError) {
            // If isActive column doesn't exist yet, fall back to checking all requirements
            if (queryError.message && queryError.message.includes("isActive")) {
                requirementsWithWork = await requirement_1.default.count({
                    where: {
                        templateId: id,
                        [sequelize_1.Op.or]: [
                            // Has file uploaded
                            { fileUrl: { [sequelize_1.Op.ne]: null } },
                            { fileName: { [sequelize_1.Op.ne]: null } },
                            // Or status is not pending
                            { status: { [sequelize_1.Op.ne]: "pending" } }
                        ]
                    }
                });
            }
            else {
                throw queryError; // Re-throw if it's a different error
            }
        }
        if (requirementsWithWork > 0) {
            throw new Error("Cannot delete template with existing requirements that have been worked on");
        }
        // If we reach here, there are either no requirements or only pending requirements with no files
        // We can safely delete those pending requirements and then delete the template
        try {
            // Delete all pending requirements with no files for this template
            // Only delete active ones (archived ones will be handled separately if needed)
            await requirement_1.default.destroy({
                where: {
                    templateId: id,
                    status: "pending",
                    [sequelize_1.Op.and]: [
                        { fileUrl: { [sequelize_1.Op.is]: null } },
                        { fileName: { [sequelize_1.Op.is]: null } },
                        {
                            [sequelize_1.Op.or]: [
                                { isActive: true },
                                { isActive: { [sequelize_1.Op.is]: null } } // Include null for backward compatibility
                            ]
                        }
                    ]
                }
            });
        }
        catch (deleteError) {
            // If isActive column doesn't exist, try without it
            if (deleteError.message && deleteError.message.includes("isActive")) {
                // Just try to delete pending requirements without isActive filter
                await requirement_1.default.destroy({
                    where: {
                        templateId: id,
                        status: "pending",
                        [sequelize_1.Op.and]: [
                            { fileUrl: { [sequelize_1.Op.is]: null } },
                            { fileName: { [sequelize_1.Op.is]: null } }
                        ]
                    }
                });
            }
            else {
                // If deletion fails, log but don't block template deletion
                console.warn("Failed to delete pending requirements:", deleteError.message);
            }
        }
        await template.destroy();
        return true;
    }
    catch (error) {
        throw new Error(error.message || "Failed to delete requirement template");
    }
};
exports.deleteRequirementTemplateData = deleteRequirementTemplateData;
// Archive helpers for requirement templates
const getArchivedRequirementTemplatesData = async (params) => {
    const { page, limit, search, createdBy } = params;
    const offset = (page - 1) * limit;
    const whereClause = {
        isActive: false,
    };
    if (search) {
        whereClause[sequelize_1.Op.or] = [
            { title: { [sequelize_1.Op.like]: `%${search}%` } },
            { description: { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    if (createdBy) {
        whereClause.createdBy = createdBy;
    }
    const { count, rows } = await requirement_template_1.default.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [["updatedAt", "DESC"]],
    });
    const items = rows.map((template) => ({
        id: template.id,
        type: "requirementTemplate",
        name: template.title,
        deletedAt: template.updatedAt.toISOString(),
        deletedBy: null,
        meta: {
            category: template.category,
            isRequired: template.isRequired,
        },
        raw: template.toJSON(),
    }));
    return {
        items,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: limit,
        },
    };
};
exports.getArchivedRequirementTemplatesData = getArchivedRequirementTemplatesData;
const archiveRequirementTemplateData = async (id) => {
    const template = await requirement_template_1.default.findByPk(id);
    if (!template) {
        throw new Error("Requirement template not found");
    }
    if (template.isActive === false) {
        return template;
    }
    await template.update({ isActive: false });
    return template;
};
exports.archiveRequirementTemplateData = archiveRequirementTemplateData;
const restoreRequirementTemplateData = async (id) => {
    const template = await requirement_template_1.default.findByPk(id);
    if (!template || template.isActive === true) {
        throw new Error("Archived requirement template not found");
    }
    await template.update({ isActive: true });
    return template;
};
exports.restoreRequirementTemplateData = restoreRequirementTemplateData;
const hardDeleteRequirementTemplateData = async (id) => {
    // Reuse existing deletion rules; only allow hard delete for already-archived templates
    const template = await requirement_template_1.default.findByPk(id);
    if (!template || template.isActive !== false) {
        throw new Error("Archived requirement template not found");
    }
    // Delegate to existing delete logic (will still enforce safety checks)
    return (0, exports.deleteRequirementTemplateData)(id);
};
exports.hardDeleteRequirementTemplateData = hardDeleteRequirementTemplateData;
