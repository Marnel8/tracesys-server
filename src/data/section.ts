import { Op } from "sequelize";
import sequelize from "@/db";
import Section from "@/db/models/section";
import Course from "@/db/models/course";
import Department from "@/db/models/department";
import StudentEnrollment from "@/db/models/student-enrollment";
import User from "@/db/models/user";
import AuditLog from "@/db/models/audit-log";
import { NotFoundError } from "@/utils/error";

interface CreateSectionParams {
	name: string;
	code?: string;
	description?: string;
	courseId: string;
	instructorId: string;
	year: string;
	semester: string;
	academicYear: string;
	maxStudents?: number;
	isActive?: boolean;
	schedule?: string;
	room?: string;
	startDate?: Date;
	endDate?: Date;
}

interface GetSectionsParams {
	page: number;
	limit: number;
	search?: string;
	status?: string;
	courseId?: string;
	year?: string;
	semester?: string;
	instructorId: string;
}

export const createSectionData = async (data: CreateSectionParams) => {
	try {
		// Check if section with same name or code already exists for the same course
		const orConditions: any[] = [{ name: data.name }];
		if (data.code) {
			orConditions.push({ code: data.code });
		}
		
		const existingSection = await Section.findOne({
			where: {
				[Op.or]: orConditions,
				courseId: data.courseId,
			},
		});

		if (existingSection) {
			throw new Error("Section with this name or code already exists for this course");
		}

		const section = await Section.create(data as any);

		return {
			section,
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to create section");
	}
};

export const getSectionsData = async (params: GetSectionsParams) => {
	try {
		const { page, limit, search, status, courseId, year, semester, instructorId } = params;
		const offset = (page - 1) * limit;

		// Build where clause
		const whereClause: any = {
			instructorId, // Scope to the authenticated instructor
		};

		if (search) {
			whereClause[Op.or] = [
				{ name: { [Op.like]: `%${search}%` } },
				{ code: { [Op.like]: `%${search}%` } },
			];
		}

		if (status && status !== "all") {
			whereClause.isActive = status === "active";
		}

		if (courseId) {
			whereClause.courseId = courseId;
		}

		if (year) {
			whereClause.year = year;
		}

		if (semester) {
			whereClause.semester = semester;
		}

		const { count, rows: sections } = await Section.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["createdAt", "DESC"]],
			include: [
				{
					model: Course,
					as: "course",
					required: true,
					include: [
						{
							model: Department,
							as: "department",
							required: true,
						},
					],
				},
			],
		});

		const totalPages = Math.ceil(count / limit);

		return {
			sections,
			pagination: {
				currentPage: page,
				totalPages,
				totalItems: count,
				itemsPerPage: limit,
			},
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to retrieve sections");
	}
};

export const findSectionByID = async (id: string) => {
	try {
		const section = await Section.findByPk(id, {
			include: [
				{
					model: Course,
					as: "course",
					required: true,
					include: [
						{
							model: Department,
							as: "department",
							required: true,
						},
					],
				},
			],
		});

		return section;
	} catch (error: any) {
		throw new Error(error.message || "Failed to find section");
	}
};

export const updateSectionData = async (id: string, updateData: Partial<CreateSectionParams>) => {
	try {
		const section = await Section.findByPk(id);

		if (!section) {
			throw new Error("Section not found");
		}

		// Check if name or code is being updated and if it conflicts with existing section
		if (updateData.name || updateData.code) {
			const whereClause: any = {
				id: { [Op.ne]: id },
				courseId: updateData.courseId || section.courseId,
			};

			if (updateData.name) {
				whereClause.name = updateData.name;
			}
			if (updateData.code) {
				whereClause.code = updateData.code;
			}

			const existingSection = await Section.findOne({
				where: whereClause,
			});

			if (existingSection) {
				throw new Error("Section with this name or code already exists for this course");
			}
		}

		await section.update(updateData);

		return section;
	} catch (error: any) {
		throw new Error(error.message || "Failed to update section");
	}
};

export const deleteSectionData = async (id: string) => {
	try {
		const section = await Section.findByPk(id);

		if (!section) {
			throw new Error("Section not found");
		}

		// Soft delete by setting isActive to false
		await section.update({ isActive: false });

		return section;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete section");
	}
};

export const getArchivedSectionsData = async (params: {
	page: number;
	limit: number;
	search: string;
}) => {
	try {
		const { page, limit, search } = params;
		const offset = (page - 1) * limit;

		const whereClause: any = {
			isActive: false, // Only include archived (inactive) sections
		};

		if (search) {
			whereClause[Op.or] = [
				{ name: { [Op.like]: `%${search}%` } },
				{ code: { [Op.like]: `%${search}%` } },
			];
		}

		const { count, rows: sections } = await Section.findAndCountAll({
			where: whereClause,
			include: [
				{
					model: Course,
					as: "course",
					include: [
						{
							model: Department,
							as: "department",
						},
					],
				},
			],
			limit,
			offset,
			order: [["updatedAt", "DESC"]],
		});

		// Look up who deleted each section from the audit logs
		const sectionIds = sections.map((s) => s.id);
		let deletedByMap: Record<string, string> = {};

		if (sectionIds.length > 0) {
			const deletionLogs = await AuditLog.findAll({
				where: {
					resource: "System",
					action: "System Operation",
					resourceId: { [Op.in]: sectionIds },
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
				const sid = log.resourceId as string;
				if (!sid) continue;
				if (deletedByMap[sid]) continue;

				const deleter = log.user as User | undefined;
				if (deleter) {
					const fullName = `${deleter.firstName ?? ""} ${deleter.lastName ?? ""}`.trim();
					deletedByMap[sid] = fullName || deleter.email || "Unknown";
				} else {
					deletedByMap[sid] = "Unknown";
				}
			}
		}

		// Transform to archive format
		const items = sections.map((section) => ({
			id: section.id,
			type: "section" as const,
			name: section.name,
			deletedAt: section.updatedAt.toISOString(),
			deletedBy: deletedByMap[section.id] ?? null,
			meta: {
				code: section.code,
				course: section.course?.name,
				courseCode: section.course?.code,
				academicYear: section.academicYear,
			},
			raw: section.toJSON(),
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
		throw new Error(error.message || "Failed to retrieve archived sections");
	}
};

export const restoreSectionData = async (id: string) => {
	const t = await sequelize.transaction();

	try {
		const section = await Section.findOne({
			where: { id, isActive: false },
			transaction: t,
		});

		if (!section) {
			await t.rollback();
			throw new NotFoundError("Archived section not found.");
		}

		// Restore by setting isActive to true
		await section.update({ isActive: true }, { transaction: t });

		await t.commit();

		return section;
	} catch (error) {
		await t.rollback();
		throw error;
	}
};

export const hardDeleteSectionData = async (id: string) => {
	const t = await sequelize.transaction();

	try {
		const section = await Section.findOne({
			where: { id, isActive: false },
			transaction: t,
		});

		if (!section) {
			await t.rollback();
			throw new NotFoundError("Archived section not found.");
		}

		// Check if section has enrolled students
		const enrolledStudents = await StudentEnrollment.count({
			where: { sectionId: id },
			transaction: t,
		});

		if (enrolledStudents > 0) {
			await t.rollback();
			throw new Error("Cannot permanently delete section with enrolled students");
		}

		// Finally, delete the section
		await section.destroy({ transaction: t });

		await t.commit();

		return { success: true };
	} catch (error) {
		await t.rollback();
		throw error;
	}
};
