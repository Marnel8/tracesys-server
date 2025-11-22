import { Op, fn, col } from "sequelize";
import AuditLog from "@/db/models/audit-log";
import User from "@/db/models/user";
import { getInstructorStudentIds } from "@/utils/instructor";

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
	instructorId?: string;
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
		instructorId,
	} = params;

	const offset = (page - 1) * limit;
	const whereClause: any = {};
	const andConditions: any[] = [];

	// Instructor filter: only show logs from instructor's students or the instructor themselves
	if (instructorId) {
		const studentIds = await getInstructorStudentIds(instructorId);
		// Handle empty array case - only show instructor's own logs if no students
		if (studentIds.length === 0) {
			andConditions.push({ userId: instructorId });
		} else {
			andConditions.push({
				[Op.or]: [
					{ userId: { [Op.in]: studentIds } },
					{ userId: instructorId },
				],
			});
		}
	}

	// Search filter
	if (search) {
		andConditions.push({
			[Op.or]: [
				{ action: { [Op.like]: `%${search}%` } },
				{ resource: { [Op.like]: `%${search}%` } },
				{ details: { [Op.like]: `%${search}%` } },
			],
		});
	}

	// Combine AND conditions
	if (andConditions.length > 0) {
		whereClause[Op.and] = andConditions;
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
			const studentIds = await getInstructorStudentIds(instructorId);
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
		if (whereClause[Op.and]) {
			whereClause[Op.and] = whereClause[Op.and].filter((cond: any) => 
				!cond[Op.or] || !cond[Op.or].some((c: any) => 
					c.userId && (c.userId[Op.in] || c.userId === instructorId)
				)
			);
			// If no conditions left, remove Op.and
			if (whereClause[Op.and].length === 0) {
				delete whereClause[Op.and];
			}
		}
	}

	// Date range filter
	if (startDate || endDate) {
		const dateCondition: any = {};
		if (startDate) {
			dateCondition[Op.gte] = new Date(startDate);
		}
		if (endDate) {
			dateCondition[Op.lte] = new Date(endDate);
		}
		if (Object.keys(dateCondition).length > 0) {
			// Add to existing AND conditions or create new array
			if (whereClause[Op.and]) {
				whereClause[Op.and].push({ createdAt: dateCondition });
			} else {
				whereClause[Op.and] = [{ createdAt: dateCondition }];
			}
		}
	}

	const { count, rows } = await AuditLog.findAndCountAll({
		where: whereClause,
		include: [
			{
				model: User,
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
export const getAuditStatsData = async (instructorId?: string): Promise<AuditStatsResponse> => {
	try {
		const now = new Date();
		const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

		// Build where clause for instructor filtering
		let whereClause: any = {};
		if (instructorId) {
			const studentIds = await getInstructorStudentIds(instructorId);
			// Handle empty array case - only show instructor's own logs if no students
			if (studentIds.length === 0) {
				whereClause.userId = instructorId;
			} else {
				whereClause[Op.or] = [
					{ userId: { [Op.in]: studentIds } },
					{ userId: instructorId },
				];
			}
		}

		// Total activities
		const totalActivities = await AuditLog.count({ where: whereClause });

		// Security events
		const securityEvents = await AuditLog.count({
			where: { ...whereClause, category: "security" },
		});

		// Failed actions
		const failedActions = await AuditLog.count({
			where: { ...whereClause, status: "failed" },
		});

		// Active users (last 30 days)
		const activeUsers = await AuditLog.count({
			where: {
				...whereClause,
				createdAt: { [Op.gte]: thirtyDaysAgo },
				userId: { [Op.ne]: null },
			},
			distinct: true,
			col: "userId",
		});

		// Activities by category
		const activitiesByCategory = await AuditLog.findAll({
			where: whereClause,
			attributes: [
				"category",
				[fn("COUNT", col("id")), "count"],
			],
			group: ["category"],
			raw: true,
		});

		// Activities by severity
		const activitiesBySeverity = await AuditLog.findAll({
			where: whereClause,
			attributes: [
				"severity",
				[fn("COUNT", col("id")), "count"],
			],
			group: ["severity"],
			raw: true,
		});

		// Activities by status
		const activitiesByStatus = await AuditLog.findAll({
			where: whereClause,
			attributes: [
				"status",
				[fn("COUNT", col("id")), "count"],
			],
			group: ["status"],
			raw: true,
		});

		// Recent activities (last 10)
		const recentActivities = await AuditLog.findAll({
			where: whereClause,
			include: [
				{
					model: User,
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
export const deleteOldAuditLogsData = async (daysOld: number = 90): Promise<number> => {
	try {
		const cutoffDate = new Date();
		cutoffDate.setDate(cutoffDate.getDate() - daysOld);

		const deletedCount = await AuditLog.destroy({
			where: {
				createdAt: {
					[Op.lt]: cutoffDate,
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
export const getAuditUsersData = async (instructorId?: string) => {
	try {
		let whereClause: any = {};
		
		// If instructorId is provided, only return students under that instructor
		if (instructorId) {
			const studentIds = await getInstructorStudentIds(instructorId);
			// Include the instructor themselves and their students
			// Handle empty array case
			if (studentIds.length === 0) {
				whereClause.id = instructorId;
			} else {
				whereClause.id = { [Op.in]: [...studentIds, instructorId] };
			}
		}

		const users = await User.findAll({
			where: whereClause,
			attributes: ["id", "firstName", "lastName", "email", "role"],
			order: [["firstName", "ASC"]],
		});

		return users;
	} catch (error) {
		console.error("Error fetching users for audit:", error);
		throw new Error("Failed to fetch users");
	}
};
