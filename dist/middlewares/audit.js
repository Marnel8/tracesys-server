"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAuditEvent = exports.auditMiddlewares = exports.createAuditMiddleware = void 0;
const audit_1 = require("../data/audit.js");
/**
 * Audit middleware factory
 */
const createAuditMiddleware = (options) => {
    return async (req, res, next) => {
        const startTime = Date.now();
        const originalSend = res.send;
        // Capture response data
        let responseBody;
        res.send = function (body) {
            responseBody = body;
            return originalSend.call(this, body);
        };
        // Extract request information
        const requestInfo = {
            ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            sessionId: req.sessionID,
            userId: req.user?.id,
        };
        // Prepare audit data
        const auditData = {
            userId: requestInfo.userId || undefined,
            sessionId: requestInfo.sessionId,
            action: options.action,
            resource: options.resource,
            resourceId: req.params?.id || undefined,
            details: `${options.action} on ${options.resource}`,
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            severity: options.severity || "low",
            category: options.category,
            status: "success",
            metadata: {
                method: req.method,
                url: req.originalUrl,
                headers: req.headers,
                ...(options.includeRequestBody && { requestBody: req.body }),
                ...(options.includeResponseBody && { responseBody }),
                responseTime: Date.now() - startTime,
            },
        };
        // Override res.end to capture status and log
        const originalEnd = res.end;
        res.end = function (chunk, encoding) {
            // Determine status
            const status = res.statusCode >= 200 && res.statusCode < 400 ? "success" : "failed";
            // Skip logging if it's a success and skipSuccessLogs is true
            if (status === "success" && options.skipSuccessLogs) {
                return originalEnd.call(this, chunk, encoding);
            }
            // Update audit data with final status
            auditData.status = status;
            auditData.details = `${options.action} on ${options.resource} - ${status}`;
            auditData.metadata = {
                ...auditData.metadata,
                statusCode: res.statusCode,
                responseTime: Date.now() - startTime,
            };
            // Log asynchronously (don't wait for it)
            (0, audit_1.createAuditLogData)(auditData).catch((error) => {
                console.error("Failed to create audit log:", error);
            });
            return originalEnd.call(this, chunk, encoding);
        };
        next();
    };
};
exports.createAuditMiddleware = createAuditMiddleware;
/**
 * Predefined audit middlewares for common operations
 */
exports.auditMiddlewares = {
    // User management
    userCreate: (0, exports.createAuditMiddleware)({
        action: "User Created",
        resource: "User Management",
        category: "user_management",
        severity: "medium",
        includeRequestBody: true,
    }),
    userUpdate: (0, exports.createAuditMiddleware)({
        action: "User Updated",
        resource: "User Management",
        category: "user_management",
        severity: "medium",
        includeRequestBody: true,
    }),
    userDelete: (0, exports.createAuditMiddleware)({
        action: "User Deleted",
        resource: "User Management",
        category: "user_management",
        severity: "high",
        includeRequestBody: true,
    }),
    // Authentication
    login: (0, exports.createAuditMiddleware)({
        action: "User Login",
        resource: "Authentication",
        category: "security",
        severity: "medium",
        skipSuccessLogs: true, // Only log failed attempts
    }),
    logout: (0, exports.createAuditMiddleware)({
        action: "User Logout",
        resource: "Authentication",
        category: "security",
        severity: "low",
        skipSuccessLogs: true,
    }),
    // Attendance
    attendanceClockIn: (0, exports.createAuditMiddleware)({
        action: "Clock In",
        resource: "Attendance",
        category: "attendance",
        severity: "low",
        includeRequestBody: true,
    }),
    attendanceClockOut: (0, exports.createAuditMiddleware)({
        action: "Clock Out",
        resource: "Attendance",
        category: "attendance",
        severity: "low",
        includeRequestBody: true,
    }),
    attendanceApproval: (0, exports.createAuditMiddleware)({
        action: "Attendance Approval",
        resource: "Attendance",
        category: "attendance",
        severity: "medium",
        includeRequestBody: true,
    }),
    // Requirements
    requirementSubmit: (0, exports.createAuditMiddleware)({
        action: "Requirement Submitted",
        resource: "Requirements",
        category: "submission",
        severity: "low",
        includeRequestBody: true,
    }),
    requirementApprove: (0, exports.createAuditMiddleware)({
        action: "Requirement Approved",
        resource: "Requirements",
        category: "academic",
        severity: "medium",
        includeRequestBody: true,
    }),
    requirementReject: (0, exports.createAuditMiddleware)({
        action: "Requirement Rejected",
        resource: "Requirements",
        category: "academic",
        severity: "medium",
        includeRequestBody: true,
    }),
    // Reports
    reportSubmit: (0, exports.createAuditMiddleware)({
        action: "Report Submitted",
        resource: "Reports",
        category: "submission",
        severity: "low",
        includeRequestBody: true,
    }),
    reportApprove: (0, exports.createAuditMiddleware)({
        action: "Report Approved",
        resource: "Reports",
        category: "academic",
        severity: "medium",
        includeRequestBody: true,
    }),
    // Agency management
    agencyCreate: (0, exports.createAuditMiddleware)({
        action: "Agency Created",
        resource: "Agency Management",
        category: "user_management",
        severity: "medium",
        includeRequestBody: true,
    }),
    agencyUpdate: (0, exports.createAuditMiddleware)({
        action: "Agency Updated",
        resource: "Agency Management",
        category: "user_management",
        severity: "medium",
        includeRequestBody: true,
    }),
    agencyDelete: (0, exports.createAuditMiddleware)({
        action: "Agency Deleted",
        resource: "Agency Management",
        category: "user_management",
        severity: "high",
        includeRequestBody: true,
    }),
    // System operations
    systemOperation: (0, exports.createAuditMiddleware)({
        action: "System Operation",
        resource: "System",
        category: "system",
        severity: "low",
        includeRequestBody: true,
    }),
};
/**
 * Helper function to manually log audit events
 */
const logAuditEvent = async (req, options) => {
    try {
        const requestInfo = {
            ipAddress: req.ip || req.connection?.remoteAddress || "unknown",
            userAgent: req.get("User-Agent") || "unknown",
            sessionId: req.sessionID,
            userId: req.user?.id,
        };
        await (0, audit_1.createAuditLogData)({
            userId: requestInfo.userId || undefined,
            sessionId: requestInfo.sessionId,
            action: options.action,
            resource: options.resource,
            resourceId: options.resourceId,
            details: options.details || `${options.action} on ${options.resource}`,
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            severity: options.severity || "low",
            category: options.category,
            status: options.status || "success",
            metadata: options.metadata,
        });
    }
    catch (error) {
        console.error("Failed to log audit event:", error);
    }
};
exports.logAuditEvent = logAuditEvent;
