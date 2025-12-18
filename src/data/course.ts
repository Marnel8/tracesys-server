import { Op } from "sequelize";
import sequelize from "@/db";
import Course from "@/db/models/course";
import Department from "@/db/models/department";
import Section from "@/db/models/section";
import User from "@/db/models/user";
import AuditLog from "@/db/models/audit-log";
import { NotFoundError } from "@/utils/error";

interface CreateCourseParams {
	name: string;
	code: string;
	description?: string;
	departmentId: string;
	isActive?: boolean;
	credits?: number;
	prerequisites?: string;
	objectives?: string;
	totalHours?: number;
	level?: string;
}

interface GetCoursesParams {
	page: number;
	limit: number;
	search?: string;
	status?: string;
	departmentId?: string;
}

export const createCourseData = async (data: CreateCourseParams) => {
	try {
		// Check if course with same name or code already exists
		const existingCourse = await Course.findOne({
			where: {
				[Op.or]: [
					{ name: data.name },
					{ code: data.code }
				]
			},
		});

		if (existingCourse) {
			throw new Error("Course with this name or code already exists");
		}

		const course = await Course.create(data as any);

		return {
			course,
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to create course");
	}
};

export const getCoursesData = async (params: GetCoursesParams) => {
	try {
		const { page, limit, search, status, departmentId } = params;
		const offset = (page - 1) * limit;

		// Build where clause
		const whereClause: any = {};

		if (search) {
			whereClause[Op.or] = [
				{ name: { [Op.like]: `%${search}%` } },
				{ code: { [Op.like]: `%${search}%` } },
			];
		}

		if (status && status !== "all") {
			whereClause.isActive = status === "active";
		}

		if (departmentId) {
			whereClause.departmentId = departmentId;
		}

		const { count, rows: courses } = await Course.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["createdAt", "DESC"]],
			include: [
				{
					model: Department,
					as: "department",
					required: true,
				},
				{
					model: Section,
					as: "sections",
					where: { isActive: true },
					required: false,
				},
			],
		});

		const totalPages = Math.ceil(count / limit);

		return {
			courses,
			pagination: {
				currentPage: page,
				totalPages,
				totalItems: count,
				itemsPerPage: limit,
			},
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to retrieve courses");
	}
};

export const findCourseByID = async (id: string) => {
	try {
		const course = await Course.findByPk(id, {
			include: [
				{
					model: Department,
					as: "department",
					required: true,
				},
				{
					model: Section,
					as: "sections",
					where: { isActive: true },
					required: false,
				},
			],
		});

		return course;
	} catch (error: any) {
		throw new Error(error.message || "Failed to find course");
	}
};

export const updateCourseData = async (id: string, updateData: Partial<CreateCourseParams>) => {
	try {
		const course = await Course.findByPk(id);

		if (!course) {
			throw new Error("Course not found");
		}

		// Check if name or code is being updated and if it conflicts with existing course
		if (updateData.name || updateData.code) {
			const whereClause: any = {
				id: { [Op.ne]: id },
			};

			if (updateData.name) {
				whereClause.name = updateData.name;
			}
			if (updateData.code) {
				whereClause.code = updateData.code;
			}

			const existingCourse = await Course.findOne({
				where: whereClause,
			});

			if (existingCourse) {
				throw new Error("Course with this name or code already exists");
			}
		}

		await course.update(updateData);

		return course;
	} catch (error: any) {
		throw new Error(error.message || "Failed to update course");
	}
};

export const deleteCourseData = async (id: string) => {
	try {
		const course = await Course.findByPk(id);

		if (!course) {
			throw new Error("Course not found");
		}

		// Check if course has active sections
		const activeSections = await Section.count({
			where: {
				courseId: id,
				isActive: true,
			},
		});

		if (activeSections > 0) {
			throw new Error("Cannot delete course with active sections");
		}

		// Soft delete by setting isActive to false
		await course.update({ isActive: false });

		return course;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete course");
	}
};

export const getArchivedCoursesData = async (params: {
	page: number;
	limit: number;
	search: string;
}) => {
	try {
		const { page, limit, search } = params;
		const offset = (page - 1) * limit;

		const whereClause: any = {
			isActive: false, // Only include archived (inactive) courses
		};

		if (search) {
			whereClause[Op.or] = [
				{ name: { [Op.like]: `%${search}%` } },
				{ code: { [Op.like]: `%${search}%` } },
			];
		}

		const { count, rows: courses } = await Course.findAndCountAll({
			where: whereClause,
			include: [
				{
					model: Department,
					as: "department",
				},
			],
			limit,
			offset,
			order: [["updatedAt", "DESC"]],
		});

		// Look up who deleted each course from the audit logs
		const courseIds = courses.map((c) => c.id);
		let deletedByMap: Record<string, string> = {};

		if (courseIds.length > 0) {
			const deletionLogs = await AuditLog.findAll({
				where: {
					resource: "System",
					action: "System Operation",
					resourceId: { [Op.in]: courseIds },
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
				const cid = log.resourceId as string;
				if (!cid) continue;
				if (deletedByMap[cid]) continue;

				const deleter = log.user as User | undefined;
				if (deleter) {
					const fullName = `${deleter.firstName ?? ""} ${deleter.lastName ?? ""}`.trim();
					deletedByMap[cid] = fullName || deleter.email || "Unknown";
				} else {
					deletedByMap[cid] = "Unknown";
				}
			}
		}

		// Transform to archive format
		const items = courses.map((course) => ({
			id: course.id,
			type: "course" as const,
			name: course.name,
			deletedAt: course.updatedAt.toISOString(),
			deletedBy: deletedByMap[course.id] ?? null,
			meta: {
				code: course.code,
				department: course.department?.name,
			},
			raw: course.toJSON(),
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
		throw new Error(error.message || "Failed to retrieve archived courses");
	}
};

export const restoreCourseData = async (id: string) => {
	const t = await sequelize.transaction();

	try {
		const course = await Course.findOne({
			where: { id, isActive: false },
			transaction: t,
		});

		if (!course) {
			await t.rollback();
			throw new NotFoundError("Archived course not found.");
		}

		// Restore by setting isActive to true
		await course.update({ isActive: true }, { transaction: t });

		await t.commit();

		return course;
	} catch (error) {
		await t.rollback();
		throw error;
	}
};

export const hardDeleteCourseData = async (id: string) => {
	const t = await sequelize.transaction();

	try {
		const course = await Course.findOne({
			where: { id, isActive: false },
			transaction: t,
		});

		if (!course) {
			await t.rollback();
			throw new NotFoundError("Archived course not found.");
		}

		// Check if course has any sections
		const sectionCount = await Section.count({
			where: { courseId: id },
			transaction: t,
		});

		if (sectionCount > 0) {
			await t.rollback();
			throw new Error("Cannot permanently delete course with associated sections");
		}

		// Finally, delete the course
		await course.destroy({ transaction: t });

		await t.commit();

		return { success: true };
	} catch (error) {
		await t.rollback();
		throw error;
	}
};
