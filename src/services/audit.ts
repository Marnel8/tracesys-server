import AuditLog from "@/db/models/audit-log";
import { Request } from "express";
import { Op } from "sequelize";

export interface AuditLogData {
	userId?: string;
	sessionId?: string;
	action: string;
	resource: string;
	resourceId?: string;
	details: string;
	ipAddress: string;
	userAgent: string;
	severity: "low" | "medium" | "high";
	category: "security" | "academic" | "submission" | "attendance" | "user_management" | "system";
	status: "success" | "failed" | "warning";
	country?: string;
	region?: string;
	city?: string;
	metadata?: Record<string, any>;
}

export interface AuditLogFilters {
	page?: number;
	limit?: number;
	search?: string;
	category?: string;
	severity?: string;
	status?: string;
	userId?: string;
	startDate?: string;
	endDate?: string;
}

export interface AuditStats {
	totalActivities: number;
	securityEvents: number;
	failedActions: number;
	activeUsers: number;
	activitiesByCategory: Record<string, number>;
	activitiesBySeverity: Record<string, number>;
	activitiesByStatus: Record<string, number>;
	recentActivities: AuditLogData[];
}

/**
 * Create a new audit log entry
 */
export const createAuditLog = async (auditData: AuditLogData): Promise<AuditLog> => {
	try {
		const auditLog = await AuditLog.create({
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
	} catch (error) {
		console.error("Error creating audit log:", error);
		throw new Error("Failed to create audit log");
	}
};

/**
 * Get audit logs with filtering and pagination
 */
export const getAuditLogs = async (filters: AuditLogFilters = {}) => {
	const {
		page = 1,
		limit = 10,
		search = "",
		category,
		severity,
		status,
		userId,
		startDate,
		endDate,
	} = filters;

	const offset = (page - 1) * limit;
	const whereClause: any = {};

	// Search filter
	if (search) {
		whereClause[Op.or] = [
			{ action: { [Op.like]: `%${search}%` } },
			{ resource: { [Op.like]: `%${search}%` } },
			{ details: { [Op.like]: `%${search}%` } },
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
			whereClause.createdAt[Op.gte] = new Date(startDate);
		}
		if (endDate) {
			whereClause.createdAt[Op.lte] = new Date(endDate);
		}
	}

	const { count, rows } = await AuditLog.findAndCountAll({
		where: whereClause,
		include: [
			{
				model: require("@/db/models/user").default,
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

/**
 * Get audit log by ID
 */
export const getAuditLogById = async (id: string): Promise<AuditLog | null> => {
	try {
		const auditLog = await AuditLog.findByPk(id, {
			include: [
				{
					model: require("@/db/models/user").default,
					as: "user",
					attributes: ["id", "firstName", "lastName", "email", "role"],
				},
			],
		});

		return auditLog;
	} catch (error) {
		console.error("Error fetching audit log:", error);
		throw new Error("Failed to fetch audit log");
	}
};

/**
 * Get audit statistics
 */
export const getAuditStats = async (): Promise<AuditStats> => {
	try {
		const { Op } = require("sequelize");
		const now = new Date();
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		// Total activities
		const totalActivities = await AuditLog.count();

		// Security events
		const securityEvents = await AuditLog.count({
			where: { category: "security" },
		});

		// Failed actions
		const failedActions = await AuditLog.count({
			where: { status: "failed" },
		});

		// Active users (last 30 days)
		const activeUsers = await AuditLog.count({
			where: {
				createdAt: { [Op.gte]: thirtyDaysAgo },
				userId: { [Op.ne]: null },
			},
			distinct: true,
			col: "userId",
		});

		// Activities by category
		const activitiesByCategory = await AuditLog.findAll({
			attributes: [
				"category",
				[require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"],
			],
			group: ["category"],
			raw: true,
		});

		// Activities by severity
		const activitiesBySeverity = await AuditLog.findAll({
			attributes: [
				"severity",
				[require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"],
			],
			group: ["severity"],
			raw: true,
		});

		// Activities by status
		const activitiesByStatus = await AuditLog.findAll({
			attributes: [
				"status",
				[require("sequelize").fn("COUNT", require("sequelize").col("id")), "count"],
			],
			group: ["status"],
			raw: true,
		});

		// Recent activities (last 10)
		const recentActivities = await AuditLog.findAll({
			include: [
				{
					model: require("@/db/models/user").default,
					as: "user",
					attributes: ["id", "firstName", "lastName", "email", "role"],
				},
			],
			order: [["createdAt", "DESC"]],
			limit: 10,
		});

		// Convert to objects
		const categoryStats: Record<string, number> = {};
		activitiesByCategory.forEach((item: any) => {
			categoryStats[item.category] = parseInt(item.count);
		});

		const severityStats: Record<string, number> = {};
		activitiesBySeverity.forEach((item: any) => {
			severityStats[item.severity] = parseInt(item.count);
		});

		const statusStats: Record<string, number> = {};
		activitiesByStatus.forEach((item: any) => {
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
			recentActivities: recentActivities as any,
		};
	} catch (error) {
		console.error("Error fetching audit stats:", error);
		throw new Error("Failed to fetch audit statistics");
	}
};

/**
 * Delete audit logs older than specified days
 */
export const deleteOldAuditLogs = async (daysOld: number = 90): Promise<number> => {
	try {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysOld);

		const deletedCount = await AuditLog.destroy({
			where: {
				createdAt: {
					[require("sequelize").Op.lt]: cutoffDate,
				},
			},
		});

		return deletedCount;
	} catch (error) {
		console.error("Error deleting old audit logs:", error);
		throw new Error("Failed to delete old audit logs");
	}
};

/**
 * Export audit logs to CSV format
 */
export const exportAuditLogs = async (filters: AuditLogFilters = {}) => {
	try {
		const { auditLogs } = await getAuditLogs({ ...filters, limit: 10000 });

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

		const csvRows = auditLogs.map((log: any) => [
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
	} catch (error) {
		console.error("Error exporting audit logs:", error);
		throw new Error("Failed to export audit logs");
	}
};

/**
 * Helper function to extract request info for audit logging
 */
export const extractRequestInfo = (req: Request) => {
	return {
		ipAddress: (req.ip as string) || ((req as any).connection?.remoteAddress as string) || "unknown",
		userAgent: (req.get("User-Agent") as string) || "unknown",
		sessionId: (req as any).sessionID as string | undefined,
		userId: (req as any).user?.id as string | undefined,
	};
};
