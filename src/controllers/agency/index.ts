import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from "@/utils/error";
import { 
	createAgencyData, 
	findAgencyByID, 
	updateAgencyData, 
	deleteAgencyData, 
	getAgenciesData,
	createSupervisorData,
	getSupervisorsData,
	findSupervisorByID,
	updateSupervisorData,
	deleteSupervisorData,
	getAgencySupervisorStats,
	getArchivedAgenciesData,
	restoreAgencyData,
	hardDeleteAgencyData
} from "@/data/agency";
import { logAuditEvent } from "@/middlewares/audit";
import User, { UserRole } from "@/db/models/user";
import StudentEnrollment from "@/db/models/student-enrollment";
import Section from "@/db/models/section";

// Agency data interface
interface AgencyData {
	name: string;
	address: string;
	contactPerson: string;
	contactRole: string;
	contactPhone: string;
	contactEmail: string;
	branchType: "Main" | "Branch";
	openingTime?: string;
	closingTime?: string;
	operatingDays?: string;
	lunchStartTime?: string;
	lunchEndTime?: string;
	isActive?: boolean;
	latitude?: number;
	longitude?: number;
	isSchoolAffiliated?: boolean;
}

// Supervisor data interface
interface SupervisorData {
	agencyId: string;
	name: string;
	email: string;
	phone: string;
	position: string;
	department?: string;
	isActive?: boolean;
}

export const createAgencyController = async (req: Request, res: Response) => {
	const {
		name,
		address,
		contactPerson,
		contactRole,
		contactPhone,
		contactEmail,
		branchType,
		openingTime,
		closingTime,
		operatingDays,
		lunchStartTime,
		lunchEndTime,
		isActive = true,
		latitude,
		longitude,
		isSchoolAffiliated = false,
	}: AgencyData = req.body;

	if (!name || !address || !contactPerson || !contactRole || !contactPhone || !contactEmail || !branchType) {
		throw new BadRequestError("Please provide all necessary agency data.");
	}

	// Get the instructor ID from the authenticated user
	const instructorId = (req.user as any)?.id;

	const agencyData = {
		name,
		address,
		contactPerson,
		contactRole,
		contactPhone,
		contactEmail,
		branchType,
		openingTime,
		closingTime,
		operatingDays,
		lunchStartTime,
		lunchEndTime,
		isActive,
		latitude,
		longitude,
		isSchoolAffiliated,
		instructorId, // Set the instructor who created this agency
	};

	const result = await createAgencyData(agencyData);

	// createAgencyData returns an object { agency }, normalize to entity
	const createdAgency = (result as any).agency ?? result;

	// Log audit event
	await logAuditEvent(req, {
		action: "Agency Created",
		resource: "Agency Management",
		resourceId: createdAgency.id,
		details: `Created agency: ${createdAgency.name}`,
		category: "user_management",
		severity: "medium",
		metadata: {
			agencyName: createdAgency.name,
			agencyId: createdAgency.id,
		},
	});

	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Agency created successfully",
		data: createdAgency,
	});
};

export const getAgenciesController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "", status = "all", branchType = "all" } = req.query;

	// Get the instructor ID from the authenticated user
	const instructorId = (req.user as any)?.id;

	// Agencies are now shared - all instructors can see all agencies
	// But supervisors are filtered by instructor
	const result = await getAgenciesData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: status as string,
		branchType: branchType as string,
		instructorId,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Agencies retrieved successfully",
		data: result,
	});
};

export const getAgencyController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Agency ID is required");
	}

	// Get the instructor ID from the authenticated user
	const instructorId = (req.user as any)?.id;

	const agency = await findAgencyByID(id, instructorId);

	if (!agency) {
		throw new NotFoundError("Agency not found");
	}

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Agency retrieved successfully",
		data: agency,
	});
};

export const updateAgencyController = async (req: Request, res: Response) => {
	const { id } = req.params;
	const updateData = req.body;

	if (!id) {
		throw new BadRequestError("Agency ID is required");
	}

	// Get the instructor ID from the authenticated user
	const instructorId = (req.user as any)?.id;

	const agency = await findAgencyByID(id, instructorId);

	if (!agency) {
		throw new NotFoundError("Agency not found");
	}

	const result = await updateAgencyData(id, updateData);

	// Log audit event
	await logAuditEvent(req, {
		action: "Agency Updated",
		resource: "Agency Management",
		resourceId: id,
		details: `Updated agency: ${result.name}`,
		category: "user_management",
		severity: "medium",
		metadata: {
			agencyName: result.name,
			agencyId: id,
			updatedFields: Object.keys(updateData),
		},
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Agency updated successfully",
		data: result,
	});
};

