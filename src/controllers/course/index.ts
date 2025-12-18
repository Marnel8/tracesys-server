import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from "@/utils/error";
import { createCourseData, findCourseByID, updateCourseData, deleteCourseData, getCoursesData, getArchivedCoursesData, restoreCourseData, hardDeleteCourseData } from "@/data/course";

// Course data interface
interface CourseData {
	name: string;
	code: string;
	description?: string;
	departmentId: string;
	isActive?: boolean;
}

export const createCourseController = async (req: Request, res: Response) => {
	const {
		name,
		code,
		description,
		departmentId,
		isActive = true,
	}: CourseData = req.body;

	if (!name || !code || !departmentId) {
		throw new BadRequestError("Please provide course name, code, and department.");
	}

	const courseData = {
		name,
		code,
		description,
		departmentId,
		isActive,
	};

	const result = await createCourseData(courseData);

	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Course created successfully",
		data: result,
	});
};

export const getCoursesController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "", status = "all", departmentId } = req.query;

	const result = await getCoursesData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: status as string,
		departmentId: departmentId as string,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Courses retrieved successfully",
		data: result,
	});
};

export const getCourseController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Course ID is required");
	}

	const course = await findCourseByID(id);

	if (!course) {
		throw new NotFoundError("Course not found");
	}

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Course retrieved successfully",
		data: course,
	});
};

export const updateCourseController = async (req: Request, res: Response) => {
	const { id } = req.params;
	const updateData = req.body;

	if (!id) {
		throw new BadRequestError("Course ID is required");
	}

	const course = await findCourseByID(id);

	if (!course) {
		throw new NotFoundError("Course not found");
	}

	const result = await updateCourseData(id, updateData);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Course updated successfully",
		data: result,
	});
};

export const deleteCourseController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Course ID is required");
	}

	const course = await findCourseByID(id);

	if (!course) {
		throw new NotFoundError("Course not found");
	}

	await deleteCourseData(id);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Course deleted successfully",
	});
};

export const getArchivedCoursesController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "" } = req.query;

	const result = await getArchivedCoursesData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		data: result,
	});
};

export const restoreCourseController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Course ID is required.");
	}

	const course = await restoreCourseData(id);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Course restored successfully",
		data: course,
	});
};

export const hardDeleteCourseController = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		if (!id) {
			throw new BadRequestError("Course ID is required.");
		}

		await hardDeleteCourseData(id);

		res.status(StatusCodes.OK).json({
			success: true,
			message: "Course permanently deleted successfully",
		});
	} catch (error: any) {
		res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
			success: false,
			message: error.message || "Failed to permanently delete course",
		});
	}
};
