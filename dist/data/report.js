"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportStatsData = exports.rejectReportData = exports.approveReportData = exports.updateReportSubmissionData = exports.findReportByID = exports.getStudentReportViewNotificationsData = exports.createReportViewData = exports.getNarrativeReportsData = exports.getReportsData = exports.createNarrativeReportData = exports.createReportData = exports.createReportFromTemplateData = void 0;
const sequelize_1 = require("sequelize");
const report_1 = __importDefault(require("../db/models/report.js"));
const report_template_1 = __importDefault(require("../db/models/report-template.js"));
const user_1 = __importDefault(require("../db/models/user.js"));
const practicum_1 = __importDefault(require("../db/models/practicum.js"));
const student_enrollment_1 = __importDefault(require("../db/models/student-enrollment.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
const report_view_1 = __importDefault(require("../db/models/report-view.js"));
const createReportFromTemplateData = async (params) => {
    const template = await report_template_1.default.findByPk(params.templateId);
    if (!template) {
        throw new Error("Report template not found");
    }
    const report = await report_1.default.create({
        studentId: params.studentId,
        templateId: template.id,
        practicumId: params.practicumId ?? null,
        title: template.title,
        content: template.content,
        type: template.type,
        status: "draft",
        dueDate: params.dueDate ?? null,
    });
    return report;
};
exports.createReportFromTemplateData = createReportFromTemplateData;
const createReportData = async (params) => {
    const report = await report_1.default.create({
        studentId: params.studentId,
        practicumId: params.practicumId ?? null,
        title: params.title,
        content: params.content ?? "",
        type: params.type,
        weekNumber: typeof params.weekNumber === "number" ? params.weekNumber : null,
        startDate: params.startDate ?? null,
        endDate: params.endDate ?? null,
        status: "draft",
        dueDate: params.dueDate ?? null,
    });
    return report;
};
exports.createReportData = createReportData;
// Convenience: narrative-specific creators and list helpers
const createNarrativeReportData = async (params) => {
    return (0, exports.createReportData)({
        studentId: params.studentId,
        practicumId: params.practicumId ?? null,
        title: params.title,
        content: params.content ?? "",
        type: "narrative",
        weekNumber: null,
        dueDate: params.dueDate ?? null,
    });
};
exports.createNarrativeReportData = createNarrativeReportData;
const getReportsData = async (params) => {
    const { page, limit, search, status, type, studentId, practicumId, weekNumber, startDate, endDate, instructorId } = params;
    const offset = (page - 1) * limit;
    const where = {};
    const andConditions = [];
    if (search) {
        andConditions.push({
            [sequelize_1.Op.or]: [
                { title: { [sequelize_1.Op.like]: `%${search}%` } },
                { content: { [sequelize_1.Op.like]: `%${search}%` } },
            ],
        });
    }
    if (status && status !== "all") {
        where.status = status;
    }
    if (type && type !== "all") {
        where.type = type;
    }
    if (studentId) {
        where.studentId = studentId;
    }
    if (practicumId) {
        where.practicumId = practicumId;
    }
    if (typeof weekNumber === "number") {
        where.weekNumber = weekNumber;
    }
    if (startDate && endDate) {
        // Filter reports where the report's date range overlaps with the query range
        // or where submittedDate falls within the query range
        // This handles both reports with date ranges and reports without (null dates)
        andConditions.push({
            [sequelize_1.Op.or]: [
                {
                    [sequelize_1.Op.and]: [
                        { startDate: { [sequelize_1.Op.ne]: null } }, // Ensure startDate is not null
                        { endDate: { [sequelize_1.Op.ne]: null } }, // Ensure endDate is not null
                        { startDate: { [sequelize_1.Op.lte]: endDate } },
                        { endDate: { [sequelize_1.Op.gte]: startDate } },
                    ],
                },
                {
                    submittedDate: {
                        [sequelize_1.Op.between]: [startDate, endDate],
                    },
                },
            ],
        });
    }
    else if (startDate) {
        andConditions.push({
            [sequelize_1.Op.or]: [
                {
                    [sequelize_1.Op.and]: [
                        { startDate: { [sequelize_1.Op.ne]: null } },
                        { startDate: { [sequelize_1.Op.gte]: startDate } },
                    ],
                },
                {
                    submittedDate: { [sequelize_1.Op.gte]: startDate },
                },
            ],
        });
    }
    else if (endDate) {
        andConditions.push({
            [sequelize_1.Op.or]: [
                {
                    [sequelize_1.Op.and]: [
                        { endDate: { [sequelize_1.Op.ne]: null } },
                        { endDate: { [sequelize_1.Op.lte]: endDate } },
                    ],
                },
                {
                    submittedDate: { [sequelize_1.Op.lte]: endDate },
                },
            ],
        });
    }
    // Combine all conditions with AND
    if (andConditions.length > 0) {
        where[sequelize_1.Op.and] = andConditions;
    }
    const { count, rows } = await report_1.default.findAndCountAll({
        where,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        subQuery: false,
        distinct: true,
        include: [
            { model: report_template_1.default, as: "template" },
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
            { model: user_1.default, as: "approver", attributes: ["id", "firstName", "lastName", "email", "role"] },
            { model: practicum_1.default, as: "practicum" },
        ],
    });
    return {
        reports: rows,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: limit,
        },
    };
};
exports.getReportsData = getReportsData;
const getNarrativeReportsData = async (params) => {
    return (0, exports.getReportsData)({
        ...params,
        type: "narrative",
    });
};
exports.getNarrativeReportsData = getNarrativeReportsData;
/**
 * Log that an instructor viewed a report (for student notifications)
 */
const createReportViewData = async (reportId, instructorId) => {
    const report = await report_1.default.findByPk(reportId);
    if (!report) {
        throw new Error("Report not found");
    }
    const view = await report_view_1.default.create({
        reportId,
        studentId: report.studentId,
        instructorId,
    });
    return view;
};
exports.createReportViewData = createReportViewData;
/**
 * Get report view notifications for a student, optionally filtered by lastCheckTime
 */
const getStudentReportViewNotificationsData = async (studentId, lastCheckTime) => {
    const where = { studentId };
    if (lastCheckTime) {
        where.createdAt = { [sequelize_1.Op.gt]: new Date(lastCheckTime) };
    }
    const views = await report_view_1.default.findAll({
        where,
        include: [
            {
                model: report_1.default,
                as: "report",
                attributes: ["id", "title", "type", "status", "submittedDate"],
            },
            {
                model: user_1.default,
                as: "instructor",
                attributes: ["id", "firstName", "lastName", "email", "role"],
            },
        ],
        order: [["createdAt", "DESC"]],
    });
    return views;
};
exports.getStudentReportViewNotificationsData = getStudentReportViewNotificationsData;
const findReportByID = async (id) => {
    const report = await report_1.default.findByPk(id, {
        include: [
            { model: report_template_1.default, as: "template" },
            { model: user_1.default, as: "student", attributes: ["id", "firstName", "lastName", "email", "role"] },
            { model: user_1.default, as: "approver", attributes: ["id", "firstName", "lastName", "email", "role"] },
            { model: practicum_1.default, as: "practicum" },
        ],
    });
    return report;
};
exports.findReportByID = findReportByID;
const updateReportSubmissionData = async (id, updates) => {
    const report = await report_1.default.findByPk(id);
    if (!report)
        throw new Error("Report not found");
    await report.update({
        content: updates.content ?? report.content,
        title: updates.title ?? report.title,
        fileUrl: updates.fileUrl ?? report.fileUrl ?? null,
        weekNumber: typeof updates.weekNumber === "number" ? updates.weekNumber : report.weekNumber,
        startDate: updates.startDate ?? report.startDate ?? null,
        endDate: updates.endDate ?? report.endDate ?? null,
        hoursLogged: typeof updates.hoursLogged === "number" ? updates.hoursLogged : report.hoursLogged,
        activities: updates.activities ?? report.activities ?? null,
        learnings: updates.learnings ?? report.learnings ?? null,
        challenges: updates.challenges ?? report.challenges ?? null,
        submittedDate: new Date(),
        status: "submitted",
    });
    return report;
};
exports.updateReportSubmissionData = updateReportSubmissionData;
const approveReportData = async (id, approverId, feedback, rating) => {
    const report = await report_1.default.findByPk(id);
    if (!report)
        throw new Error("Report not found");
    await report.update({
        status: "approved",
        approvedBy: approverId,
        approvedDate: new Date(),
        feedback: feedback ?? report.feedback ?? null,
        rating: typeof rating === "number" ? rating : report.rating,
    });
    return report;
};
exports.approveReportData = approveReportData;
const rejectReportData = async (id, approverId, reason) => {
    if (!reason?.trim())
        throw new Error("Rejection reason is required");
    const report = await report_1.default.findByPk(id);
    if (!report)
        throw new Error("Report not found");
    await report.update({
        status: "rejected",
        approvedBy: approverId,
        approvedDate: null,
        feedback: reason,
    });
    return report;
};
exports.rejectReportData = rejectReportData;
const getReportStatsData = async (studentId) => {
    const allReports = await report_1.default.findAndCountAll({
        where: { studentId },
    });
    const reports = allReports.rows || [];
    const total = reports.length;
    const approved = reports.filter((r) => r.status === "approved").length;
    const submitted = reports.filter((r) => r.status === "submitted").length;
    const rejected = reports.filter((r) => r.status === "rejected").length;
    const draft = reports.filter((r) => r.status === "draft").length;
    return {
        total,
        approved,
        submitted,
        rejected,
        draft,
    };
};
exports.getReportStatsData = getReportStatsData;
