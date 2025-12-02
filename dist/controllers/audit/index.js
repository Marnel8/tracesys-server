"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditStatusesController = exports.getAuditSeveritiesController = exports.getAuditCategoriesController = exports.deleteOldAuditLogsController = exports.exportAuditLogsController = exports.getAuditUsersController = exports.getAuditStatsController = exports.getAuditLogController = exports.getAuditLogsController = exports.createAuditLogController = void 0;
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const audit_1 = require("../../data/audit.js");
/**
 * Create a new audit log entry
 */
const createAuditLogController = async (req, res) => {
    const { userId, sessionId, action, resource, resourceId, details, ipAddress, userAgent, severity = "low", category, status = "success", country, region, city, metadata, } = req.body;
    if (!action || !resource || !details || !ipAddress || !userAgent || !category) {
        throw new error_1.BadRequestError("Please provide all necessary audit log data.");
    }
    const auditData = {
        userId,
        sessionId,
        action,
        resource,
        resourceId,
        details,
        ipAddress,
        userAgent,
        severity,
        category,
        status,
        country,
        region,
        city,
        metadata,
    };
    const result = await (0, audit_1.createAuditLogData)(auditData);
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Audit log created successfully",
        data: result,
    });
};
exports.createAuditLogController = createAuditLogController;
/**
 * Get audit logs with filtering and pagination
 */
const getAuditLogsController = async (req, res) => {
    const { page = 1, limit = 10, search = "", category = "all", severity = "all", status = "all", userId = "all", startDate, endDate, } = req.query;
    // Extract instructorId if user is an instructor
    const instructorId = req.user?.role === "instructor" ? req.user.id : undefined;
    const result = await (0, audit_1.getAuditLogsData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
        category: category,
        severity: severity,
        status: status,
        userId: userId,
        startDate: startDate,
        endDate: endDate,
        instructorId,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Audit logs retrieved successfully",
        data: result,
    });
};
exports.getAuditLogsController = getAuditLogsController;
/**
 * Get audit log by ID
 */
const getAuditLogController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Audit log ID is required");
    }
    const auditLog = await (0, audit_1.findAuditLogById)(id);
    if (!auditLog) {
        throw new error_1.NotFoundError("Audit log not found");
    }
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Audit log retrieved successfully",
        data: auditLog,
    });
};
exports.getAuditLogController = getAuditLogController;
/**
 * Get audit statistics
 */
const getAuditStatsController = async (req, res) => {
    // Extract instructorId if user is an instructor
    const instructorId = req.user?.role === "instructor" ? req.user.id : undefined;
    const stats = await (0, audit_1.getAuditStatsData)(instructorId);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Audit statistics retrieved successfully",
        data: stats,
    });
};
exports.getAuditStatsController = getAuditStatsController;
/**
 * Get users for audit filtering
 */
const getAuditUsersController = async (req, res) => {
    // Extract instructorId if user is an instructor
    const instructorId = req.user?.role === "instructor" ? req.user.id : undefined;
    const users = await (0, audit_1.getAuditUsersData)(instructorId);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Users retrieved successfully",
        data: users,
    });
};
exports.getAuditUsersController = getAuditUsersController;
/**
 * Export audit logs to CSV
 */
const exportAuditLogsController = async (req, res) => {
    const { search = "", category = "all", severity = "all", status = "all", userId = "all", startDate, endDate, } = req.query;
    // Extract instructorId if user is an instructor
    const instructorId = req.user?.role === "instructor" ? req.user.id : undefined;
    const result = await (0, audit_1.exportAuditLogsData)({
        search: search,
        category: category,
        severity: severity,
        status: status,
        userId: userId,
        startDate: startDate,
        endDate: endDate,
        instructorId,
    });
    // Set headers for CSV download
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
    // Convert to CSV string
    const csvContent = [
        result.headers.join(","),
        ...result.rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    res.status(http_status_codes_1.StatusCodes.OK).send(csvContent);
};
exports.exportAuditLogsController = exportAuditLogsController;
/**
 * Delete old audit logs
 */
const deleteOldAuditLogsController = async (req, res) => {
    const { daysOld = 90 } = req.body;
    if (daysOld < 30) {
        throw new error_1.BadRequestError("Cannot delete logs newer than 30 days");
    }
    const deletedCount = await (0, audit_1.deleteOldAuditLogsData)(Number(daysOld));
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: `Successfully deleted ${deletedCount} old audit logs`,
        data: { deletedCount },
    });
};
exports.deleteOldAuditLogsController = deleteOldAuditLogsController;
/**
 * Get audit log categories
 */
const getAuditCategoriesController = async (req, res) => {
    const categories = [
        { value: "security", label: "Security" },
        { value: "academic", label: "Academic" },
        { value: "submission", label: "Submission" },
        { value: "attendance", label: "Attendance" },
        { value: "user_management", label: "User Management" },
        { value: "system", label: "System" },
    ];
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Audit categories retrieved successfully",
        data: categories,
    });
};
exports.getAuditCategoriesController = getAuditCategoriesController;
/**
 * Get audit log severities
 */
const getAuditSeveritiesController = async (req, res) => {
    const severities = [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
    ];
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Audit severities retrieved successfully",
        data: severities,
    });
};
exports.getAuditSeveritiesController = getAuditSeveritiesController;
/**
 * Get audit log statuses
 */
const getAuditStatusesController = async (req, res) => {
    const statuses = [
        { value: "success", label: "Success" },
        { value: "failed", label: "Failed" },
        { value: "warning", label: "Warning" },
    ];
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Audit statuses retrieved successfully",
        data: statuses,
    });
};
exports.getAuditStatusesController = getAuditStatusesController;
