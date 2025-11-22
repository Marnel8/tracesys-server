import { Request, Response } from "express";
import path from "path";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError, UnauthorizedError } from "@/utils/error";
import FileAttachment from "@/db/models/file-attachment";
import Report from "@/db/models/report";
import {
	approveReportData,
	createReportFromTemplateData,
	findReportByID,
	getReportsData,
	rejectReportData,
	updateReportSubmissionData,
	getReportStatsData,
} from "@/data/report";
import { createReportData, createNarrativeReportData, getNarrativeReportsData } from "@/data/report";
import { validateImageFile } from "@/utils/image-uploader";
import { logStudentAction } from "@/utils/audit-logger";

export const createReportFromTemplateController = async (
	req: Request,
	res: Response
) => {
	const { templateId, studentId, practicumId = null, dueDate = null } = req.body;
	if (!templateId || !studentId) {
		throw new BadRequestError("templateId and studentId are required");
	}
	const report = await createReportFromTemplateData({
		templateId,
		studentId,
		practicumId,
		dueDate,
	});
	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Report created from template",
		data: report,
	});
};

export const getReportsController = async (req: Request, res: Response) => {
	const {
		page = 1,
		limit = 10,
		search = "",
		status = "all",
		type = "all",
		studentId,
		practicumId,
		weekNumber,
		startDate,
		endDate,
	} = req.query as any;

	const result = await getReportsData({
		page: Number(page),
		limit: Number(limit),
		search: search || "",
		status: status || "all",
		type: type || "all",
		studentId: studentId || undefined,
		practicumId: practicumId || undefined,
		weekNumber: typeof weekNumber !== "undefined" ? Number(weekNumber) : undefined,
		startDate: startDate ? new Date(startDate as string) : undefined,
		endDate: endDate ? new Date(endDate as string) : undefined,
		instructorId: req.user?.role === "instructor" ? req.user.id : undefined,
	});

	res
		.status(StatusCodes.OK)
		.json({ success: true, message: "Reports retrieved", data: result });
};

export const getInstructorReportsController = async (req: Request, res: Response) => {
	const {
		page = 1,
		limit = 10,
		search = "",
		status = "all",
		type = "all",
		studentId,
		practicumId,
		weekNumber,
		startDate,
		endDate,
	} = req.query as any;

	const result = await getReportsData({
		page: Number(page),
		limit: Number(limit),
		search: search || "",
		status: status || "all",
		type: type || "all",
		studentId: studentId || undefined,
		practicumId: practicumId || undefined,
		weekNumber: typeof weekNumber !== "undefined" ? Number(weekNumber) : undefined,
		startDate: startDate ? new Date(startDate as string) : undefined,
		endDate: endDate ? new Date(endDate as string) : undefined,
		instructorId: req.user?.id,
	});

	res
		.status(StatusCodes.OK)
		.json({ success: true, message: "Instructor reports retrieved", data: result });
};

export const getReportController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Report ID is required");
	const report = await findReportByID(id);
	if (!report) throw new NotFoundError("Report not found");
	res.status(StatusCodes.OK).json({ success: true, data: report });
};

export const createReportController = async (req: Request, res: Response) => {
	const studentId = req.user?.id;
	if (!studentId) throw new BadRequestError("Missing authenticated user context");
	const { title, content = "", type, weekNumber = null, startDate = null, endDate = null, practicumId = null, dueDate = null } = req.body || {};
	if (!title?.trim()) throw new BadRequestError("Title is required");
	if (!type || !["weekly", "monthly", "final", "narrative"].includes(type)) {
		throw new BadRequestError("Invalid or missing report type");
	}
	
	// Validate date range if provided
	if (startDate && endDate) {
		const start = new Date(startDate as string);
		const end = new Date(endDate as string);
		if (isNaN(start.getTime()) || isNaN(end.getTime())) {
			throw new BadRequestError("Invalid date format for startDate or endDate");
		}
		if (start > end) {
			throw new BadRequestError("startDate must be before or equal to endDate");
		}
	} else if (startDate || endDate) {
		throw new BadRequestError("Both startDate and endDate must be provided together");
	}
	
	// weekNumber is optional even for weekly reports to keep submission simple
	// startDate and endDate are new fields for date range selection
	const report = await createReportData({
		studentId,
		practicumId,
		title,
		content,
		type,
		weekNumber,
		startDate: startDate ? new Date(startDate as string) : null,
		endDate: endDate ? new Date(endDate as string) : null,
		dueDate,
	});
	res.status(StatusCodes.CREATED).json({ success: true, message: "Report created", data: report });
};

