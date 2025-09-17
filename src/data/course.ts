import { Op } from "sequelize";
import Course from "@/db/models/course";
import Department from "@/db/models/department";
import Section from "@/db/models/section";

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
				{ name: { [Op.iLike]: `%${search}%` } },
				{ code: { [Op.iLike]: `%${search}%` } },
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

		await course.destroy();

		return true;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete course");
	}
};
