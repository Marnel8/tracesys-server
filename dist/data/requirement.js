"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentUnreadCommentsData = exports.getRequirementCommentsData = exports.createRequirementCommentData = exports.getRequirementStatsData = exports.updateRequirementDueDateData = exports.rejectRequirementData = exports.approveRequirementData = exports.updateRequirementFileData = exports.findRequirementByID = exports.getRequirementsData = exports.createRequirementFromTemplateData = void 0;
const sequelize_1 = require("sequelize");
const requirement_1 = __importDefault(require("../db/models/requirement.js"));
const requirement_template_1 = __importDefault(require("../db/models/requirement-template.js"));
const requirement_comment_1 = __importDefault(require("../db/models/requirement-comment.js"));
const user_1 = __importDefault(require("../db/models/user.js"));
const student_enrollment_1 = __importDefault(require("../db/models/student-enrollment.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
const createRequirementFromTemplateData = async (params) => {
    const template = await requirement_template_1.default.findByPk(params.templateId);
    if (!template) {
        throw new Error("Requirement template not found");
    }
    const requirement = await requirement_1.default.create({
        studentId: params.studentId,
        templateId: template.id,
        practicumId: params.practicumId ?? null,
        title: template.title,
        description: template.description,
        category: template.category,
        priority: template.priority,
        status: "pending",
        dueDate: params.dueDate ?? null,
    });
    return requirement;
};
exports.createRequirementFromTemplateData = createRequirementFromTemplateData;
const getRequirementsData = async (params) => {
    const { page, limit, search, status, studentId, practicumId, instructorId } = params;
    const offset = (page - 1) * limit;
    const where = {};
    const andConditions = [];
    if (search) {
        andConditions.push({
            [sequelize_1.Op.or]: [
                { title: { [sequelize_1.Op.like]: `%${search}%` } },
                { description: { [sequelize_1.Op.like]: `%${search}%` } },
                { fileName: { [sequelize_1.Op.like]: `%${search}%` } },
                { "$student.firstName$": { [sequelize_1.Op.like]: `%${search}%` } },
                { "$student.lastName$": { [sequelize_1.Op.like]: `%${search}%` } },
                { "$student.email$": { [sequelize_1.Op.like]: `%${search}%` } },
                { "$student.studentId$": { [sequelize_1.Op.like]: `%${search}%` } },
            ],
        });
    }
    if (status && status !== "all") {
        where.status = status;
    }
    else if (status === "all" && instructorId) {
        // When status is "all" and user is instructor, only show requirements with files
        // UNLESS includePending is true (for summary page where we need to see all requirements)
        // This ensures pagination works correctly (no empty pages) for the requirements list page
        const includePending = params.includePending;
        if (!includePending) {
            andConditions.push({
                [sequelize_1.Op.or]: [
                    { fileUrl: { [sequelize_1.Op.ne]: null } },
                    { fileName: { [sequelize_1.Op.ne]: null } },
                ],
            });
        }
    }
    // Combine all AND conditions
    if (andConditions.length > 0) {
        where[sequelize_1.Op.and] = andConditions;
    }
    if (studentId) {
        where.studentId = studentId;
    }
    if (practicumId) {
        where.practicumId = practicumId;
    }
    // Ensure students under this instructor have requirement rows for all active templates
    if (instructorId) {
        const [enrollments, templates] = await Promise.all([
            student_enrollment_1.default.findAll({
                attributes: ["studentId"],
                include: [
                    {
                        model: section_1.default,
                        as: "section",
                        attributes: [],
                        where: { instructorId },
                        required: true,
                    },
                ],
                raw: true,
            }),
            requirement_template_1.default.findAll({
                where: { isActive: true },
                raw: true,
            }),
        ]);
        const studentIds = Array.from(new Set(enrollments
            .map((e) => e.studentId)
            .filter((id) => !!id)));
        const templateIds = templates.map((t) => t.id).filter(Boolean);
        if (studentIds.length && templateIds.length) {
            const existing = await requirement_1.default.findAll({
                attributes: ["id", "studentId", "templateId", "createdAt"],
                where: {
                    studentId: { [sequelize_1.Op.in]: studentIds },
                    templateId: { [sequelize_1.Op.in]: templateIds },
                },
                raw: true,
            });
            // Deduplicate legacy rows: keep the newest per (studentId, templateId)
            if (existing.length > 0) {
                const seen = new Map();
                const toDelete = [];
                for (const row of existing) {
                    const key = `${row.studentId}:${row.templateId}`;
                    const createdAt = new Date(row.createdAt);
                    if (!seen.has(key)) {
                        seen.set(key, { id: row.id, createdAt });
                        continue;
                    }
                    const current = seen.get(key);
                    // Keep the newest record, delete the older one
                    if (createdAt > current.createdAt) {
                        toDelete.push(current.id);
                        seen.set(key, { id: row.id, createdAt });
                    }
                    else {
                        toDelete.push(row.id);
                    }
                }
                if (toDelete.length) {
                    await requirement_1.default.destroy({ where: { id: { [sequelize_1.Op.in]: toDelete } } });
                }
            }
            const existingSet = new Set(existing.map((r) => `${r.studentId}:${r.templateId}`));
            const toCreate = [];
            for (const sid of studentIds) {
                for (const tmpl of templates) {
                    const key = `${sid}:${tmpl.id}`;
                    if (existingSet.has(key))
                        continue;
                    toCreate.push({
                        studentId: sid,
                        templateId: tmpl.id,
                        title: tmpl.title,
                        description: tmpl.description,
                        category: tmpl.category,
                        priority: tmpl.priority,
                        status: "pending",
                        dueDate: null,
                    });
                }
            }
            if (toCreate.length) {
                await requirement_1.default.bulkCreate(toCreate);
            }
        }
    }
    const { count, rows } = await requirement_1.default.findAndCountAll({
        where,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        subQuery: false,
        distinct: true,
        include: [
            { model: requirement_template_1.default, as: "template" },
            {
                model: user_1.default,
                as: "student",
                attributes: ["id", "firstName", "lastName", "email", "role", "studentId"],
                required: true,
                include: [
                    {
                        model: student_enrollment_1.default,
                        as: "enrollments",
                        attributes: [],
                        required: !!instructorId,
                        include: [
                            {
                                model: section_1.default,
                                as: "section",
                                attributes: [],
                                required: !!instructorId,
                                where: instructorId ? { instructorId } : undefined,
                            },
                        ],
                    },
                ],
            },
        ],
    });
    return {
        requirements: rows,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: limit,
        },
    };
};
exports.getRequirementsData = getRequirementsData;
const findRequirementByID = async (id) => {
    const req = await requirement_1.default.findByPk(id, {
        include: [
            { model: requirement_template_1.default, as: "template" },
            { model: user_1.default, as: "student", attributes: ["id", "firstName", "lastName", "email", "role"] },
            { model: user_1.default, as: "approver", attributes: ["id", "firstName", "lastName", "email", "role"] },
            {
                model: requirement_comment_1.default,
                as: "comments",
                include: [
                    { model: user_1.default, as: "user", attributes: ["id", "firstName", "lastName", "email", "role"] },
                ],
                order: [["createdAt", "ASC"]],
            },
        ],
    });
    return req;
};
exports.findRequirementByID = findRequirementByID;
const updateRequirementFileData = async (id, file) => {
    const req = await requirement_1.default.findByPk(id);
    if (!req)
        throw new Error("Requirement not found");
    await req.update({
        fileUrl: file.fileUrl,
        fileName: file.fileName,
        fileSize: file.fileSize,
        submittedDate: new Date(),
        status: "submitted",
    });
    return req;
};
exports.updateRequirementFileData = updateRequirementFileData;
const approveRequirementData = async (id, approverId, feedback) => {
    const req = await requirement_1.default.findByPk(id);
    if (!req)
        throw new Error("Requirement not found");
    await req.update({
        status: "approved",
        approvedBy: approverId,
        approvedDate: new Date(),
        feedback: feedback ?? req.feedback ?? null,
    });
    return req;
};
exports.approveRequirementData = approveRequirementData;
const rejectRequirementData = async (id, approverId, reason) => {
    if (!reason?.trim())
        throw new Error("Rejection reason is required");
    const req = await requirement_1.default.findByPk(id);
    if (!req)
        throw new Error("Requirement not found");
    await req.update({
        status: "rejected",
        approvedBy: approverId,
        approvedDate: null,
        feedback: reason,
    });
    return req;
};
exports.rejectRequirementData = rejectRequirementData;
const updateRequirementDueDateData = async (id, dueDate) => {
    const req = await requirement_1.default.findByPk(id);
    if (!req)
        throw new Error("Requirement not found");
    await req.update({
        dueDate: dueDate,
    });
    return req;
};
exports.updateRequirementDueDateData = updateRequirementDueDateData;
const getRequirementStatsData = async (studentId) => {
    try {
        // Get all requirements for the student
        const allRequirements = await requirement_1.default.findAndCountAll({
            where: { studentId },
            include: [
                { model: requirement_template_1.default, as: "template" },
            ],
        });
        const requirements = allRequirements.rows || [];
        // Calculate stats
        const total = requirements.length;
        const approved = requirements.filter(r => r.status === 'approved').length;
        const pending = requirements.filter(r => r.status === 'pending').length;
        const submitted = requirements.filter(r => r.status === 'submitted').length;
        const rejected = requirements.filter(r => r.status === 'rejected').length;
        const inProgress = requirements.filter(r => r.status === 'in-progress').length;
        return {
            total,
            approved,
            pending,
            submitted,
            rejected,
            inProgress,
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to get requirement statistics");
    }
};
exports.getRequirementStatsData = getRequirementStatsData;
const createRequirementCommentData = async (requirementId, userId, content, isPrivate = false) => {
    const requirement = await requirement_1.default.findByPk(requirementId);
    if (!requirement) {
        throw new Error("Requirement not found");
    }
    const comment = await requirement_comment_1.default.create({
        requirementId,
        userId,
        content,
        isPrivate,
    });
    // Fetch the comment with user information
    const commentWithUser = await requirement_comment_1.default.findByPk(comment.id, {
        include: [
            { model: user_1.default, as: "user", attributes: ["id", "firstName", "lastName", "email", "role"] },
            { model: requirement_1.default, as: "requirement", attributes: ["id", "title", "studentId"] },
        ],
    });
    return commentWithUser;
};
exports.createRequirementCommentData = createRequirementCommentData;
const getRequirementCommentsData = async (requirementId) => {
    const requirement = await requirement_1.default.findByPk(requirementId);
    if (!requirement) {
        throw new Error("Requirement not found");
    }
    const comments = await requirement_comment_1.default.findAll({
        where: { requirementId, isPrivate: false },
        include: [
            { model: user_1.default, as: "user", attributes: ["id", "firstName", "lastName", "email", "role"] },
        ],
        order: [["createdAt", "ASC"]],
    });
    return comments;
};
exports.getRequirementCommentsData = getRequirementCommentsData;
const getStudentUnreadCommentsData = async (studentId, lastCheckTime) => {
    // Get all requirements for the student
    const requirements = await requirement_1.default.findAll({
        where: { studentId },
        attributes: ["id"],
        raw: true,
    });
    const requirementIds = requirements.map((r) => r.id);
    if (requirementIds.length === 0) {
        return [];
    }
    const whereConditions = {
        requirementId: { [sequelize_1.Op.in]: requirementIds },
        isPrivate: false,
    };
    // If lastCheckTime is provided, only get comments created after that time
    if (lastCheckTime) {
        whereConditions.createdAt = { [sequelize_1.Op.gt]: new Date(lastCheckTime) };
    }
    const comments = await requirement_comment_1.default.findAll({
        where: whereConditions,
        include: [
            { model: user_1.default, as: "user", attributes: ["id", "firstName", "lastName", "email", "role"] },
            {
                model: requirement_1.default,
                as: "requirement",
                attributes: ["id", "title", "studentId"],
            },
        ],
        order: [["createdAt", "DESC"]],
    });
    return comments;
};
exports.getStudentUnreadCommentsData = getStudentUnreadCommentsData;
