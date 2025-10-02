import { Op, fn, col } from "sequelize";
import AuditLog from "@/db/models/audit-log";
import User from "@/db/models/user";

export interface CreateAuditLogParams {
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

export interface GetAuditLogsParams {
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

export interface AuditLogResponse {
	auditLogs: any[];
	pagination: {
		total: number;
		page: number;
		limit: number;
		totalPages: number;
	};
}

export interface AuditStatsResponse {
	totalActivities: number;
	securityEvents: number;
	failedActions: number;
	activeUsers: number;
	activitiesByCategory: Record<string, number>;
	activitiesBySeverity: Record<string, number>;
	activitiesByStatus: Record<string, number>;
	recentActivities: any[];
}

/**
 * Create a new audit log entry
 */
export const createAuditLogData = async (params: CreateAuditLogParams) => {
	try {
		const auditLog = await AuditLog.create({
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
	} catch (error) {
		console.error("Error creating audit log:", error);
		throw new Error("Failed to create audit log");
	}
};

/**
 * Get audit logs with filtering and pagination
 */
export const getAuditLogsData = async (params: GetAuditLogsParams = {}): Promise<AuditLogResponse> => {
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
	} = params;

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

	// Date range filter - temporarily disabled until createdAt column is added
	// if (startDate || endDate) {
	// 	whereClause.createdAt = {};
	// 	if (startDate) {
	// 		whereClause.createdAt[Op.gte] = new Date(startDate);
	// 	}
	// 	if (endDate) {
	// 		whereClause.createdAt[Op.lte] = new Date(endDate);
	// 	}
	// }

	const { count, rows } = await AuditLog.findAndCountAll({
		where: whereClause,
		include: [
			{
				model: User,
				as: "user",
				attributes: ["id", "firstName", "lastName", "email", "role"],
			},
		],
		// order: [["createdAt", "DESC"]], // Temporarily disabled until createdAt column is added
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
export const findAuditLogById = async (id: string) => {
	try {
		const auditLog = await AuditLog.findByPk(id, {
			include: [
				{
					model: User,
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
export const getAuditStatsData = async (): Promise<AuditStatsResponse> => {
	try {
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

		// Active users (last 30 days) - temporarily disabled until createdAt column is added
		// const activeUsers = await AuditLog.count({
		// 	where: {
		// 		createdAt: { [Op.gte]: thirtyDaysAgo },
		// 		userId: { [Op.ne]: null },
		// 	},
		// 	distinct: true,
		// 	col: "userId",
		// });
		const activeUsers = 0; // Temporary fallback

		// Activities by category
		const activitiesByCategory = await AuditLog.findAll({
			attributes: [
				"category",
				[fn("COUNT", col("id")), "count"],
			],
			group: ["category"],
			raw: true,
		});

		// Activities by severity
		const activitiesBySeverity = await AuditLog.findAll({
			attributes: [
				"severity",
				[fn("COUNT", col("id")), "count"],
			],
			group: ["severity"],
			raw: true,
		});

		// Activities by status
		const activitiesByStatus = await AuditLog.findAll({
			attributes: [
				"status",
				[fn("COUNT", col("id")), "count"],
			],
			group: ["status"],
			raw: true,
		});

		// Recent activities (last 10) - temporarily disabled until createdAt column is added
		const recentActivities = await AuditLog.findAll({
			include: [
				{
					model: User,
					as: "user",
					attributes: ["id", "firstName", "lastName", "email", "role"],
				},
			],
			// order: [["createdAt", "DESC"]], // Temporarily disabled until createdAt column is added
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
export const deleteOldAuditLogsData = async (daysOld: number = 90): Promise<number> => {
	try {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysOld);

		// Temporarily disabled until createdAt column is added
		// const deletedCount = await AuditLog.destroy({
		// 	where: {
		// 		createdAt: {
		// 			[Op.lt]: cutoffDate,
		// 		},
		// 	},
		// });
		const deletedCount = 0; // Temporary fallback

		return deletedCount;
	} catch (error) {
		console.error("Error deleting old audit logs:", error);
		throw new Error("Failed to delete old audit logs");
	}
};

/**
 * Export audit logs to CSV format
 */
export const exportAuditLogsData = async (params: GetAuditLogsParams = {}) => {
	try {
		const { auditLogs } = await getAuditLogsData({ ...params, limit: 10000 });

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
	} catch (error) {
		console.error("Error exporting audit logs:", error);
		throw new Error("Failed to export audit logs");
	}
};

/**
 * Get users for audit log filtering
 */
export const getAuditUsersData = async () => {
	try {
		const users = await User.findAll({
			attributes: ["id", "firstName", "lastName", "email", "role"],
			order: [["firstName", "ASC"]],
		});

		return users;
	} catch (error) {
		console.error("Error fetching users for audit:", error);
		throw new Error("Failed to fetch users");
	}
};
