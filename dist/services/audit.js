"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractRequestInfo = exports.exportAuditLogs = exports.deleteOldAuditLogs = exports.getAuditStats = exports.getAuditLogById = exports.getAuditLogs = exports.createAuditLog = void 0;
const audit_log_1 = __importDefault(require("../db/models/audit-log.js"));
const sequelize_1 = require("sequelize");
/**
 * Create a new audit log entry
 */
const createAuditLog = async (auditData) => {
    try {
        const auditLog = await audit_log_1.default.create({
            userId: auditData.userId || null,
            sessionId: auditData.sessionId || null,
            action: auditData.action,
            resource: auditData.resource,
            resourceId: auditData.resourceId || null,
            details: auditData.details,
            ipAddress: auditData.ipAddress,
            userAgent: auditData.userAgent,
            severity: auditData.severity,
            category: auditData.category,
            status: auditData.status,
            country: auditData.country || null,
            region: auditData.region || null,
            city: auditData.city || null,
            metadata: auditData.metadata ? JSON.stringify(auditData.metadata) : null,
        });
        return auditLog;
    }
    catch (error) {
        console.error("Error creating audit log:", error);
        throw new Error("Failed to create audit log");
    }
};
exports.createAuditLog = createAuditLog;
/**
 * Get audit logs with filtering and pagination
 */
