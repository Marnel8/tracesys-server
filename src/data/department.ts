import { Op } from "sequelize";
import Department from "@/db/models/department";
import Course from "@/db/models/course";

interface CreateDepartmentParams {
	name: string;
	code: string;
	description?: string;
	isActive?: boolean;
	headId?: string;
	color?: string;
	icon?: string;
}

interface GetDepartmentsParams {
	page: number;
	limit: number;
	search?: string;
	status?: string;
}

export const createDepartmentData = async (data: CreateDepartmentParams) => {
	try {
		// Check if department with same name or code already exists
		const existingDepartment = await Department.findOne({
			where: {
				[Op.or]: [
					{ name: data.name },
					{ code: data.code }
				]
			},
		});

		if (existingDepartment) {
			throw new Error("Department with this name or code already exists");
		}

		const department = await Department.create(data as any);

		return {
			department,
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to create department");
	}
};

export const getDepartmentsData = async (params: GetDepartmentsParams) => {
	try {
		const { page, limit, search, status } = params;
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

		const { count, rows: departments } = await Department.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["createdAt", "DESC"]],
			include: [
				{
					model: Course,
					as: "courses",
					where: { isActive: true },
					required: false,
				},
			],
		});

		const totalPages = Math.ceil(count / limit);

		console.log(departments);

		return {
			departments,
			pagination: {
				currentPage: page,
				totalPages,
				totalItems: count,
				itemsPerPage: limit,
			},
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to retrieve departments");
	}
};

export const findDepartmentByID = async (id: string) => {
	try {
		const department = await Department.findByPk(id, {
			include: [
				{
					model: Course,
					as: "courses",
					where: { isActive: true },
					required: false,
				},
			],
		});

		return department;
	} catch (error: any) {
		throw new Error(error.message || "Failed to find department");
	}
};

export const updateDepartmentData = async (id: string, updateData: Partial<CreateDepartmentParams>) => {
	try {
		const department = await Department.findByPk(id);

		if (!department) {
			throw new Error("Department not found");
		}

		// Check if name or code is being updated and if it conflicts with existing department
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

			const existingDepartment = await Department.findOne({
				where: whereClause,
			});

			if (existingDepartment) {
				throw new Error("Department with this name or code already exists");
			}
		}

		await department.update(updateData);

		return department;
	} catch (error: any) {
		throw new Error(error.message || "Failed to update department");
	}
};

export const deleteDepartmentData = async (id: string) => {
	try {
		const department = await Department.findByPk(id);

		if (!department) {
			throw new Error("Department not found");
		}

		// Check if department has active courses
		const activeCourses = await Course.count({
			where: {
				departmentId: id,
				isActive: true,
			},
		});

		if (activeCourses > 0) {
			throw new Error("Cannot delete department with active courses");
		}

		await department.destroy();

		return true;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete department");
	}
};
