import { Op } from "sequelize";
import Agency from "@/db/models/agency";
import Supervisor from "@/db/models/supervisor";
import Practicum from "@/db/models/practicum";
import User from "@/db/models/user";

interface CreateAgencyParams {
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

interface GetAgenciesParams {
	page: number;
	limit: number;
	search?: string;
	status?: string;
	branchType?: string;
}

interface CreateSupervisorParams {
	agencyId: string;
	name: string;
	email: string;
	phone: string;
	position: string;
	department?: string;
	isActive?: boolean;
}

interface GetSupervisorsParams {
	agencyId: string;
	page: number;
	limit: number;
	search?: string;
	status?: string;
}

export const createAgencyData = async (data: CreateAgencyParams) => {
	try {
		// Check if agency with same name already exists
		const existingAgency = await Agency.findOne({
			where: {
				name: data.name,
			},
		});

		if (existingAgency) {
			throw new Error("Agency with this name already exists");
		}

		const agency = await Agency.create(data as any);

		return {
			agency,
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to create agency");
	}
};

export const getAgenciesData = async (params: GetAgenciesParams) => {
	try {
		const { page, limit, search, status, branchType } = params;
		const offset = (page - 1) * limit;

		// Build where clause
		const whereClause: any = {};

		if (search) {
			whereClause[Op.or] = [
				{ name: { [Op.like]: `%${search}%` } },
				{ contactPerson: { [Op.like]: `%${search}%` } },
				{ contactEmail: { [Op.like]: `%${search}%` } },
			];
		}

		if (status && status !== "all") {
			whereClause.isActive = status === "active";
		}

		if (branchType && branchType !== "all") {
			whereClause.branchType = branchType;
		}

		const { count, rows: agencies } = await Agency.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["createdAt", "DESC"]],
			include: [
				{
					model: Supervisor,
					as: "supervisors",
					where: { isActive: true },
					required: false,
					attributes: ["id", "name", "email", "position", "isActive"],
				},
				{
					model: Practicum,
					as: "practicums",
					where: { status: "active" },
					required: false,
					attributes: ["id", "status", "position", "startDate", "endDate", "totalHours", "completedHours", "studentId"],
					include: [
						{
							model: User,
							as: "student",
							required: false,
							attributes: ["id", "firstName", "lastName", "studentId", "email"],
						},
					],
				},
			],
		});

		const totalPages = Math.ceil(count / limit);

		return {
			agencies,
			pagination: {
				currentPage: page,
				totalPages,
				totalItems: count,
				itemsPerPage: limit,
			},
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to retrieve agencies");
	}
};

export const findAgencyByID = async (id: string) => {
	try {
		const agency = await Agency.findByPk(id, {
			include: [
				{
					model: Supervisor,
					as: "supervisors",
					where: { isActive: true },
					required: false,
					attributes: ["id", "name", "email", "phone", "position", "department", "isActive", "createdAt"],
				},
				{
					model: Practicum,
					as: "practicums",
					where: { status: "active" },
					required: false,
					attributes: ["id", "status", "position", "startDate", "endDate", "totalHours", "completedHours", "workSetup", "studentId"],
					include: [
						{
							model: User,
							as: "student",
							required: false,
							attributes: ["id", "firstName", "lastName", "studentId", "email"],
						},
					],
				},
			],
		});

		return agency;
	} catch (error: any) {
		throw new Error(error.message || "Failed to find agency");
	}
};

export const updateAgencyData = async (id: string, updateData: Partial<CreateAgencyParams>) => {
	try {
		const agency = await Agency.findByPk(id);

		if (!agency) {
			throw new Error("Agency not found");
		}

		// Check if name is being updated and if it conflicts with existing agency
		if (updateData.name && updateData.name !== agency.name) {
			const existingAgency = await Agency.findOne({
				where: {
					name: updateData.name,
					id: { [Op.ne]: id },
				},
			});

			if (existingAgency) {
				throw new Error("Agency with this name already exists");
			}
		}

		await agency.update(updateData);

		return agency;
	} catch (error: any) {
		throw new Error(error.message || "Failed to update agency");
	}
};

export const deleteAgencyData = async (id: string) => {
	try {
		const agency = await Agency.findByPk(id);

		if (!agency) {
			throw new Error("Agency not found");
		}

		// Check if agency has active practicums
		const activePracticums = await Practicum.count({
			where: {
				agencyId: id,
				status: "active",
			},
		});

		if (activePracticums > 0) {
			throw new Error("Cannot delete agency with active practicums");
		}

		await agency.destroy();

		return true;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete agency");
	}
};

