import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from "@/utils/error";
import { createDepartmentData, findDepartmentByID, updateDepartmentData, deleteDepartmentData, getDepartmentsData } from "@/data/department";

// Department data interface
interface DepartmentData {
	name: string;
	code: string;
	description?: string;
	isActive?: boolean;
}

export const createDepartmentController = async (req: Request, res: Response) => {
	const {
		name,
		code,
		description,
		isActive = true,
	}: DepartmentData = req.body;

	if (!name || !code) {
		throw new BadRequestError("Please provide department name and code.");
	}

	const departmentData = {
		name,
		code,
		description,
		isActive,
	};

	const result = await createDepartmentData(departmentData);

	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Department created successfully",
		data: result,
	});
};

export const getDepartmentsController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "", status = "all" } = req.query;

	const result = await getDepartmentsData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: status as string,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Departments retrieved successfully",
		data: result,
	});
};

export const getDepartmentController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Department ID is required");
	}

	const department = await findDepartmentByID(id);

	if (!department) {
		throw new NotFoundError("Department not found");
	}

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Department retrieved successfully",
		data: department,
	});
};

export const updateDepartmentController = async (req: Request, res: Response) => {
	const { id } = req.params;
	const updateData = req.body;

	if (!id) {
		throw new BadRequestError("Department ID is required");
	}

	const department = await findDepartmentByID(id);

	if (!department) {
		throw new NotFoundError("Department not found");
	}

	const result = await updateDepartmentData(id, updateData);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Department updated successfully",
		data: result,
	});
};

export const deleteDepartmentController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Department ID is required");
	}

	const department = await findDepartmentByID(id);

	if (!department) {
		throw new NotFoundError("Department not found");
	}

	await deleteDepartmentData(id);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Department deleted successfully",
	});
};