// Narrative-specific convenience endpoints
export const createNarrativeReportController = async (req: Request, res: Response) => {
	const studentId = req.user?.id;
	if (!studentId) throw new BadRequestError("Missing authenticated user context");
	const {
		title,
		content = "",
		practicumId = null,
		dueDate = null,
		hoursLogged,
		activities,
		learnings,
		challenges,
	} = req.body || {};
	if (!title?.trim()) throw new BadRequestError("Title is required");

	// Optional file upload handling (same rules as standard report submit)
	const file = (req as any).file as Express.Multer.File | undefined;
	const fileUrl = file ? `/uploads/${path.basename(file.path)}` : null;

	if (file) {
		const maxSizeMB = 20;
		const allowedDocExts = ["pdf", "doc", "docx"]; // docs allowed, images validated below
		const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
		const isImage = file.mimetype?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

		if (isImage) {
			if (!validateImageFile(file)) {
				throw new BadRequestError("Invalid image type. Allowed: jpg, jpeg, png, webp, gif");
			}
		} else {
			if (!allowedDocExts.includes(ext)) {
				throw new BadRequestError(`Invalid file type. Only ${[...allowedDocExts, "jpg", "jpeg", "png", "webp", "gif"].join(", ") } are allowed`);
			}
		}

		if (file.size > maxSizeMB * 1024 * 1024) {
			throw new BadRequestError(`Max file size is ${maxSizeMB}MB`);
		}
	}

	// Create as draft first
	const report = await createNarrativeReportData({
		studentId,
		practicumId,
		title,
		content,
		dueDate,
	});

	// Immediately submit the narrative report if any meaningful payload exists
	const updated = await updateReportSubmissionData(report.id, {
		title,
		content,
		fileUrl,
		weekNumber: undefined as any,
		hoursLogged: typeof hoursLogged !== "undefined" ? Number(hoursLogged) : undefined as any,
		activities,
		learnings,
		challenges,
	});

	if (file) {
		await FileAttachment.create({
			fileName: path.basename(file.path),
			originalName: file.originalname,
			mimeType: file.mimetype,
			size: file.size,
			path: file.path,
			url: fileUrl,
			uploadedBy: studentId,
			entityType: "report",
			entityId: updated.id,
			isPublic: false,
		} as any);
	}

	// Log audit event
	await logStudentAction(req, {
		action: "Narrative Report Submitted",
		resource: "Reports",
		resourceId: updated.id,
		details: `Student submitted narrative report: ${updated.title || "Untitled"}`,
		category: "submission",
		severity: "low",
		status: "success",
		metadata: {
			reportId: updated.id,
			reportType: "narrative",
			hasFile: !!file,
		},
	});

	res.status(StatusCodes.CREATED).json({ success: true, message: "Narrative report created", data: updated });
};

export const listNarrativeReportsController = async (req: Request, res: Response) => {
    const { page = 1, limit = 10, search = "", status = "all", studentId, practicumId } = req.query as any;
    const result = await getNarrativeReportsData({
        page: Number(page),
        limit: Number(limit),
        search: search || "",
        status: status || "all",
        studentId: studentId || undefined,
        practicumId: practicumId || undefined,
        instructorId: req.user?.role === "instructor" ? req.user.id : undefined,
    });
	res.status(StatusCodes.OK).json({ success: true, message: "Narrative reports retrieved", data: result });
};

