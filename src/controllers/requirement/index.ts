import { Request, Response } from "express";
import path from "path";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/utils/error";
import upload from "@/utils/uploader";
import Requirement from "@/db/models/requirement";
import RequirementTemplate from "@/db/models/requirement-template";
import FileAttachment from "@/db/models/file-attachment";
import {
	approveRequirementData,
	createRequirementFromTemplateData,
	findRequirementByID,
	getRequirementsData,
	rejectRequirementData,
	updateRequirementFileData,
	getRequirementStatsData,
} from "@/data/requirement";

export const createRequirementFromTemplateController = async (
	req: Request,
	res: Response
) => {
	const { templateId, studentId, practicumId = null, dueDate = null } = req.body;
	if (!templateId || !studentId) {
		throw new BadRequestError("templateId and studentId are required");
	}
	const requirement = await createRequirementFromTemplateData({
		templateId,
		studentId,
		practicumId,
		dueDate,
	});
	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Requirement created from template",
		data: requirement,
	});
};

export const getRequirementsController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "", status = "all", studentId, practicumId } =
		req.query as any;
	const result = await getRequirementsData({
		page: Number(page),
		limit: Number(limit),
		search: search || "",
		status: status || "all",
		studentId: studentId || undefined,
		practicumId: practicumId || undefined,
		instructorId: req.user?.role === "instructor" ? req.user.id : undefined,
	});
	res.status(StatusCodes.OK).json({ success: true, message: "Requirements retrieved", data: result });
};

export const getInstructorRequirementsController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "", status = "all", studentId, practicumId } =
		req.query as any;
	const result = await getRequirementsData({
		page: Number(page),
		limit: Number(limit),
		search: search || "",
		status: status || "all",
		studentId: studentId || undefined,
		practicumId: practicumId || undefined,
		instructorId: req.user?.id,
	});
	res
		.status(StatusCodes.OK)
		.json({ success: true, message: "Instructor requirements retrieved", data: result });
};

export const getRequirementController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Requirement ID is required");
	const requirement = await findRequirementByID(id);
	if (!requirement) throw new NotFoundError("Requirement not found");
	res.status(StatusCodes.OK).json({ success: true, data: requirement });
};

export const submitRequirementController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Requirement ID is required");
	const studentId = req.user?.id;
	if (!studentId) throw new BadRequestError("Missing authenticated user context");

	const requirement = await Requirement.findByPk(id, { include: [RequirementTemplate] });
	if (!requirement) throw new NotFoundError("Requirement not found");
	if (requirement.studentId !== studentId) {
		throw new UnauthorizedError("You can only submit your own requirements");
	}

	const file = (req as any).file as Express.Multer.File | undefined;
	if (!file) throw new BadRequestError("No file uploaded");

	const template = requirement.template;
	if (!template) throw new BadRequestError("Requirement has no template attached");

	// Validate file type and size
	const allowed = (template.allowedFileTypes || "")
		.split(",")
		.map((s) => s.trim().toLowerCase())
		.filter(Boolean);
	const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
	if (allowed.length && !allowed.includes(ext)) {
		throw new BadRequestError(`Only ${allowed.join(", ")} files are allowed`);
	}
	if (template.maxFileSize && file.size > template.maxFileSize * 1024 * 1024) {
		throw new BadRequestError(`Max file size is ${template.maxFileSize}MB`);
	}

	const fileUrl = `/uploads/${path.basename(file.path)}`;
	const updated = await updateRequirementFileData(id, {
		fileUrl,
		fileName: file.originalname,
		fileSize: file.size,
	});

	await FileAttachment.create({
		fileName: path.basename(file.path),
		originalName: file.originalname,
		mimeType: file.mimetype,
		size: file.size,
		path: file.path,
		url: fileUrl,
		uploadedBy: studentId,
		entityType: "requirement",
		entityId: updated.id,
		isPublic: false,
	} as any);

	res.status(StatusCodes.OK).json({ success: true, message: "Requirement submitted", data: updated });
};

export const approveRequirementController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Requirement ID is required");
	const approverId = req.user?.id;
	if (!approverId) throw new BadRequestError("Missing authenticated user context");
	const { feedback = null } = req.body || {};
	const result = await approveRequirementData(id, approverId, feedback);
	res
		.status(StatusCodes.OK)
		.json({ success: true, message: "Requirement approved", data: result });
};

export const rejectRequirementController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Requirement ID is required");
	const approverId = req.user?.id;
	if (!approverId) throw new BadRequestError("Missing authenticated user context");
	const { reason } = req.body || {};
	if (!reason?.trim()) throw new BadRequestError("Rejection reason is required");
	const result = await rejectRequirementData(id, approverId, reason);
	res.status(StatusCodes.OK).json({ success: true, message: "Requirement rejected", data: result });
};

export const getRequirementStatsController = async (req: Request, res: Response) => {
	const { studentId } = req.params;
	if (!studentId) throw new BadRequestError("Student ID is required");
	
	const stats = await getRequirementStatsData(studentId);
	res.status(StatusCodes.OK).json({ 
		success: true, 
		message: "Requirement stats retrieved", 
		data: stats 
	});
};

