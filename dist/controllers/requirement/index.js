"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDeleteRequirementController = exports.archiveRequirementController = exports.restoreRequirementController = exports.getArchivedRequirementsController = exports.updateRequirementDueDateController = exports.getStudentRequirementCommentsController = exports.getRequirementCommentsController = exports.createRequirementCommentController = exports.getRequirementStatsController = exports.rejectRequirementController = exports.approveRequirementController = exports.submitRequirementController = exports.getRequirementController = exports.getInstructorRequirementsController = exports.getRequirementsController = exports.createRequirementFromTemplateController = void 0;
const path_1 = __importDefault(require("path"));
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const requirement_1 = __importDefault(require("../../db/models/requirement.js"));
const requirement_template_1 = __importDefault(require("../../db/models/requirement-template.js"));
const file_attachment_1 = __importDefault(require("../../db/models/file-attachment.js"));
const requirement_2 = require("../../data/requirement.js");
const audit_logger_1 = require("../../utils/audit-logger.js");
const createRequirementFromTemplateController = async (req, res) => {
    const { templateId, studentId, practicumId = null, dueDate = null } = req.body;
    if (!templateId || !studentId) {
        throw new error_1.BadRequestError("templateId and studentId are required");
    }
    // Convert ISO string to Date object if provided
    const dueDateValue = dueDate ? new Date(dueDate) : null;
    const requirement = await (0, requirement_2.createRequirementFromTemplateData)({
        templateId,
        studentId,
        practicumId,
        instructorId: req.user?.role === "instructor" ? req.user.id : null,
        dueDate: dueDateValue,
    });
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Requirement created from template",
        data: requirement,
    });
};
exports.createRequirementFromTemplateController = createRequirementFromTemplateController;
const getRequirementsController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all", studentId, practicumId, includePending } = req.query;
    const authUser = req.user;
    let instructorId;
    if (authUser?.role === "instructor") {
        // Instructors are always scoped to their own requirements
        instructorId = authUser.id;
    }
    else if (authUser?.role === "student" && req.query.instructorId) {
        // Students can optionally scope to a specific instructor's requirements
        instructorId = String(req.query.instructorId);
    }
    const result = await (0, requirement_2.getRequirementsData)({
        page: Number(page),
        limit: Number(limit),
        search: search || "",
        status: status || "all",
        studentId: studentId || undefined,
        practicumId: practicumId || undefined,
        instructorId,
        includePending: includePending === "true" || includePending === true,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, message: "Requirements retrieved", data: result });
};
exports.getRequirementsController = getRequirementsController;
const getInstructorRequirementsController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all", studentId, practicumId } = req.query;
    const result = await (0, requirement_2.getRequirementsData)({
        page: Number(page),
        limit: Number(limit),
        search: search || "",
        status: status || "all",
        studentId: studentId || undefined,
        practicumId: practicumId || undefined,
        instructorId: req.user?.id,
    });
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ success: true, message: "Instructor requirements retrieved", data: result });
};
exports.getInstructorRequirementsController = getInstructorRequirementsController;
const getRequirementController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Requirement ID is required");
    const requirement = await (0, requirement_2.findRequirementByID)(id);
    if (!requirement)
        throw new error_1.NotFoundError("Requirement not found");
    res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, data: requirement });
};
exports.getRequirementController = getRequirementController;
const submitRequirementController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Requirement ID is required");
    const studentId = req.user?.id;
    if (!studentId)
        throw new error_1.BadRequestError("Missing authenticated user context");
    const requirement = await requirement_1.default.findByPk(id, { include: [requirement_template_1.default] });
    if (!requirement)
        throw new error_1.NotFoundError("Requirement not found");
    if (requirement.studentId !== studentId) {
        throw new error_1.UnauthorizedError("You can only submit your own requirements");
    }
    const file = req.file;
    if (!file)
        throw new error_1.BadRequestError("No file uploaded");
    const template = requirement.template;
    if (!template)
        throw new error_1.BadRequestError("Requirement has no template attached");
    // Validate file type and size
    const allowed = (template.allowedFileTypes || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
    const ext = path_1.default.extname(file.originalname).replace(".", "").toLowerCase();
    if (allowed.length && !allowed.includes(ext)) {
        throw new error_1.BadRequestError(`Only ${allowed.join(", ")} files are allowed`);
    }
    if (template.maxFileSize && file.size > template.maxFileSize * 1024 * 1024) {
        throw new error_1.BadRequestError(`Max file size is ${template.maxFileSize}MB`);
    }
    const fileUrl = `/uploads/${path_1.default.basename(file.path)}`;
    const updated = await (0, requirement_2.updateRequirementFileData)(id, {
        fileUrl,
        fileName: file.originalname,
        fileSize: file.size,
    });
    await file_attachment_1.default.create({
        fileName: path_1.default.basename(file.path),
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        path: file.path,
        url: fileUrl,
        uploadedBy: studentId,
        entityType: "requirement",
        entityId: updated.id,
        isPublic: false,
    });
    // Log audit event
    await (0, audit_logger_1.logStudentAction)(req, {
        action: "Requirement Submitted",
        resource: "Requirements",
        resourceId: updated.id,
        details: `Student submitted requirement: ${template.title || "Unknown"}`,
        category: "submission",
        severity: "low",
        status: "success",
        metadata: {
            requirementId: updated.id,
            templateId: template.id,
            templateName: template.title,
        },
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, message: "Requirement submitted", data: updated });
};
exports.submitRequirementController = submitRequirementController;
const approveRequirementController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Requirement ID is required");
    const approverId = req.user?.id;
    if (!approverId)
        throw new error_1.BadRequestError("Missing authenticated user context");
    const { feedback = null } = req.body || {};
    const result = await (0, requirement_2.approveRequirementData)(id, approverId, feedback);
    // Log audit event
    await (0, audit_logger_1.logStudentAction)(req, {
        action: "Requirement Approved",
        resource: "Requirements",
        resourceId: id,
        details: `Instructor approved requirement${feedback ? ` with feedback` : ""}`,
        category: "submission",
        severity: "medium",
        status: "success",
        metadata: {
            requirementId: id,
            approverId,
            hasFeedback: !!feedback,
        },
    });
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ success: true, message: "Requirement approved", data: result });
};
exports.approveRequirementController = approveRequirementController;
const rejectRequirementController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Requirement ID is required");
    const approverId = req.user?.id;
    if (!approverId)
        throw new error_1.BadRequestError("Missing authenticated user context");
    const { reason } = req.body || {};
    if (!reason?.trim())
        throw new error_1.BadRequestError("Rejection reason is required");
    const result = await (0, requirement_2.rejectRequirementData)(id, approverId, reason);
    // Log audit event
    await (0, audit_logger_1.logStudentAction)(req, {
        action: "Requirement Rejected",
        resource: "Requirements",
        resourceId: id,
        details: `Instructor rejected requirement: ${reason}`,
        category: "submission",
        severity: "medium",
        status: "warning",
        metadata: {
            requirementId: id,
            approverId,
            rejectionReason: reason,
        },
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, message: "Requirement rejected", data: result });
};
exports.rejectRequirementController = rejectRequirementController;
const getRequirementStatsController = async (req, res) => {
    const { studentId } = req.params;
    if (!studentId)
        throw new error_1.BadRequestError("Student ID is required");
    const stats = await (0, requirement_2.getRequirementStatsData)(studentId);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Requirement stats retrieved",
        data: stats
    });
};
exports.getRequirementStatsController = getRequirementStatsController;
const createRequirementCommentController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Requirement ID is required");
    const userId = req.user?.id;
    if (!userId)
        throw new error_1.BadRequestError("Missing authenticated user context");
    const { content, isPrivate = false } = req.body || {};
    if (!content?.trim())
        throw new error_1.BadRequestError("Comment content is required");
    const comment = await (0, requirement_2.createRequirementCommentData)(id, userId, content.trim(), isPrivate);
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Comment created",
        data: comment,
    });
};
exports.createRequirementCommentController = createRequirementCommentController;
const getRequirementCommentsController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Requirement ID is required");
    const comments = await (0, requirement_2.getRequirementCommentsData)(id);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Comments retrieved",
        data: comments,
    });
};
exports.getRequirementCommentsController = getRequirementCommentsController;
const getStudentRequirementCommentsController = async (req, res) => {
    const { studentId } = req.params;
    if (!studentId)
        throw new error_1.BadRequestError("Student ID is required");
    // Verify the student is requesting their own comments
    const requestingUserId = req.user?.id;
    if (requestingUserId !== studentId && req.user?.role !== "instructor") {
        throw new error_1.UnauthorizedError("You can only view your own comments");
    }
    const { lastCheckTime } = req.query;
    const comments = await (0, requirement_2.getStudentUnreadCommentsData)(studentId, lastCheckTime || null);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Comments retrieved",
        data: comments,
    });
};
exports.getStudentRequirementCommentsController = getStudentRequirementCommentsController;
const updateRequirementDueDateController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Requirement ID is required");
    // Only instructors can update due dates
    if (req.user?.role !== "instructor") {
        throw new error_1.UnauthorizedError("Only instructors can update requirement due dates");
    }
    const { dueDate } = req.body;
    // Convert ISO string to Date object if provided, or null if empty string/null
    const dueDateValue = dueDate && dueDate !== "" ? new Date(dueDate) : null;
    const result = await (0, requirement_2.updateRequirementDueDateData)(id, dueDateValue);
    // Log audit event
    await (0, audit_logger_1.logStudentAction)(req, {
        action: "Requirement Due Date Updated",
        resource: "Requirements",
        resourceId: id,
        details: `Instructor updated due date${dueDateValue ? ` to ${dueDateValue.toISOString()}` : " (removed)"}`,
        category: "submission",
        severity: "low",
        status: "success",
        metadata: {
            requirementId: id,
            dueDate: dueDateValue?.toISOString() || null,
        },
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Requirement due date updated",
        data: result,
    });
};
exports.updateRequirementDueDateController = updateRequirementDueDateController;
const getArchivedRequirementsController = async (req, res) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const result = await (0, requirement_2.getArchivedRequirementsData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        data: result,
    });
};
exports.getArchivedRequirementsController = getArchivedRequirementsController;
const restoreRequirementController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Requirement ID is required.");
    }
    const requirement = await (0, requirement_2.restoreRequirementData)(id);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Requirement restored successfully",
        data: requirement,
    });
};
exports.restoreRequirementController = restoreRequirementController;
const archiveRequirementController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new error_1.BadRequestError("Requirement ID is required.");
        }
        await (0, requirement_2.archiveRequirementData)(id);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Requirement archived successfully",
        });
    }
    catch (error) {
        res.status(error.statusCode || http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || "Failed to archive requirement",
        });
    }
};
exports.archiveRequirementController = archiveRequirementController;
const hardDeleteRequirementController = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            throw new error_1.BadRequestError("Requirement ID is required.");
        }
        await (0, requirement_2.hardDeleteRequirementData)(id);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Requirement permanently deleted successfully",
        });
    }
    catch (error) {
        res.status(error.statusCode || http_status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: error.message || "Failed to permanently delete requirement",
        });
    }
};
exports.hardDeleteRequirementController = hardDeleteRequirementController;
