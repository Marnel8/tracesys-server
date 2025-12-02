"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequirementStatsData = exports.rejectRequirementData = exports.approveRequirementData = exports.updateRequirementFileData = exports.findRequirementByID = exports.getRequirementsData = exports.createRequirementFromTemplateData = void 0;
const sequelize_1 = require("sequelize");
const requirement_1 = __importDefault(require("../db/models/requirement.js"));
const requirement_template_1 = __importDefault(require("../db/models/requirement-template.js"));
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
    if (search) {
        where[sequelize_1.Op.or] = [
            { title: { [sequelize_1.Op.like]: `%${search}%` } },
            { description: { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    if (status && status !== "all") {
        where.status = status;
    }
    if (studentId) {
        where.studentId = studentId;
    }
    if (practicumId) {
        where.practicumId = practicumId;
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