export const submitReportController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Report ID is required");
	const studentId = req.user?.id;
	if (!studentId) throw new BadRequestError("Missing authenticated user context");

	const report = await Report.findByPk(id);
	if (!report) throw new NotFoundError("Report not found");
	if (report.studentId !== studentId) {
		throw new UnauthorizedError("You can only submit your own reports");
	}

	const file = (req as any).file as Express.Multer.File | undefined;
	const fileUrl = file ? `/uploads/${path.basename(file.path)}` : null;

	// Validate file if present
	if (file) {
		const maxSizeMB = 20; // default 20MB cap for report files
		const allowedDocExts = ["pdf", "doc", "docx"]; // allow common document types
		const ext = path.extname(file.originalname).replace(".", "").toLowerCase();
		const isImage = file.mimetype?.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext);

		if (isImage) {
			// Use image-uploader validation for images
			if (!validateImageFile(file)) {
				throw new BadRequestError("Invalid image type. Allowed: jpg, jpeg, png, webp, gif");
			}
		} else {
			// Validate document extensions
			if (!allowedDocExts.includes(ext)) {
				throw new BadRequestError(`Invalid file type. Only ${[...allowedDocExts, "jpg", "jpeg", "png", "webp", "gif"].join(", ")} are allowed`);
			}
		}

		// Validate max size for all files
		if (file.size > maxSizeMB * 1024 * 1024) {
			throw new BadRequestError(`Max file size is ${maxSizeMB}MB`);
		}
	}

	const {
		title,
		content,
		weekNumber,
		startDate,
		endDate,
		hoursLogged,
		activities,
		learnings,
		challenges,
	} = req.body || {};

	if (!file && !content && !title) {
		throw new BadRequestError("Provide content or a file to submit the report");
	}

	// Validate date range if provided
	let parsedStartDate: Date | undefined = undefined;
	let parsedEndDate: Date | undefined = undefined;
	
	if (startDate || endDate) {
		if (!startDate || !endDate) {
			throw new BadRequestError("Both startDate and endDate must be provided together");
		}
		parsedStartDate = new Date(startDate as string);
		parsedEndDate = new Date(endDate as string);
		if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
			throw new BadRequestError("Invalid date format for startDate or endDate");
		}
		if (parsedStartDate > parsedEndDate) {
			throw new BadRequestError("startDate must be before or equal to endDate");
		}
	}

	const updated = await updateReportSubmissionData(id, {
		title,
		content,
		fileUrl,
		weekNumber: typeof weekNumber !== "undefined" ? Number(weekNumber) : undefined as any,
		startDate: parsedStartDate,
		endDate: parsedEndDate,
		hoursLogged: typeof hoursLogged !== "undefined" ? Number(hoursLogged) : undefined as any,
		activities,
		learnings,
		challenges,
	});

	if (file) {
		await FileAttachment.create({
			fileName: path.basename(file.path),
			originalName: file.originalname,
			mimeType: file.mimetype,
			size: file.size,
			path: file.path,
			url: fileUrl,
			uploadedBy: studentId,
			entityType: "report",
			entityId: updated.id,
			isPublic: false,
		} as any);
	}

	// Log audit event
	await logStudentAction(req, {
		action: "Report Submitted",
		resource: "Reports",
		resourceId: updated.id,
		details: `Student submitted ${updated.type || "report"}: ${updated.title || "Untitled"}`,
		category: "submission",
		severity: "low",
		status: "success",
		metadata: {
			reportId: updated.id,
			reportType: updated.type,
			hasFile: !!file,
		},
	});

	res
		.status(StatusCodes.OK)
		.json({ success: true, message: "Report submitted", data: updated });
};

export const approveReportController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Report ID is required");
	const approverId = req.user?.id;
	if (!approverId) throw new BadRequestError("Missing authenticated user context");
	const { feedback = null, rating = null } = req.body || {};
	const result = await approveReportData(id, approverId, feedback, rating);
	
	// Log audit event
	await logStudentAction(req, {
		action: "Report Approved",
		resource: "Reports",
		resourceId: id,
		details: `Instructor approved report${feedback ? ` with feedback` : ""}${rating ? ` (Rating: ${rating})` : ""}`,
		category: "submission",
		severity: "medium",
		status: "success",
		metadata: {
			reportId: id,
			approverId,
			hasFeedback: !!feedback,
			rating,
		},
	});
	
	res
		.status(StatusCodes.OK)
		.json({ success: true, message: "Report approved", data: result });
};

export const rejectReportController = async (req: Request, res: Response) => {
	const { id } = req.params;
	if (!id) throw new BadRequestError("Report ID is required");
	const approverId = req.user?.id;
	if (!approverId) throw new BadRequestError("Missing authenticated user context");
	const { reason } = req.body || {};
	if (!reason?.trim()) throw new BadRequestError("Rejection reason is required");
	const result = await rejectReportData(id, approverId, reason);
	
	// Log audit event
	await logStudentAction(req, {
		action: "Report Rejected",
		resource: "Reports",
		resourceId: id,
		details: `Instructor rejected report: ${reason}`,
		category: "submission",
		severity: "medium",
		status: "warning",
		metadata: {
			reportId: id,
			approverId,
			rejectionReason: reason,
		},
	});
	
	res
		.status(StatusCodes.OK)
		.json({ success: true, message: "Report rejected", data: result });
};

export const getReportStatsController = async (req: Request, res: Response) => {
	const { studentId } = req.params;
	if (!studentId) throw new BadRequestError("Student ID is required");
	const stats = await getReportStatsData(studentId);
	res.status(StatusCodes.OK).json({
		success: true,
		message: "Report stats retrieved",
		data: stats,
	});
};


