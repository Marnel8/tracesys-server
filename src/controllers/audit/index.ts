import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
	BadRequestError,
	NotFoundError,
} from "@/utils/error";
import {
	createAuditLogData,
	getAuditLogsData,
	findAuditLogById,
	getAuditStatsData,
	deleteOldAuditLogsData,
	exportAuditLogsData,
	getAuditUsersData,
} from "@/data/audit";

// Audit log data interface
interface CreateAuditLogParams {
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

/**
 * Create a new audit log entry
 */
export const createAuditLogController = async (req: Request, res: Response) => {
	const {
		userId,
		sessionId,
		action,
		resource,
		resourceId,
		details,
		ipAddress,
		userAgent,
		severity = "low",
		category,
		status = "success",
		country,
		region,
		city,
		metadata,
	}: CreateAuditLogParams = req.body;

	if (!action || !resource || !details || !ipAddress || !userAgent || !category) {
		throw new BadRequestError("Please provide all necessary audit log data.");
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

	const result = await createAuditLogData(auditData);

	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Audit log created successfully",
		data: result,
	});
};

/**
 * Get audit logs with filtering and pagination
 */
export const getAuditLogsController = async (req: Request, res: Response) => {
	const {
		page = 1,
		limit = 10,
		search = "",
		category = "all",
		severity = "all",
		status = "all",
		userId = "all",
		startDate,
		endDate,
	} = req.query;

	// Extract instructorId if user is an instructor
	const instructorId = req.user?.role === "instructor" ? req.user.id : undefined;

	const result = await getAuditLogsData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		category: category as string,
		severity: severity as string,
		status: status as string,
		userId: userId as string,
		startDate: startDate as string,
		endDate: endDate as string,
		instructorId,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Audit logs retrieved successfully",
		data: result,
	});
};

/**
 * Get audit log by ID
 */
export const getAuditLogController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Audit log ID is required");
	}

	const auditLog = await findAuditLogById(id);

	if (!auditLog) {
		throw new NotFoundError("Audit log not found");
	}

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Audit log retrieved successfully",
		data: auditLog,
	});
};

/**
 * Get audit statistics
 */
export const getAuditStatsController = async (req: Request, res: Response) => {
	// Extract instructorId if user is an instructor
	const instructorId = req.user?.role === "instructor" ? req.user.id : undefined;
	const stats = await getAuditStatsData(instructorId);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Audit statistics retrieved successfully",
		data: stats,
	});
};

/**
 * Get users for audit filtering
 */
export const getAuditUsersController = async (req: Request, res: Response) => {
	// Extract instructorId if user is an instructor
	const instructorId = req.user?.role === "instructor" ? req.user.id : undefined;
	const users = await getAuditUsersData(instructorId);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Users retrieved successfully",
		data: users,
	});
};

/**
 * Export audit logs to CSV
 */
export const exportAuditLogsController = async (req: Request, res: Response) => {
	const {
		search = "",
		category = "all",
		severity = "all",
		status = "all",
		userId = "all",
		startDate,
		endDate,
	} = req.query;

	// Extract instructorId if user is an instructor
	const instructorId = req.user?.role === "instructor" ? req.user.id : undefined;

	const result = await exportAuditLogsData({
		search: search as string,
		category: category as string,
		severity: severity as string,
		status: status as string,
		userId: userId as string,
		startDate: startDate as string,
		endDate: endDate as string,
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

	res.status(StatusCodes.OK).send(csvContent);
};

/**
 * Delete old audit logs
 */
export const deleteOldAuditLogsController = async (req: Request, res: Response) => {
	const { daysOld = 90 } = req.body;

	if (daysOld < 30) {
		throw new BadRequestError("Cannot delete logs newer than 30 days");
	}

	const deletedCount = await deleteOldAuditLogsData(Number(daysOld));

	res.status(StatusCodes.OK).json({
		success: true,
		message: `Successfully deleted ${deletedCount} old audit logs`,
		data: { deletedCount },
	});
};

/**
 * Get audit log categories
 */
export const getAuditCategoriesController = async (req: Request, res: Response) => {
	const categories = [
		{ value: "security", label: "Security" },
		{ value: "academic", label: "Academic" },
		{ value: "submission", label: "Submission" },
		{ value: "attendance", label: "Attendance" },
		{ value: "user_management", label: "User Management" },
		{ value: "system", label: "System" },
	];

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Audit categories retrieved successfully",
		data: categories,
	});
};

/**
 * Get audit log severities
 */
export const getAuditSeveritiesController = async (req: Request, res: Response) => {
	const severities = [
		{ value: "low", label: "Low" },
		{ value: "medium", label: "Medium" },
		{ value: "high", label: "High" },
	];

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Audit severities retrieved successfully",
		data: severities,
	});
};

/**
 * Get audit log statuses
 */
export const getAuditStatusesController = async (req: Request, res: Response) => {
	const statuses = [
		{ value: "success", label: "Success" },
		{ value: "failed", label: "Failed" },
		{ value: "warning", label: "Warning" },
	];

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Audit statuses retrieved successfully",
		data: statuses,
	});
};
