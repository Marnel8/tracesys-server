import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "@/utils/error";
import upload from "@/utils/uploader";
import path from "path";
import {
	createRequirementTemplateData,
	getRequirementTemplatesData,
	findRequirementTemplateByID,
	updateRequirementTemplateData,
	deleteRequirementTemplateData,
} from "@/data/requirement-template";

export const createRequirementTemplateController = async (
	req: Request,
	res: Response
) => {
	const {
		title,
		description,
		category,
		priority,
		isRequired = true,
		instructions = null,
		allowedFileTypes = [],
		maxFileSize = null,
		isActive = true,
	} = req.body;

	if (!title || !description || !category || !priority) {
		throw new BadRequestError("Please provide all required fields.");
	}

	const createdBy = req.user?.id;
	if (!createdBy) {
		throw new BadRequestError("Missing authenticated user context");
	}

	// Handle optional uploaded file (field: templateFile)
	let fileMeta: any = {};
	const file = (req as any).file as Express.Multer.File | undefined;
	if (file) {
		// Enforce .docx files only
		const isDocxMime = file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
		const isDocxExt = path.extname(file.originalname).toLowerCase() === ".docx";
		if (!isDocxMime && !isDocxExt) {
			throw new BadRequestError("Only .docx template files are allowed");
		}
		fileMeta = {
			templateFileUrl: `/uploads/${path.basename(file.path)}`,
			templateFileName: file.originalname,
			templateFileType: file.mimetype,
			templateFileSize: file.size,
		};
	}

	const result = await createRequirementTemplateData({
		title,
		description,
		category,
		priority,
		isRequired,
		instructions,
		allowedFileTypes: ["DOCX"],
		maxFileSize,
		isActive,
		createdBy,
		...fileMeta,
	});

	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Requirement template created successfully",
		data: result,
	});
};

export const getRequirementTemplatesController = async (
	req: Request,
	res: Response
) => {
	const { page = 1, limit = 10, search = "", status = "all" } = req.query;

	const result = await getRequirementTemplatesData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: status as string,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Requirement templates retrieved successfully",
		data: result,
	});
};

export const getRequirementTemplateController = async (
	req: Request,
	res: Response
) => {
	const { id } = req.params;
	if (!id) {
		throw new BadRequestError("Template ID is required");
	}

	const template = await findRequirementTemplateByID(id);
	if (!template) {
		throw new NotFoundError("Requirement template not found");
	}

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Requirement template retrieved successfully",
		data: template,
	});
};

export const updateRequirementTemplateController = async (
	req: Request,
	res: Response
) => {
	const { id } = req.params;
	if (!id) {
		throw new BadRequestError("Template ID is required");
	}

	const template = await findRequirementTemplateByID(id);
	if (!template) {
		throw new NotFoundError("Requirement template not found");
	}

	let update = { ...req.body } as any;
	const file = (req as any).file as Express.Multer.File | undefined;
	if (file) {
		const isDocxMime = file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
		const isDocxExt = path.extname(file.originalname).toLowerCase() === ".docx";
		if (!isDocxMime && !isDocxExt) {
			throw new BadRequestError("Only .docx template files are allowed");
		}
		update.templateFileUrl = `/uploads/${path.basename(file.path)}`;
		update.templateFileName = file.originalname;
		update.templateFileType = file.mimetype;
		update.templateFileSize = file.size;
	}

	// Force allowed file types to DOCX only
	update.allowedFileTypes = ["DOCX"];

	const result = await updateRequirementTemplateData(id, update);
	res.status(StatusCodes.OK).json({
		success: true,
		message: "Requirement template updated successfully",
		data: result,
	});
};

export const deleteRequirementTemplateController = async (
	req: Request,
	res: Response
) => {
	const { id } = req.params;
	if (!id) {
		throw new BadRequestError("Template ID is required");
	}

	const template = await findRequirementTemplateByID(id);
	if (!template) {
		throw new NotFoundError("Requirement template not found");
	}

	await deleteRequirementTemplateData(id);
	res.status(StatusCodes.OK).json({
		success: true,
		message: "Requirement template deleted successfully",
	});
};


