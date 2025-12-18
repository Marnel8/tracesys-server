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
	getAgencySupervisorStats
} from "@/data/agency";
import { logAuditEvent } from "@/middlewares/audit";

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

	const result = await getAgenciesData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: status as string,
		branchType: branchType as string,
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

	const agency = await findAgencyByID(id);

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

	const agency = await findAgencyByID(id);

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

	const agency = await findAgencyByID(id);

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

	const supervisorData = {
		agencyId,
		name,
		email,
		phone,
		position,
		department,
		isActive,
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

	const result = await getSupervisorsData({
		agencyId,
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: status as string,
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

	const result = await updateSupervisorData(id, updateData);

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

	await deleteSupervisorData(id);

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

	const stats = await getAgencySupervisorStats(agencyId);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Supervisor statistics retrieved successfully",
		data: stats,
	});
};
