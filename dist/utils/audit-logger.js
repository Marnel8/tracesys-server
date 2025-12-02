"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logStudentAction = void 0;
const audit_1 = require("../data/audit.js");
/**
 * Reusable function to log student actions for audit trail
 * Automatically extracts request info and user context
 */
const logStudentAction = async (req, options) => {
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
        // Log error but don't throw - audit logging should not break the main flow
        console.error("Failed to log student action:", error);
    }
};
exports.logStudentAction = logStudentAction;
