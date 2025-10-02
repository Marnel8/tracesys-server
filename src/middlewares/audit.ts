import { Request, Response, NextFunction } from "express";
import { createAuditLogData, CreateAuditLogParams } from "@/data/audit";

export interface AuditOptions {
	action: string;
	resource: string;
	severity?: "low" | "medium" | "high";
	category: "security" | "academic" | "submission" | "attendance" | "user_management" | "system";
	includeRequestBody?: boolean;
	includeResponseBody?: boolean;
	skipSuccessLogs?: boolean;
}

/**
 * Audit middleware factory
 */
export const createAuditMiddleware = (options: AuditOptions) => {
	return async (req: Request, res: Response, next: NextFunction) => {
		const startTime = Date.now();
		const originalSend = res.send;

		// Capture response data
		let responseBody: any;
		res.send = function (body: any) {
			responseBody = body;
			return originalSend.call(this, body);
		};

		// Extract request information
		const requestInfo = {
			ipAddress: (req.ip as string) || ((req as any).connection?.remoteAddress as string) || "unknown",
			userAgent: (req.get("User-Agent") as string) || "unknown",
			sessionId: (req as any).sessionID as string | undefined,
			userId: (req as any).user?.id as string | undefined,
		};

		// Prepare audit data
		const auditData: CreateAuditLogParams = {
			userId: requestInfo.userId || undefined,
			sessionId: requestInfo.sessionId,
			action: options.action,
			resource: options.resource,
			resourceId: (req.params?.id as string | undefined) || undefined,
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
		res.end = function (chunk?: any, encoding?: any) {
			// Determine status
			const status = res.statusCode >= 200 && res.statusCode < 400 ? "success" : "failed";
			
			// Skip logging if it's a success and skipSuccessLogs is true
			if (status === "success" && options.skipSuccessLogs) {
				return originalEnd.call(this, chunk, encoding);
			}

			// Update audit data with final status
			auditData.status = status as CreateAuditLogParams["status"];
			auditData.details = `${options.action} on ${options.resource} - ${status}`;
			auditData.metadata = {
				...auditData.metadata,
				statusCode: res.statusCode,
				responseTime: Date.now() - startTime,
			};

			// Log asynchronously (don't wait for it)
			createAuditLogData(auditData).catch((error) => {
				console.error("Failed to create audit log:", error);
			});

			return originalEnd.call(this, chunk, encoding);
		};

		next();
	};
};

/**
 * Predefined audit middlewares for common operations
 */
export const auditMiddlewares = {
	// User management
	userCreate: createAuditMiddleware({
		action: "User Created",
		resource: "User Management",
		category: "user_management",
		severity: "medium",
		includeRequestBody: true,
	}),

	userUpdate: createAuditMiddleware({
		action: "User Updated",
		resource: "User Management",
		category: "user_management",
		severity: "medium",
		includeRequestBody: true,
	}),

	userDelete: createAuditMiddleware({
		action: "User Deleted",
		resource: "User Management",
		category: "user_management",
		severity: "high",
		includeRequestBody: true,
	}),

	// Authentication
	login: createAuditMiddleware({
		action: "User Login",
		resource: "Authentication",
		category: "security",
		severity: "medium",
		skipSuccessLogs: true, // Only log failed attempts
	}),

	logout: createAuditMiddleware({
		action: "User Logout",
		resource: "Authentication",
		category: "security",
		severity: "low",
		skipSuccessLogs: true,
	}),

	// Attendance
	attendanceClockIn: createAuditMiddleware({
		action: "Clock In",
		resource: "Attendance",
		category: "attendance",
		severity: "low",
		includeRequestBody: true,
	}),

	attendanceClockOut: createAuditMiddleware({
		action: "Clock Out",
		resource: "Attendance",
		category: "attendance",
		severity: "low",
		includeRequestBody: true,
	}),

	attendanceApproval: createAuditMiddleware({
		action: "Attendance Approval",
		resource: "Attendance",
		category: "attendance",
		severity: "medium",
		includeRequestBody: true,
	}),

	// Requirements
	requirementSubmit: createAuditMiddleware({
		action: "Requirement Submitted",
		resource: "Requirements",
		category: "submission",
		severity: "low",
		includeRequestBody: true,
	}),

	requirementApprove: createAuditMiddleware({
		action: "Requirement Approved",
		resource: "Requirements",
		category: "academic",
		severity: "medium",
		includeRequestBody: true,
	}),

	requirementReject: createAuditMiddleware({
		action: "Requirement Rejected",
		resource: "Requirements",
		category: "academic",
		severity: "medium",
		includeRequestBody: true,
	}),

	// Reports
	reportSubmit: createAuditMiddleware({
		action: "Report Submitted",
		resource: "Reports",
		category: "submission",
		severity: "low",
		includeRequestBody: true,
	}),

	reportApprove: createAuditMiddleware({
		action: "Report Approved",
		resource: "Reports",
		category: "academic",
		severity: "medium",
		includeRequestBody: true,
	}),

	// Agency management
	agencyCreate: createAuditMiddleware({
		action: "Agency Created",
		resource: "Agency Management",
		category: "user_management",
		severity: "medium",
		includeRequestBody: true,
	}),

	agencyUpdate: createAuditMiddleware({
		action: "Agency Updated",
		resource: "Agency Management",
		category: "user_management",
		severity: "medium",
		includeRequestBody: true,
	}),

	agencyDelete: createAuditMiddleware({
		action: "Agency Deleted",
		resource: "Agency Management",
		category: "user_management",
		severity: "high",
		includeRequestBody: true,
	}),

	// System operations
	systemOperation: createAuditMiddleware({
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
export const logAuditEvent = async (
	req: Request,
	options: {
		action: string;
		resource: string;
		resourceId?: string;
		details?: string;
		severity?: "low" | "medium" | "high";
		category: "security" | "academic" | "submission" | "attendance" | "user_management" | "system";
		status?: "success" | "failed" | "warning";
		metadata?: Record<string, any>;
	}
) => {
	try {
		const requestInfo = {
            ipAddress: (req.ip as string) || ((req as any).connection?.remoteAddress as string) || "unknown",
            userAgent: (req.get("User-Agent") as string) || "unknown",
            sessionId: (req as any).sessionID as string | undefined,
            userId: (req as any).user?.id as string | undefined,
		};

		await createAuditLogData({
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
	} catch (error) {
		console.error("Failed to log audit event:", error);
	}
};
