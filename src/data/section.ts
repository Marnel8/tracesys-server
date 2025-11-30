import { Op } from "sequelize";
import Section from "@/db/models/section";
import Course from "@/db/models/course";
import Department from "@/db/models/department";

interface CreateSectionParams {
	name: string;
	code: string;
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
}

export const createSectionData = async (data: CreateSectionParams) => {
	try {
		// Check if section with same name or code already exists for the same course
		const existingSection = await Section.findOne({
			where: {
				[Op.or]: [
					{ name: data.name },
					{ code: data.code }
				],
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
		const { page, limit, search, status, courseId, year, semester } = params;
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

		// Check if section has enrolled students
		// Note: This would need to be implemented based on your student enrollment model
		// const enrolledStudents = await StudentEnrollment.count({
		// 	where: {
		// 		sectionId: id,
		// 	},
		// });

		// if (enrolledStudents > 0) {
		// 	throw new Error("Cannot delete section with enrolled students");
		// }

		await section.destroy();

		return true;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete section");
	}
};
