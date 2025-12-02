"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportStatsController = exports.rejectReportController = exports.approveReportController = exports.submitReportController = exports.listNarrativeReportsController = exports.createNarrativeReportController = exports.createReportController = exports.getReportController = exports.getInstructorReportsController = exports.getReportsController = exports.createReportFromTemplateController = void 0;
const path_1 = __importDefault(require("path"));
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const file_attachment_1 = __importDefault(require("../../db/models/file-attachment.js"));
const report_1 = __importDefault(require("../../db/models/report.js"));
const report_2 = require("../../data/report.js");
const report_3 = require("../../data/report.js");
const image_uploader_1 = require("../../utils/image-uploader.js");
const audit_logger_1 = require("../../utils/audit-logger.js");
const createReportFromTemplateController = async (req, res) => {
    const { templateId, studentId, practicumId = null, dueDate = null } = req.body;
    if (!templateId || !studentId) {
        throw new error_1.BadRequestError("templateId and studentId are required");
    }
    const report = await (0, report_2.createReportFromTemplateData)({
        templateId,
        studentId,
        practicumId,
        dueDate,
    });
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Report created from template",
        data: report,
    });
};
exports.createReportFromTemplateController = createReportFromTemplateController;
const getReportsController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all", type = "all", studentId, practicumId, weekNumber, startDate, endDate, } = req.query;
    const result = await (0, report_2.getReportsData)({
        page: Number(page),
        limit: Number(limit),
        search: search || "",
        status: status || "all",
        type: type || "all",
        studentId: studentId || undefined,
        practicumId: practicumId || undefined,
        weekNumber: typeof weekNumber !== "undefined" ? Number(weekNumber) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        instructorId: req.user?.role === "instructor" ? req.user.id : undefined,
    });
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ success: true, message: "Reports retrieved", data: result });
};
exports.getReportsController = getReportsController;
const getInstructorReportsController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all", type = "all", studentId, practicumId, weekNumber, startDate, endDate, } = req.query;
    const result = await (0, report_2.getReportsData)({
        page: Number(page),
        limit: Number(limit),
        search: search || "",
        status: status || "all",
        type: type || "all",
        studentId: studentId || undefined,
        practicumId: practicumId || undefined,
        weekNumber: typeof weekNumber !== "undefined" ? Number(weekNumber) : undefined,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        instructorId: req.user?.id,
    });
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ success: true, message: "Instructor reports retrieved", data: result });
};
exports.getInstructorReportsController = getInstructorReportsController;
const getReportController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Report ID is required");
    const report = await (0, report_2.findReportByID)(id);
    if (!report)
        throw new error_1.NotFoundError("Report not found");
    res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, data: report });
};
exports.getReportController = getReportController;
const createReportController = async (req, res) => {
    const studentId = req.user?.id;
    if (!studentId)
        throw new error_1.BadRequestError("Missing authenticated user context");
    const { title, content = "", type, weekNumber = null, startDate = null, endDate = null, practicumId = null, dueDate = null } = req.body || {};
    if (!title?.trim())
        throw new error_1.BadRequestError("Title is required");
    if (!type || !["weekly", "monthly", "final", "narrative"].includes(type)) {
        throw new error_1.BadRequestError("Invalid or missing report type");
    }
    // Validate date range if provided
    if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            throw new error_1.BadRequestError("Invalid date format for startDate or endDate");
        }
        if (start > end) {
            throw new error_1.BadRequestError("startDate must be before or equal to endDate");
        }
    }
    else if (startDate || endDate) {
        throw new error_1.BadRequestError("Both startDate and endDate must be provided together");
    }
    // weekNumber is optional even for weekly reports to keep submission simple
    // startDate and endDate are new fields for date range selection
    const report = await (0, report_3.createReportData)({
        studentId,
        practicumId,
        title,
        content,
        type,
        weekNumber,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        dueDate,
    });
    res.status(http_status_codes_1.StatusCodes.CREATED).json({ success: true, message: "Report created", data: report });
};
exports.createReportController = createReportController;
// Narrative-specific convenience endpoints
const createNarrativeReportController = async (req, res) => {
    const studentId = req.user?.id;
    if (!studentId)
        throw new error_1.BadRequestError("Missing authenticated user context");
    const { title, content = "", practicumId = null, dueDate = null, hoursLogged, activities, learnings, challenges, } = req.body || {};
    if (!title?.trim())
        throw new error_1.BadRequestError("Title is required");
    // Optional file upload handling (same rules as standard report submit)
    const file = req.file;
    const fileUrl = file ? `/uploads/${path_1.default.basename(file.path)}` : null;
    if (file) {
        const maxSizeMB = 20;
        const allowedDocExts = ["pdf", "doc", "docx"]; // docs allowed, images validated below
        const ext = path_1.default.extname(file.originalname).replace(".", "").toLowerCase();
        const isImage = file.mimetype?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
        if (isImage) {
            if (!(0, image_uploader_1.validateImageFile)(file)) {
                throw new error_1.BadRequestError("Invalid image type. Allowed: jpg, jpeg, png, webp, gif");
            }
        }
        else {
            if (!allowedDocExts.includes(ext)) {
                throw new error_1.BadRequestError(`Invalid file type. Only ${[...allowedDocExts, "jpg", "jpeg", "png", "webp", "gif"].join(", ")} are allowed`);
            }
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
            throw new error_1.BadRequestError(`Max file size is ${maxSizeMB}MB`);
        }
    }
    // Create as draft first
    const report = await (0, report_3.createNarrativeReportData)({
        studentId,
        practicumId,
        title,
        content,
        dueDate,
    });
    // Immediately submit the narrative report if any meaningful payload exists
    const updated = await (0, report_2.updateReportSubmissionData)(report.id, {
        title,
        content,
        fileUrl,
        weekNumber: undefined,
        hoursLogged: typeof hoursLogged !== "undefined" ? Number(hoursLogged) : undefined,
        activities,
        learnings,
        challenges,
    });
    if (file) {
        await file_attachment_1.default.create({
            fileName: path_1.default.basename(file.path),
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            url: fileUrl,
            uploadedBy: studentId,
            entityType: "report",
            entityId: updated.id,
            isPublic: false,
        });
    }
    // Log audit event
    await (0, audit_logger_1.logStudentAction)(req, {
        action: "Narrative Report Submitted",
        resource: "Reports",
        resourceId: updated.id,
        details: `Student submitted narrative report: ${updated.title || "Untitled"}`,
        category: "submission",
        severity: "low",
        status: "success",
        metadata: {
            reportId: updated.id,
            reportType: "narrative",
            hasFile: !!file,
        },
    });
    res.status(http_status_codes_1.StatusCodes.CREATED).json({ success: true, message: "Narrative report created", data: updated });
};
exports.createNarrativeReportController = createNarrativeReportController;
const listNarrativeReportsController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all", studentId, practicumId } = req.query;
    const result = await (0, report_3.getNarrativeReportsData)({
        page: Number(page),
        limit: Number(limit),
        search: search || "",
        status: status || "all",
        studentId: studentId || undefined,
        practicumId: practicumId || undefined,
        instructorId: req.user?.role === "instructor" ? req.user.id : undefined,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, message: "Narrative reports retrieved", data: result });
};
exports.listNarrativeReportsController = listNarrativeReportsController;
const submitReportController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Report ID is required");
    const studentId = req.user?.id;
    if (!studentId)
        throw new error_1.BadRequestError("Missing authenticated user context");
    const report = await report_1.default.findByPk(id);
    if (!report)
        throw new error_1.NotFoundError("Report not found");
    if (report.studentId !== studentId) {
        throw new error_1.UnauthorizedError("You can only submit your own reports");
    }
    const file = req.file;
    const fileUrl = file ? `/uploads/${path_1.default.basename(file.path)}` : null;
    // Validate file if present
    if (file) {
        const maxSizeMB = 20; // default 20MB cap for report files
        const allowedDocExts = ["pdf", "doc", "docx"]; // allow common document types
        const ext = path_1.default.extname(file.originalname).replace(".", "").toLowerCase();
        const isImage = file.mimetype?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);
        if (isImage) {
            // Use image-uploader validation for images
            if (!(0, image_uploader_1.validateImageFile)(file)) {
                throw new error_1.BadRequestError("Invalid image type. Allowed: jpg, jpeg, png, webp, gif");
            }
        }
        else {
            // Validate document extensions
            if (!allowedDocExts.includes(ext)) {
                throw new error_1.BadRequestError(`Invalid file type. Only ${[...allowedDocExts, "jpg", "jpeg", "png", "webp", "gif"].join(", ")} are allowed`);
            }
        }
        // Validate max size for all files
        if (file.size > maxSizeMB * 1024 * 1024) {
            throw new error_1.BadRequestError(`Max file size is ${maxSizeMB}MB`);
        }
    }
    const { title, content, weekNumber, startDate, endDate, hoursLogged, activities, learnings, challenges, } = req.body || {};
    if (!file && !content && !title) {
        throw new error_1.BadRequestError("Provide content or a file to submit the report");
    }
    // Validate date range if provided
    let parsedStartDate = undefined;
    let parsedEndDate = undefined;
    if (startDate || endDate) {
        if (!startDate || !endDate) {
            throw new error_1.BadRequestError("Both startDate and endDate must be provided together");
        }
        parsedStartDate = new Date(startDate);
        parsedEndDate = new Date(endDate);
        if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
            throw new error_1.BadRequestError("Invalid date format for startDate or endDate");
        }
        if (parsedStartDate > parsedEndDate) {
            throw new error_1.BadRequestError("startDate must be before or equal to endDate");
        }
    }
    const updated = await (0, report_2.updateReportSubmissionData)(id, {
        title,
        content,
        fileUrl,
        weekNumber: typeof weekNumber !== "undefined" ? Number(weekNumber) : undefined,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        hoursLogged: typeof hoursLogged !== "undefined" ? Number(hoursLogged) : undefined,
        activities,
        learnings,
        challenges,
    });
    if (file) {
        await file_attachment_1.default.create({
            fileName: path_1.default.basename(file.path),
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            path: file.path,
            url: fileUrl,
            uploadedBy: studentId,
            entityType: "report",
            entityId: updated.id,
            isPublic: false,
        });
    }
    // Log audit event
    await (0, audit_logger_1.logStudentAction)(req, {
        action: "Report Submitted",
        resource: "Reports",
        resourceId: updated.id,
        details: `Student submitted ${updated.type || "report"}: ${updated.title || "Untitled"}`,
        category: "submission",
        severity: "low",
        status: "success",
        metadata: {
            reportId: updated.id,
            reportType: updated.type,
            hasFile: !!file,
        },
    });
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ success: true, message: "Report submitted", data: updated });
};
exports.submitReportController = submitReportController;
const approveReportController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Report ID is required");
    const approverId = req.user?.id;
    if (!approverId)
        throw new error_1.BadRequestError("Missing authenticated user context");
    const { feedback = null, rating = null } = req.body || {};
    const result = await (0, report_2.approveReportData)(id, approverId, feedback, rating);
    // Log audit event
    await (0, audit_logger_1.logStudentAction)(req, {
        action: "Report Approved",
        resource: "Reports",
        resourceId: id,
        details: `Instructor approved report${feedback ? ` with feedback` : ""}${rating ? ` (Rating: ${rating})` : ""}`,
        category: "submission",
        severity: "medium",
        status: "success",
        metadata: {
            reportId: id,
            approverId,
            hasFeedback: !!feedback,
            rating,
        },
    });
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ success: true, message: "Report approved", data: result });
};
exports.approveReportController = approveReportController;
const rejectReportController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Report ID is required");
    const approverId = req.user?.id;
    if (!approverId)
        throw new error_1.BadRequestError("Missing authenticated user context");
    const { reason } = req.body || {};
    if (!reason?.trim())
        throw new error_1.BadRequestError("Rejection reason is required");
    const result = await (0, report_2.rejectReportData)(id, approverId, reason);
    // Log audit event
    await (0, audit_logger_1.logStudentAction)(req, {
        action: "Report Rejected",
        resource: "Reports",
        resourceId: id,
        details: `Instructor rejected report: ${reason}`,
        category: "submission",
        severity: "medium",
        status: "warning",
        metadata: {
            reportId: id,
            approverId,
            rejectionReason: reason,
        },
    });
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ success: true, message: "Report rejected", data: result });
};
exports.rejectReportController = rejectReportController;
const getReportStatsController = async (req, res) => {
    const { studentId } = req.params;
    if (!studentId)
        throw new error_1.BadRequestError("Student ID is required");
    const stats = await (0, report_2.getReportStatsData)(studentId);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Report stats retrieved",
        data: stats,
    });
};
exports.getReportStatsController = getReportStatsController;
