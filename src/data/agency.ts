import { Op } from "sequelize";
import sequelize from "@/db";
import Agency from "@/db/models/agency";
import Supervisor from "@/db/models/supervisor";
import Practicum from "@/db/models/practicum";
import User from "@/db/models/user";
import AuditLog from "@/db/models/audit-log";
import { NotFoundError } from "@/utils/error";

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
	instructorId?: string; // Optional - for tracking who created it, but not used for filtering
}

interface GetAgenciesParams {
	page: number;
	limit: number;
	search?: string;
	status?: string;
	branchType?: string;
	instructorId?: string;
}

interface CreateSupervisorParams {
	agencyId: string;
	name: string;
	email: string;
	phone: string;
	position: string;
	department?: string;
	isActive?: boolean;
	createdByInstructorId?: string;
}

interface GetSupervisorsParams {
	agencyId: string;
	page: number;
	limit: number;
	search?: string;
	status?: string;
	instructorId?: string;
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
		const { page, limit, search, status, branchType, instructorId } = params;
		const offset = (page - 1) * limit;

		// Build where clause
		const whereClause: any = {};

		// Agencies are now shared - no instructor filtering

		if (search) {
			whereClause[Op.or] = [
				{ name: { [Op.like]: `%${search}%` } },
				{ contactPerson: { [Op.like]: `%${search}%` } },
				{ contactEmail: { [Op.like]: `%${search}%` } },
			];
		}

		// When status is "all", default to showing only active agencies (exclude archived ones)
		// When status is "active", show only active agencies
		// When status is "inactive", show inactive agencies
		if (status && status !== "all") {
			whereClause.isActive = status === "active";
		} else {
			// Default to active agencies when status is "all" to exclude archived ones
			whereClause.isActive = true;
		}

		if (branchType && branchType !== "all") {
			whereClause.branchType = branchType;
		}

