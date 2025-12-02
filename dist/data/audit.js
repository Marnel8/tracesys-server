"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditUsersData = exports.exportAuditLogsData = exports.deleteOldAuditLogsData = exports.getAuditStatsData = exports.findAuditLogById = exports.getAuditLogsData = exports.createAuditLogData = void 0;
const sequelize_1 = require("sequelize");
const audit_log_1 = __importDefault(require("../db/models/audit-log.js"));
const user_1 = __importDefault(require("../db/models/user.js"));
const instructor_1 = require("../utils/instructor.js");
/**
 * Create a new audit log entry
 */
const createAuditLogData = async (params) => {
    try {
        const auditLog = await audit_log_1.default.create({
            userId: params.userId || null,
            sessionId: params.sessionId || null,
            action: params.action,
            resource: params.resource,
            resourceId: params.resourceId || null,
            details: params.details,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            severity: params.severity,
            category: params.category,
            status: params.status,
            country: params.country || null,
            region: params.region || null,
            city: params.city || null,
            metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        });
        return auditLog;
    }
    catch (error) {
        console.error("Error creating audit log:", error);
        throw new Error("Failed to create audit log");
    }
};
exports.createAuditLogData = createAuditLogData;
/**
 * Get audit logs with filtering and pagination
 */
const getAuditLogsData = async (params = {}) => {
    const { page = 1, limit = 10, search = "", category, severity, status, userId, startDate, endDate, instructorId, } = params;
    const offset = (page - 1) * limit;
    const whereClause = {};
    const andConditions = [];
    // Instructor filter: only show logs from instructor's students or the instructor themselves
    if (instructorId) {
        const studentIds = await (0, instructor_1.getInstructorStudentIds)(instructorId);
        // Handle empty array case - only show instructor's own logs if no students
        if (studentIds.length === 0) {
            andConditions.push({ userId: instructorId });
        }
        else {
            andConditions.push({
                [sequelize_1.Op.or]: [
                    { userId: { [sequelize_1.Op.in]: studentIds } },
                    { userId: instructorId },
                ],
            });
        }
    }
    // Search filter
    if (search) {
        andConditions.push({
            [sequelize_1.Op.or]: [
                { action: { [sequelize_1.Op.like]: `%${search}%` } },
                { resource: { [sequelize_1.Op.like]: `%${search}%` } },
                { details: { [sequelize_1.Op.like]: `%${search}%` } },
            ],
        });
    }
    // Combine AND conditions
    if (andConditions.length > 0) {
        whereClause[sequelize_1.Op.and] = andConditions;
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
    // User filter (overrides instructor filter if specific user is selected)
    if (userId && userId !== "all") {
        // If instructor filter exists, ensure the user is one of their students
        if (instructorId) {
            const studentIds = await (0, instructor_1.getInstructorStudentIds)(instructorId);
            if (!studentIds.includes(userId) && userId !== instructorId) {
                // User is not under this instructor, return empty result
                return {
                    auditLogs: [],
                    pagination: {
                        total: 0,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: 0,
                    },
                };
            }
        }
        // Simply set userId - it will override instructor filter naturally
        whereClause.userId = userId;
        // Remove instructor filter from AND conditions if it exists
        if (whereClause[sequelize_1.Op.and]) {
            whereClause[sequelize_1.Op.and] = whereClause[sequelize_1.Op.and].filter((cond) => !cond[sequelize_1.Op.or] || !cond[sequelize_1.Op.or].some((c) => c.userId && (c.userId[sequelize_1.Op.in] || c.userId === instructorId)));
            // If no conditions left, remove Op.and
            if (whereClause[sequelize_1.Op.and].length === 0) {
                delete whereClause[sequelize_1.Op.and];
            }
        }
    }
    // Date range filter
    if (startDate || endDate) {
        const dateCondition = {};
        if (startDate) {
            dateCondition[sequelize_1.Op.gte] = new Date(startDate);
        }
        if (endDate) {
            dateCondition[sequelize_1.Op.lte] = new Date(endDate);
        }
        if (Object.keys(dateCondition).length > 0) {
            // Add to existing AND conditions or create new array
            if (whereClause[sequelize_1.Op.and]) {
                whereClause[sequelize_1.Op.and].push({ createdAt: dateCondition });
            }
            else {
                whereClause[sequelize_1.Op.and] = [{ createdAt: dateCondition }];
            }
        }
    }
    const { count, rows } = await audit_log_1.default.findAndCountAll({
        where: whereClause,
        include: [
            {
                model: user_1.default,
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
exports.getAuditLogsData = getAuditLogsData;
/**
 * Get audit log by ID
 */
const findAuditLogById = async (id) => {
    try {
        const auditLog = await audit_log_1.default.findByPk(id, {
            include: [
                {
                    model: user_1.default,
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
exports.findAuditLogById = findAuditLogById;
/**
 * Get audit statistics
 */
const getAuditStatsData = async (instructorId) => {
    try {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        // Build where clause for instructor filtering
        let whereClause = {};
        if (instructorId) {
            const studentIds = await (0, instructor_1.getInstructorStudentIds)(instructorId);
            // Handle empty array case - only show instructor's own logs if no students
            if (studentIds.length === 0) {
                whereClause.userId = instructorId;
            }
            else {
                whereClause[sequelize_1.Op.or] = [
                    { userId: { [sequelize_1.Op.in]: studentIds } },
                    { userId: instructorId },
                ];
            }
        }
        // Total activities
        const totalActivities = await audit_log_1.default.count({ where: whereClause });
        // Security events
        const securityEvents = await audit_log_1.default.count({
            where: { ...whereClause, category: "security" },
        });
        // Failed actions
        const failedActions = await audit_log_1.default.count({
            where: { ...whereClause, status: "failed" },
        });
        // Active users (last 30 days)
        const activeUsers = await audit_log_1.default.count({
            where: {
                ...whereClause,
                createdAt: { [sequelize_1.Op.gte]: thirtyDaysAgo },
                userId: { [sequelize_1.Op.ne]: null },
            },
            distinct: true,
            col: "userId",
        });
        // Activities by category
        const activitiesByCategory = await audit_log_1.default.findAll({
            where: whereClause,
            attributes: [
                "category",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
            ],
            group: ["category"],
            raw: true,
        });
        // Activities by severity
        const activitiesBySeverity = await audit_log_1.default.findAll({
            where: whereClause,
            attributes: [
                "severity",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
            ],
            group: ["severity"],
            raw: true,
        });
        // Activities by status
        const activitiesByStatus = await audit_log_1.default.findAll({
            where: whereClause,
            attributes: [
                "status",
                [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.col)("id")), "count"],
            ],
            group: ["status"],
            raw: true,
        });
        // Recent activities (last 10)
        const recentActivities = await audit_log_1.default.findAll({
            where: whereClause,
            include: [
                {
                    model: user_1.default,
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
exports.getAuditStatsData = getAuditStatsData;
/**
 * Delete audit logs older than specified days
 */
const deleteOldAuditLogsData = async (daysOld = 90) => {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        const deletedCount = await audit_log_1.default.destroy({
            where: {
                createdAt: {
                    [sequelize_1.Op.lt]: cutoffDate,
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
exports.deleteOldAuditLogsData = deleteOldAuditLogsData;
/**
 * Export audit logs to CSV format
 */
const exportAuditLogsData = async (params = {}) => {
    try {
        const { auditLogs } = await (0, exports.getAuditLogsData)({ ...params, limit: 10000 });
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
            log.createdAt ? log.createdAt.toISOString() : new Date().toISOString(), // Fallback if createdAt doesn't exist
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
exports.exportAuditLogsData = exportAuditLogsData;
/**
 * Get users for audit log filtering
 */
const getAuditUsersData = async (instructorId) => {
    try {
        let whereClause = {};
        // If instructorId is provided, only return students under that instructor
        if (instructorId) {
            const studentIds = await (0, instructor_1.getInstructorStudentIds)(instructorId);
            // Include the instructor themselves and their students
            // Handle empty array case
            if (studentIds.length === 0) {
                whereClause.id = instructorId;
            }
            else {
                whereClause.id = { [sequelize_1.Op.in]: [...studentIds, instructorId] };
            }
        }
        const users = await user_1.default.findAll({
            where: whereClause,
            attributes: ["id", "firstName", "lastName", "email", "role"],
            order: [["firstName", "ASC"]],
        });
        return users;
    }
    catch (error) {
        console.error("Error fetching users for audit:", error);
        throw new Error("Failed to fetch users");
    }
};
exports.getAuditUsersData = getAuditUsersData;