const getAuditLogs = async (filters = {}) => {
    const { page = 1, limit = 10, search = "", category, severity, status, userId, startDate, endDate, } = filters;
    const offset = (page - 1) * limit;
    const whereClause = {};
    // Search filter
    if (search) {
        whereClause[sequelize_1.Op.or] = [
            { action: { [sequelize_1.Op.like]: `%${search}%` } },
            { resource: { [sequelize_1.Op.like]: `%${search}%` } },
            { details: { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    // Category filter
    if (category && category !== "all") {
        whereClause.category = category;
    }
    // Severity filter
    if (severity && severity !== "all") {
        whereClause.severity = severity;
    }
    // Status filter
    if (status && status !== "all") {
        whereClause.status = status;
    }
    // User filter
    if (userId && userId !== "all") {
        whereClause.userId = userId;
    }
    // Date range filter
    if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) {
            whereClause.createdAt[sequelize_1.Op.gte] = new Date(startDate);
        }
        if (endDate) {
            whereClause.createdAt[sequelize_1.Op.lte] = new Date(endDate);
        }
    }
    const { count, rows } = await audit_log_1.default.findAndCountAll({
        where: whereClause,
        include: [
            {
                model: require("../db/models/user.js").default,
                as: "user",
                attributes: ["id", "firstName", "lastName", "email", "role"],
            },
        ],
        order: [["createdAt", "DESC"]],
        limit: Number(limit),
        offset: Number(offset),
    });
    return {
        auditLogs: rows,
        pagination: {
            total: count,
            page: Number(page),
            limit: Number(limit),
            totalPages: Math.ceil(count / Number(limit)),
        },
    };
};
exports.getAuditLogs = getAuditLogs;
/**
 * Get audit log by ID
 */
const getAuditLogById = async (id) => {
    try {
        const auditLog = await audit_log_1.default.findByPk(id, {
            include: [
                {
                    model: require("../db/models/user.js").default,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "role"],
                },
            ],
        });
        return auditLog;
    }
    catch (error) {
        console.error("Error fetching audit log:", error);
        throw new Error("Failed to fetch audit log");
    }
};
exports.getAuditLogById = getAuditLogById;
/**
 * Get audit statistics
 */
const getAuditStats = async () => {
    try {
        const { Op } = require("sequelize");
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        // Total activities
        const totalActivities = await audit_log_1.default.count();
        // Security events
        const securityEvents = await audit_log_1.default.count({
            where: { category: "security" },
        });
        // Failed actions
        const failedActions = await audit_log_1.default.count({
            where: { status: "failed" },
        });
        // Active users (last 30 days)
        const activeUsers = await audit_log_1.default.count({
            where: {
                createdAt: { [Op.gte]: thirtyDaysAgo },
                userId: { [Op.ne]: null },
            },
            distinct: true,
            col: "userId",
        });
        // Activities by category
        const activitiesByCategory = await audit_log_1.default.findAll({
            attributes: [
                "category",
                [require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"],
            ],
            group: ["category"],
            raw: true,
        });
        // Activities by severity
        const activitiesBySeverity = await audit_log_1.default.findAll({
            attributes: [
                "severity",
                [require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"],
            ],
            group: ["severity"],
            raw: true,
        });
        // Activities by status
        const activitiesByStatus = await audit_log_1.default.findAll({
            attributes: [
                "status",
                [require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"],
            ],
            group: ["status"],
            raw: true,
        });
        // Recent activities (last 10)
        const recentActivities = await audit_log_1.default.findAll({
            include: [
                {
                    model: require("../db/models/user.js").default,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "role"],
                },
            ],
            order: [["createdAt", "DESC"]],
            limit: 10,
        });
        // Convert to objects
        const categoryStats = {};
        activitiesByCategory.forEach((item) => {
            categoryStats[item.category] = parseInt(item.count);
        });
        const severityStats = {};
        activitiesBySeverity.forEach((item) => {
            severityStats[item.severity] = parseInt(item.count);
        });
        const statusStats = {};
        activitiesByStatus.forEach((item) => {
            statusStats[item.status] = parseInt(item.count);
        });
        return {
            totalActivities,
            securityEvents,
            failedActions,
            activeUsers,
            activitiesByCategory: categoryStats,
            activitiesBySeverity: severityStats,
            activitiesByStatus: statusStats,
            recentActivities: recentActivities,
        };
    }
    catch (error) {
        console.error("Error fetching audit stats:", error);
        throw new Error("Failed to fetch audit statistics");
    }
};
exports.getAuditStats = getAuditStats;
/**
 * Delete audit logs older than specified days
 */
const deleteOldAuditLogs = async (daysOld = 90) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const deletedCount = await audit_log_1.default.destroy({
            where: {
                createdAt: {
                    [require("sequelize").Op.lt]: cutoffDate,
                },
            },
        });
        return deletedCount;
    }
    catch (error) {
        console.error("Error deleting old audit logs:", error);
        throw new Error("Failed to delete old audit logs");
    }
};
exports.deleteOldAuditLogs = deleteOldAuditLogs;
/**
 * Export audit logs to CSV format
 */
const exportAuditLogs = async (filters = {}) => {
    try {
        const { auditLogs } = await (0, exports.getAuditLogs)({ ...filters, limit: 10000 });
        // Convert to CSV format
        const csvHeaders = [
            "Timestamp",
            "User",
            "Action",
            "Resource",
            "Resource ID",
            "Details",
            "IP Address",
            "User Agent",
            "Severity",
            "Category",
            "Status",
            "Country",
            "Region",
            "City",
        ];
        const csvRows = auditLogs.map((log) => [
            log.createdAt.toISOString(),
            log.user ? `${log.user.firstName} ${log.user.lastName}` : "System",
            log.action,
            log.resource,
            log.resourceId || "",
            log.details,
            log.ipAddress,
            log.userAgent,
            log.severity,
            log.category,
            log.status,
            log.country || "",
            log.region || "",
            log.city || "",
        ]);
        return {
            headers: csvHeaders,
            rows: csvRows,
        };
    }
    catch (error) {
        console.error("Error exporting audit logs:", error);
        throw new Error("Failed to export audit logs");
    }
};
exports.exportAuditLogs = exportAuditLogs;
/**
 * Helper function to extract request info for audit logging
 */
const extractRequestInfo = (req) => {
    return {
        ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
        userAgent: req.get("User-Agent") || "unknown",
        sessionId: req.sessionID,
        userId: req.user?.id,
    };
};
exports.extractRequestInfo = extractRequestInfo;