export const deleteAgencyController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Agency ID is required");
	}

	// Get the instructor ID from the authenticated user
	const instructorId = (req.user as any)?.id;

	const agency = await findAgencyByID(id, instructorId);

	if (!agency) {
		throw new NotFoundError("Agency not found");
	}

	await deleteAgencyData(id);

	// Log audit event
	await logAuditEvent(req, {
		action: "Agency Deleted",
		resource: "Agency Management",
		resourceId: id,
		details: `Deleted agency: ${agency.name}`,
		category: "user_management",
		severity: "high",
		metadata: {
			agencyName: agency.name,
			agencyId: id,
		},
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Agency deleted successfully",
	});
};

export const getArchivedAgenciesController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "" } = req.query;

	const result = await getArchivedAgenciesData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		data: result,
	});
};

export const restoreAgencyController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Agency ID is required.");
	}

	const agency = await restoreAgencyData(id);

	// Log audit event
	await logAuditEvent(req, {
		action: "Agency Restored",
		resource: "Agency Management",
		resourceId: id,
		details: `Restored agency: ${agency.name}`,
		category: "user_management",
		severity: "medium",
		metadata: {
			agencyName: agency.name,
			agencyId: id,
		},
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Agency restored successfully",
		data: agency,
	});
};

export const hardDeleteAgencyController = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		if (!id) {
			throw new BadRequestError("Agency ID is required.");
		}

		// Get agency details before deletion for audit logging
		const agency = await findAgencyByID(id);
		const agencyName = agency ? agency.name : "Unknown";

		await hardDeleteAgencyData(id);

		// Log audit event
		await logAuditEvent(req, {
			action: "Agency Hard Deleted",
			resource: "Agency Management",
			resourceId: id,
			details: `Permanently deleted agency: ${agencyName}`,
			category: "user_management",
			severity: "high",
			metadata: {
				agencyName: agencyName,
				agencyId: id,
			},
		});

		res.status(StatusCodes.OK).json({
			success: true,
			message: "Agency permanently deleted successfully",
		});
	} catch (error: any) {
		res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
			success: false,
			message: error.message || "Failed to permanently delete agency",
		});
	}
};

// Supervisor Management Controllers

export const createSupervisorController = async (req: Request, res: Response) => {
	const {
		agencyId,
		name,
		email,
		phone,
		position,
		department,
		isActive = true,
	}: SupervisorData = req.body;

	if (!agencyId || !name || !email || !phone || !position) {
		throw new BadRequestError("Please provide all necessary supervisor data.");
	}

	// Get the instructor ID from the authenticated user
	const instructorId = (req.user as any)?.id;

	const supervisorData = {
		agencyId,
		name,
		email,
		phone,
		position,
		department,
		isActive,
		createdByInstructorId: instructorId, // Track who created this supervisor
	};

	const result = await createSupervisorData(supervisorData);

	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Supervisor created successfully",
		data: result,
	});
};

export const getSupervisorsController = async (req: Request, res: Response) => {
	const { agencyId } = req.params;
	const { page = 1, limit = 10, search = "", status = "all" } = req.query;

	if (!agencyId) {
		throw new BadRequestError("Agency ID is required");
	}

	// Get the instructor ID from the authenticated user
	const instructorId = (req.user as any)?.id;

	const result = await getSupervisorsData({
		agencyId,
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: status as string,
		instructorId,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Supervisors retrieved successfully",
		data: result,
	});
};

export const getSupervisorController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Supervisor ID is required");
	}

	const supervisor = await findSupervisorByID(id);

	if (!supervisor) {
		throw new NotFoundError("Supervisor not found");
	}

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Supervisor retrieved successfully",
		data: supervisor,
	});
};

export const updateSupervisorController = async (req: Request, res: Response) => {
	const { id } = req.params;
	const updateData = req.body;

	if (!id) {
		throw new BadRequestError("Supervisor ID is required");
	}

	const supervisor = await findSupervisorByID(id);

	if (!supervisor) {
		throw new NotFoundError("Supervisor not found");
	}

	// Get the instructor ID from the authenticated user for ownership check
	const instructorId = (req.user as any)?.id;

	const result = await updateSupervisorData(id, updateData, instructorId);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Supervisor updated successfully",
		data: result,
	});
};

export const deleteSupervisorController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Supervisor ID is required");
	}

	const supervisor = await findSupervisorByID(id);

	if (!supervisor) {
		throw new NotFoundError("Supervisor not found");
	}

	// Get the instructor ID from the authenticated user for ownership check
	const instructorId = (req.user as any)?.id;

	await deleteSupervisorData(id, instructorId);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Supervisor deleted successfully",
	});
};

export const getAgencySupervisorStatsController = async (req: Request, res: Response) => {
	const { agencyId } = req.params;

	if (!agencyId) {
		throw new BadRequestError("Agency ID is required");
	}

	// Get the instructor ID from the authenticated user
	const instructorId = (req.user as any)?.id;

	const stats = await getAgencySupervisorStats(agencyId, instructorId);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Supervisor statistics retrieved successfully",
		data: stats,
	});
};
