import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from "@/utils/error";
import { createSectionData, findSectionByID, updateSectionData, deleteSectionData, getSectionsData, getArchivedSectionsData, restoreSectionData, hardDeleteSectionData } from "../../data/section";

// Section data interface
interface SectionData {
	name: string;
	code?: string;
	description?: string;
	courseId: string;
	year: string;
	semester: string;
	academicYear: string;
	maxStudents?: number;
	isActive?: boolean;
}

export const createSectionController = async (req: Request, res: Response) => {
	const {
		name,
		code,
		description,
		courseId,
		year,
		semester,
		academicYear,
		maxStudents = 50,
		isActive = true,
	}: SectionData = req.body;

	if (!name || !courseId || !year || !semester || !academicYear) {
		throw new BadRequestError("Please provide section name, course, year, semester, and academic year.");
	}

	// Get the instructor ID from the authenticated user
	const instructorId = req.user?.id;
	if (!instructorId) {
		throw new BadRequestError("Instructor ID not found. Please ensure you are logged in.");
	}

	const sectionData = {
		name,
		code,
		description,
		courseId,
		instructorId,
		year,
		semester,
		academicYear,
		maxStudents,
		isActive,
	};

	const result = await createSectionData(sectionData);

	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Section created successfully",
		data: result,
	});
};

export const getSectionsController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "", status = "all", courseId, year, semester } = req.query;

	// Allow instructors and admins to view sections
	const authUser = req.user as any;
	const instructorId = authUser?.id;
	const role = authUser?.role;

	if (!instructorId || (role !== "instructor" && role !== "admin")) {
		throw new BadRequestError("Only authenticated instructors and admins can view sections.");
	}

	// Admins can view all sections, instructors only their own
	const result = await getSectionsData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: status as string,
		courseId: courseId as string,
		year: year as string,
		semester: semester as string,
		instructorId: role === "admin" ? undefined : instructorId,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Sections retrieved successfully",
		data: result,
	});
};

export const getSectionController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Section ID is required");
	}

	const section = await findSectionByID(id);

	if (!section) {
		throw new NotFoundError("Section not found");
	}

	// Allow instructors and admins to view sections
	const authUser = req.user as any;
	const instructorId = authUser?.id;
	const role = authUser?.role;
	if (!instructorId || (role !== "instructor" && role !== "admin")) {
		throw new BadRequestError("Only authenticated instructors and admins can view sections.");
	}
	// Admins can view any section, instructors only their own
	if (role === "instructor" && (section as any).instructorId !== instructorId) {
		throw new BadRequestError("You are not allowed to view this section.");
	}

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Section retrieved successfully",
		data: section,
	});
};

export const updateSectionController = async (req: Request, res: Response) => {
	const { id } = req.params;
	const updateData = req.body;

	if (!id) {
		throw new BadRequestError("Section ID is required");
	}

	const section = await findSectionByID(id);

	if (!section) {
		throw new NotFoundError("Section not found");
	}

	const result = await updateSectionData(id, updateData);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Section updated successfully",
		data: result,
	});
};

export const deleteSectionController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Section ID is required");
	}

	const section = await findSectionByID(id);

	if (!section) {
		throw new NotFoundError("Section not found");
	}

	await deleteSectionData(id);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Section deleted successfully",
	});
};

export const getArchivedSectionsController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "" } = req.query;
	const authUser = req.user as any;
	const instructorId = authUser?.role === "instructor" ? authUser.id : undefined;

	const result = await getArchivedSectionsData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		instructorId,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		data: result,
	});
};

export const restoreSectionController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Section ID is required.");
	}

	const section = await restoreSectionData(id);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Section restored successfully",
		data: section,
	});
};

export const hardDeleteSectionController = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		if (!id) {
			throw new BadRequestError("Section ID is required.");
		}

		await hardDeleteSectionData(id);

		res.status(StatusCodes.OK).json({
			success: true,
			message: "Section permanently deleted successfully",
		});
	} catch (error: any) {
		res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
			success: false,
			message: error.message || "Failed to permanently delete section",
		});
	}
};