// Supervisor Management Functions

export const createSupervisorData = async (data: CreateSupervisorParams) => {
	try {
		// Check if agency exists
		const agency = await Agency.findByPk(data.agencyId);
		if (!agency) {
			throw new Error("Agency not found");
		}

		// Check if supervisor with same email already exists in this agency
		const existingSupervisor = await Supervisor.findOne({
			where: {
				agencyId: data.agencyId,
				email: data.email,
			},
		});

		if (existingSupervisor) {
			throw new Error("Supervisor with this email already exists in this agency");
		}

		const supervisor = await Supervisor.create(data as any);

		return {
			supervisor,
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to create supervisor");
	}
};

export const getSupervisorsData = async (params: GetSupervisorsParams) => {
	try {
		const { agencyId, page, limit, search, status } = params;
		const offset = (page - 1) * limit;

		// Check if agency exists
		const agency = await Agency.findByPk(agencyId);
		if (!agency) {
			throw new Error("Agency not found");
		}

		// Build where clause
		const whereClause: any = {
			agencyId,
		};

		if (search) {
			whereClause[Op.or] = [
				{ name: { [Op.like]: `%${search}%` } },
				{ email: { [Op.like]: `%${search}%` } },
				{ position: { [Op.like]: `%${search}%` } },
				{ department: { [Op.like]: `%${search}%` } },
			];
		}

		if (status && status !== "all") {
			whereClause.isActive = status === "active";
		}

		const { count, rows: supervisors } = await Supervisor.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["createdAt", "DESC"]],
			include: [
				{
					model: Agency,
					as: "agency",
					attributes: ["id", "name"],
				},
			],
		});

		const totalPages = Math.ceil(count / limit);

		return {
			supervisors,
			pagination: {
				currentPage: page,
				totalPages,
				totalItems: count,
				itemsPerPage: limit,
			},
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to retrieve supervisors");
	}
};

export const findSupervisorByID = async (id: string) => {
	try {
		const supervisor = await Supervisor.findByPk(id, {
			include: [
				{
					model: Agency,
					as: "agency",
					attributes: ["id", "name", "address"],
				},
			],
		});

		return supervisor;
	} catch (error: any) {
		throw new Error(error.message || "Failed to find supervisor");
	}
};

export const updateSupervisorData = async (id: string, updateData: Partial<CreateSupervisorParams>) => {
	try {
		const supervisor = await Supervisor.findByPk(id);

		if (!supervisor) {
			throw new Error("Supervisor not found");
		}

		// Check if email is being updated and if it conflicts with existing supervisor
		if (updateData.email && updateData.email !== supervisor.email) {
			const existingSupervisor = await Supervisor.findOne({
				where: {
					email: updateData.email,
					agencyId: supervisor.agencyId,
					id: { [Op.ne]: id },
				},
			});

			if (existingSupervisor) {
				throw new Error("Supervisor with this email already exists in this agency");
			}
		}

		await supervisor.update(updateData);

		return supervisor;
	} catch (error: any) {
		throw new Error(error.message || "Failed to update supervisor");
	}
};

export const deleteSupervisorData = async (id: string) => {
	try {
		const supervisor = await Supervisor.findByPk(id);

		if (!supervisor) {
			throw new Error("Supervisor not found");
		}

		// Check if supervisor has active practicums
		const activePracticums = await Practicum.count({
			where: {
				supervisorId: id,
				status: "active",
			},
		});

		if (activePracticums > 0) {
			throw new Error("Cannot delete supervisor with active practicums");
		}

		await supervisor.destroy();

		return true;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete supervisor");
	}
};

export const getAgencySupervisorStats = async (agencyId: string) => {
	try {
		// Check if agency exists
		const agency = await Agency.findByPk(agencyId);
		if (!agency) {
			throw new Error("Agency not found");
		}

		const totalSupervisors = await Supervisor.count({
			where: { agencyId },
		});

		const activeSupervisors = await Supervisor.count({
			where: { agencyId, isActive: true },
		});

		const inactiveSupervisors = totalSupervisors - activeSupervisors;

		const supervisorsWithPracticums = await Supervisor.count({
			where: {
				agencyId,
				isActive: true,
			},
			include: [
				{
					model: Practicum,
					as: "practicums",
					where: { status: "active" },
					required: true,
				},
			],
		});

		return {
			totalSupervisors,
			activeSupervisors,
			inactiveSupervisors,
			supervisorsWithPracticums,
			supervisorsWithoutPracticums: activeSupervisors - supervisorsWithPracticums,
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to get supervisor statistics");
	}
};
