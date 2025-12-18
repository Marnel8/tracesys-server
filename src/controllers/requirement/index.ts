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
	updateRequirementDueDateData,
	getRequirementStatsData,
	createRequirementCommentData,
	getRequirementCommentsData,
	getStudentUnreadCommentsData,
	getArchivedRequirementsData,
	restoreRequirementData,
	hardDeleteRequirementData,
} from "@/data/requirement";
import { logStudentAction } from "@/utils/audit-logger";

export const createRequirementFromTemplateController = async (
	req: Request,
	res: Response
) => {
	const { templateId, studentId, practicumId = null, dueDate = null } = req.body;
	if (!templateId || !studentId) {
		throw new BadRequestError("templateId and studentId are required");
	}
	// Convert ISO string to Date object if provided
	const dueDateValue = dueDate ? new Date(dueDate) : null;
	const requirement = await createRequirementFromTemplateData({
		templateId,
		studentId,
		practicumId,
		dueDate: dueDateValue,
	});
	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Requirement created from template",
		data: requirement,
	});
};

export const getRequirementsController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "", status = "all", studentId, practicumId, includePending } =
		req.query as any;
	const result = await getRequirementsData({
		page: Number(page),
		limit: Number(limit),
		search: search || "",
		status: status || "all",
		studentId: studentId || undefined,
		practicumId: practicumId || undefined,
		instructorId: req.user?.role === "instructor" ? req.user.id : undefined,
		includePending: includePending === "true" || includePending === true,
	} as any);
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

	// Log audit event
	await logStudentAction(req, {
		action: "Requirement Submitted",
		resource: "Requirements",
		resourceId: updated.id,
		details: `Student submitted requirement: ${template.title || "Unknown"}`,
		category: "submission",
		severity: "low",
		status: "success",
		metadata: {
			requirementId: updated.id,
			templateId: template.id,
			templateName: template.title,
		},
	});

	res.status(StatusCodes.OK).json({ success: true, message: "Requirement submitted", data: updated });
};

export const approveRequirementController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Requirement ID is required");
	const approverId = req.user?.id;
	if (!approverId) throw new BadRequestError("Missing authenticated user context");
	const { feedback = null } = req.body || {};
	const result = await approveRequirementData(id, approverId, feedback);
	
	// Log audit event
	await logStudentAction(req, {
		action: "Requirement Approved",
		resource: "Requirements",
		resourceId: id,
		details: `Instructor approved requirement${feedback ? ` with feedback` : ""}`,
		category: "submission",
		severity: "medium",
		status: "success",
		metadata: {
			requirementId: id,
			approverId,
			hasFeedback: !!feedback,
		},
	});
	
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
	
	// Log audit event
	await logStudentAction(req, {
		action: "Requirement Rejected",
		resource: "Requirements",
		resourceId: id,
		details: `Instructor rejected requirement: ${reason}`,
		category: "submission",
		severity: "medium",
		status: "warning",
		metadata: {
			requirementId: id,
			approverId,
			rejectionReason: reason,
		},
	});
	
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

export const createRequirementCommentController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Requirement ID is required");
	const userId = req.user?.id;
	if (!userId) throw new BadRequestError("Missing authenticated user context");
	const { content, isPrivate = false } = req.body || {};
	if (!content?.trim()) throw new BadRequestError("Comment content is required");

	const comment = await createRequirementCommentData(id, userId, content.trim(), isPrivate);
	
	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Comment created",
		data: comment,
	});
};

export const getRequirementCommentsController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Requirement ID is required");

	const comments = await getRequirementCommentsData(id);
	
	res.status(StatusCodes.OK).json({
		success: true,
		message: "Comments retrieved",
		data: comments,
	});
};

export const getStudentRequirementCommentsController = async (req: Request, res: Response) => {
	const { studentId } = req.params;
	if (!studentId) throw new BadRequestError("Student ID is required");
	
	// Verify the student is requesting their own comments
	const requestingUserId = req.user?.id;
	if (requestingUserId !== studentId && req.user?.role !== "instructor") {
		throw new UnauthorizedError("You can only view your own comments");
	}

	const { lastCheckTime } = req.query as any;
	const comments = await getStudentUnreadCommentsData(studentId, lastCheckTime || null);
	
	res.status(StatusCodes.OK).json({
		success: true,
		message: "Comments retrieved",
		data: comments,
	});
};

export const updateRequirementDueDateController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Requirement ID is required");
	
	// Only instructors can update due dates
	if (req.user?.role !== "instructor") {
		throw new UnauthorizedError("Only instructors can update requirement due dates");
	}

	const { dueDate } = req.body;
	// Convert ISO string to Date object if provided, or null if empty string/null
	const dueDateValue = dueDate && dueDate !== "" ? new Date(dueDate) : null;
	
	const result = await updateRequirementDueDateData(id, dueDateValue);
	
	// Log audit event
	await logStudentAction(req, {
		action: "Requirement Due Date Updated",
		resource: "Requirements",
		resourceId: id,
		details: `Instructor updated due date${dueDateValue ? ` to ${dueDateValue.toISOString()}` : " (removed)"}`,
		category: "submission",
		severity: "low",
		status: "success",
		metadata: {
			requirementId: id,
			dueDate: dueDateValue?.toISOString() || null,
		},
	});
	
		res.status(StatusCodes.OK).json({
			success: true,
			message: "Requirement due date updated",
			data: result,
		});
	};

export const getArchivedRequirementsController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "" } = req.query;

	const result = await getArchivedRequirementsData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		data: result,
	});
};

export const restoreRequirementController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Requirement ID is required.");
	}

	const requirement = await restoreRequirementData(id);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Requirement restored successfully",
		data: requirement,
	});
};

export const hardDeleteRequirementController = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		if (!id) {
			throw new BadRequestError("Requirement ID is required.");
		}

		await hardDeleteRequirementData(id);

		res.status(StatusCodes.OK).json({
			success: true,
			message: "Requirement permanently deleted successfully",
		});
	} catch (error: any) {
		res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
			success: false,
			message: error.message || "Failed to permanently delete requirement",
		});
	}
};