		// Build supervisor where clause with instructor filtering
		const supervisorWhere: any = { isActive: true };
		if (instructorId) {
			supervisorWhere.createdByInstructorId = instructorId;
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
					where: supervisorWhere,
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

export const findAgencyByID = async (id: string, instructorId?: string) => {
	try {
		// Build supervisor where clause with instructor filtering
		const supervisorWhere: any = { isActive: true };
		if (instructorId) {
			supervisorWhere.createdByInstructorId = instructorId;
		}

		const agency = await Agency.findByPk(id, {
			include: [
				{
					model: Supervisor,
					as: "supervisors",
					where: supervisorWhere,
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

		// Soft delete by setting isActive to false
		await agency.update({ isActive: false });

		return agency;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete agency");
	}
};

export const getArchivedAgenciesData = async (params: {
	page: number;
	limit: number;
	search: string;
}) => {
	try {
		const { page, limit, search } = params;
		const offset = (page - 1) * limit;

		const whereClause: any = {
			isActive: false, // Only include archived (inactive) agencies
		};

		if (search) {
			whereClause[Op.or] = [
				{ name: { [Op.like]: `%${search}%` } },
				{ contactPerson: { [Op.like]: `%${search}%` } },
				{ contactEmail: { [Op.like]: `%${search}%` } },
			];
		}

		const { count, rows: agencies } = await Agency.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["updatedAt", "DESC"]], // Order by updatedAt (deletion time)
		});

		// Look up who deleted each agency from the audit logs
		const agencyIds = agencies.map((a) => a.id);
		let deletedByMap: Record<string, string> = {};

		if (agencyIds.length > 0) {
			const deletionLogs = await AuditLog.findAll({
				where: {
					resource: "Agency Management",
					action: "Agency Deleted",
					resourceId: { [Op.in]: agencyIds },
				},
				include: [
					{
						model: User,
						as: "user",
						attributes: ["id", "firstName", "lastName", "email"],
					},
				],
				order: [["createdAt", "DESC"]],
			});

			for (const log of deletionLogs as any[]) {
				const aid = log.resourceId as string;
				if (!aid) continue;
				if (deletedByMap[aid]) continue;

				const deleter = log.user as User | undefined;
				if (deleter) {
					const fullName = `${deleter.firstName ?? ""} ${deleter.lastName ?? ""}`.trim();
					deletedByMap[aid] = fullName || deleter.email || "Unknown";
				} else {
					deletedByMap[aid] = "Unknown";
				}
			}
		}

		// Transform to archive format
		const items = agencies.map((agency) => ({
			id: agency.id,
			type: "agency" as const,
			name: agency.name,
			deletedAt: agency.updatedAt.toISOString(),
			deletedBy: deletedByMap[agency.id] ?? null,
			meta: {
				contactPerson: agency.contactPerson,
				contactEmail: agency.contactEmail,
				branchType: agency.branchType,
			},
			raw: agency.toJSON(),
		}));

		return {
			items,
			pagination: {
				currentPage: page,
				totalPages: Math.ceil(count / limit),
				totalItems: count,
				itemsPerPage: limit,
			},
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to retrieve archived agencies");
	}
};

export const restoreAgencyData = async (id: string) => {
	const t = await sequelize.transaction();

	try {
		const agency = await Agency.findOne({
			where: { id, isActive: false },
			transaction: t,
		});

		if (!agency) {
			await t.rollback();
			throw new NotFoundError("Archived agency not found.");
		}

		// Restore by setting isActive to true
		await agency.update({ isActive: true }, { transaction: t });

		await t.commit();

		return agency;
	} catch (error) {
		await t.rollback();
		throw error;
	}
};

export const hardDeleteAgencyData = async (id: string) => {
	const t = await sequelize.transaction();

	try {
		const agency = await Agency.findOne({
			where: { id, isActive: false },
			transaction: t,
		});

		if (!agency) {
			await t.rollback();
			throw new NotFoundError("Archived agency not found.");
		}

		// Check if agency has any practicums
		const practicumCount = await Practicum.count({
			where: { agencyId: id },
			transaction: t,
		});

		if (practicumCount > 0) {
			await t.rollback();
			throw new Error("Cannot permanently delete agency with associated practicums");
		}

		// Delete related supervisors
		await Supervisor.destroy({
			where: { agencyId: id },
			transaction: t,
		});

		// Finally, delete the agency
		await agency.destroy({ transaction: t });

		await t.commit();

		return { success: true };
	} catch (error) {
		await t.rollback();
		throw error;
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
		const { agencyId, page, limit, search, status, instructorId } = params;
		const offset = (page - 1) * limit;

		// Check if agency exists
		const agency = await Agency.findByPk(agencyId);
		if (!agency) {
			throw new Error("Agency not found");
		}

		// Build where clause
		const whereClause: any = {
			agencyId,
			...(instructorId && { createdByInstructorId: instructorId }),
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

export const updateSupervisorData = async (id: string, updateData: Partial<CreateSupervisorParams>, instructorId?: string) => {
	try {
		const supervisor = await Supervisor.findByPk(id);

		if (!supervisor) {
			throw new Error("Supervisor not found");
		}

		// Check ownership: only the creator can edit their supervisor
		if (instructorId && supervisor.createdByInstructorId && supervisor.createdByInstructorId !== instructorId) {
			throw new Error("You can only edit supervisors you created");
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

export const deleteSupervisorData = async (id: string, instructorId?: string) => {
	try {
		const supervisor = await Supervisor.findByPk(id);

		if (!supervisor) {
			throw new Error("Supervisor not found");
		}

		// Check ownership: only the creator can delete their supervisor
		if (instructorId && supervisor.createdByInstructorId && supervisor.createdByInstructorId !== instructorId) {
			throw new Error("You can only delete supervisors you created");
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

export const getAgencySupervisorStats = async (agencyId: string, instructorId?: string) => {
	try {
		// Check if agency exists
		const agency = await Agency.findByPk(agencyId);
		if (!agency) {
			throw new Error("Agency not found");
		}

		// Build base where clause
		const baseWhere: any = {
			agencyId,
			...(instructorId && { createdByInstructorId: instructorId }),
		};

		const totalSupervisors = await Supervisor.count({
			where: baseWhere,
		});

		const activeSupervisors = await Supervisor.count({
			where: { ...baseWhere, isActive: true },
		});

		const inactiveSupervisors = totalSupervisors - activeSupervisors;

		const supervisorsWithPracticums = await Supervisor.count({
			where: {
				...baseWhere,
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
