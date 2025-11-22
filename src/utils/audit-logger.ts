import { Request } from "express";
import { createAuditLogData } from "@/data/audit";

export interface LogStudentActionOptions {
	action: string;
	resource: string;
	resourceId?: string;
	details?: string;
	severity?: "low" | "medium" | "high";
	category: "security" | "academic" | "submission" | "attendance" | "user_management" | "system";
	status?: "success" | "failed" | "warning";
	metadata?: Record<string, any>;
}

/**
 * Reusable function to log student actions for audit trail
 * Automatically extracts request info and user context
 */
export const logStudentAction = async (
	req: Request,
	options: LogStudentActionOptions
): Promise<void> => {
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
		// Log error but don't throw - audit logging should not break the main flow
		console.error("Failed to log student action:", error);
	}
};

