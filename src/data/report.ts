import { Op } from "sequelize";
import Report from "@/db/models/report";
import ReportTemplate from "@/db/models/report-template";
import User from "@/db/models/user";
import Practicum from "@/db/models/practicum";

export type ReportType = "weekly" | "monthly" | "final" | "narrative";
export type ReportStatus = "draft" | "submitted" | "approved" | "rejected";

interface CreateReportFromTemplateParams {
	templateId: string;
	studentId: string;
	practicumId?: string | null;
	dueDate?: Date | null;
}

interface GetReportsParams {
	page: number;
	limit: number;
	search?: string;
	status?: ReportStatus | "all";
	type?: ReportType | "all";
	studentId?: string;
	practicumId?: string;
	weekNumber?: number;
}

export const createReportFromTemplateData = async (
	params: CreateReportFromTemplateParams
) => {
	const template = await ReportTemplate.findByPk(params.templateId);
	if (!template) {
		throw new Error("Report template not found");
	}

	const report = await Report.create({
		studentId: params.studentId,
		templateId: template.id,
		practicumId: params.practicumId ?? null,
		title: template.title,
		content: template.content,
		type: template.type as ReportType,
		status: "draft",
		dueDate: params.dueDate ?? null,
	} as any);

	return report;
};

export const createReportData = async (params: {
	studentId: string;
	practicumId?: string | null;
	title: string;
	content?: string | null;
	type: ReportType;
	weekNumber?: number | null;
	dueDate?: Date | null;
}) => {
	const report = await Report.create({
		studentId: params.studentId,
		practicumId: params.practicumId ?? null,
		title: params.title,
		content: params.content ?? "",
		type: params.type,
		weekNumber: typeof params.weekNumber === "number" ? params.weekNumber : null,
		status: "draft",
		dueDate: params.dueDate ?? null,
	} as any);

	return report;
};

// Convenience: narrative-specific creators and list helpers
export const createNarrativeReportData = async (params: {
	studentId: string;
	practicumId?: string | null;
	title: string;
	content?: string | null;
	dueDate?: Date | null;
}) => {
	return createReportData({
		studentId: params.studentId,
		practicumId: params.practicumId ?? null,
		title: params.title,
		content: params.content ?? "",
		type: "narrative",
		weekNumber: null,
		dueDate: params.dueDate ?? null,
	});
};

export const getReportsData = async (params: GetReportsParams) => {
	const { page, limit, search, status, type, studentId, practicumId, weekNumber } = params;
	const offset = (page - 1) * limit;

	const where: any = {};
	if (search) {
		where[Op.or] = [
			{ title: { [Op.iLike]: `%${search}%` } },
			{ content: { [Op.iLike]: `%${search}%` } },
		];
	}
	if (status && status !== "all") {
		where.status = status;
	}
	if (type && type !== "all") {
		where.type = type;
	}
	if (studentId) {
		where.studentId = studentId;
	}
	if (practicumId) {
		where.practicumId = practicumId;
	}
	if (typeof weekNumber === "number") {
		where.weekNumber = weekNumber;
	}

	const { count, rows } = await Report.findAndCountAll({
		where,
		limit,
		offset,
		order: [["createdAt", "DESC"]],
		include: [
			{ model: ReportTemplate, as: "template" as any },
			{ model: User, as: "student" as any, attributes: ["id", "firstName", "lastName", "email", "role"] },
			{ model: User, as: "approver" as any, attributes: ["id", "firstName", "lastName", "email", "role"] },
			{ model: Practicum, as: "practicum" as any },
		],
	});

	return {
		reports: rows,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
			itemsPerPage: limit,
		},
	};
};

export const getNarrativeReportsData = async (
	params: Omit<GetReportsParams, "type">
) => {
	return getReportsData({
		...params,
		type: "narrative",
	});
};

export const findReportByID = async (id: string) => {
	const report = await Report.findByPk(id, {
		include: [
			{ model: ReportTemplate, as: "template" as any },
			{ model: User, as: "student" as any, attributes: ["id", "firstName", "lastName", "email", "role"] },
			{ model: User, as: "approver" as any, attributes: ["id", "firstName", "lastName", "email", "role"] },
			{ model: Practicum, as: "practicum" as any },
		],
	});
	return report;
};

export const updateReportSubmissionData = async (
	id: string,
	updates: {
		content?: string;
		title?: string;
		fileUrl?: string | null;
		weekNumber?: number | null;
		hoursLogged?: number | null;
		activities?: string | null;
		learnings?: string | null;
		challenges?: string | null;
	}
) => {
	const report = await Report.findByPk(id);
	if (!report) throw new Error("Report not found");
	await report.update({
		content: updates.content ?? report.content,
		title: updates.title ?? report.title,
		fileUrl: updates.fileUrl ?? report.fileUrl ?? null,
		weekNumber: typeof updates.weekNumber === "number" ? updates.weekNumber : report.weekNumber,
		hoursLogged: typeof updates.hoursLogged === "number" ? updates.hoursLogged : report.hoursLogged,
		activities: updates.activities ?? report.activities ?? null,
		learnings: updates.learnings ?? report.learnings ?? null,
		challenges: updates.challenges ?? report.challenges ?? null,
		submittedDate: new Date(),
		status: "submitted",
	});
	return report;
};

export const approveReportData = async (
	id: string,
	approverId: string,
	feedback?: string | null,
	rating?: number | null
) => {
	const report = await Report.findByPk(id);
	if (!report) throw new Error("Report not found");
	await report.update({
		status: "approved",
		approvedBy: approverId,
		approvedDate: new Date(),
		feedback: feedback ?? report.feedback ?? null,
		rating: typeof rating === "number" ? rating : report.rating,
	});
	return report;
};

export const rejectReportData = async (
	id: string,
	approverId: string,
	reason: string
) => {
	if (!reason?.trim()) throw new Error("Rejection reason is required");
	const report = await Report.findByPk(id);
	if (!report) throw new Error("Report not found");
	await report.update({
		status: "rejected",
		approvedBy: approverId,
		approvedDate: null,
		feedback: reason,
	});
	return report;
};

export const getReportStatsData = async (studentId: string) => {
	const allReports = await Report.findAndCountAll({
		where: { studentId },
	});

	const reports = allReports.rows || [];
	const total = reports.length;
	const approved = reports.filter((r: any) => r.status === "approved").length;
	const submitted = reports.filter((r: any) => r.status === "submitted").length;
	const rejected = reports.filter((r: any) => r.status === "rejected").length;
	const draft = reports.filter((r: any) => r.status === "draft").length;

	return {
		total,
		approved,
		submitted,
		rejected,
		draft,
	};
};


