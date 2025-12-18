import { Op } from "sequelize";
import Report from "@/db/models/report";
import ReportTemplate from "@/db/models/report-template";
import User from "@/db/models/user";
import Practicum from "@/db/models/practicum";
import StudentEnrollment from "@/db/models/student-enrollment";
import Section from "@/db/models/section";
import ReportView from "@/db/models/report-view";

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
	startDate?: Date;
	endDate?: Date;
	instructorId?: string;
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
	startDate?: Date | null;
	endDate?: Date | null;
	dueDate?: Date | null;
}) => {
	const report = await Report.create({
		studentId: params.studentId,
		practicumId: params.practicumId ?? null,
		title: params.title,
		content: params.content ?? "",
		type: params.type,
		weekNumber: typeof params.weekNumber === "number" ? params.weekNumber : null,
		startDate: params.startDate ?? null,
		endDate: params.endDate ?? null,
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
	const { page, limit, search, status, type, studentId, practicumId, weekNumber, startDate, endDate, instructorId } = params;
	const offset = (page - 1) * limit;

	const where: any = {};
	const andConditions: any[] = [];
	
	if (search) {
		andConditions.push({
			[Op.or]: [
				{ title: { [Op.like]: `%${search}%` } },
				{ content: { [Op.like]: `%${search}%` } },
			],
		});
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
	if (startDate && endDate) {
		// Filter reports where the report's date range overlaps with the query range
		// or where submittedDate falls within the query range
		// This handles both reports with date ranges and reports without (null dates)
		andConditions.push({
			[Op.or]: [
				{
					[Op.and]: [
						{ startDate: { [Op.ne]: null } }, // Ensure startDate is not null
						{ endDate: { [Op.ne]: null } }, // Ensure endDate is not null
						{ startDate: { [Op.lte]: endDate } },
						{ endDate: { [Op.gte]: startDate } },
					],
				},
				{
					submittedDate: {
						[Op.between]: [startDate, endDate],
					},
				},
			],
		});
	} else if (startDate) {
		andConditions.push({
			[Op.or]: [
				{
					[Op.and]: [
						{ startDate: { [Op.ne]: null } },
						{ startDate: { [Op.gte]: startDate } },
					],
				},
				{
					submittedDate: { [Op.gte]: startDate },
				},
			],
		});
	} else if (endDate) {
		andConditions.push({
			[Op.or]: [
				{
					[Op.and]: [
						{ endDate: { [Op.ne]: null } },
						{ endDate: { [Op.lte]: endDate } },
					],
				},
				{
					submittedDate: { [Op.lte]: endDate },
				},
			],
		});
	}
	
	// Combine all conditions with AND
	if (andConditions.length > 0) {
		where[Op.and] = andConditions;
	}

	const { count, rows } = await Report.findAndCountAll({
		where,
		limit,
		offset,
		order: [["createdAt", "DESC"]],
		subQuery: false,
		distinct: true,
		include: [
			{ model: ReportTemplate, as: "template" as any },
			{ 
				model: User, 
				as: "student" as any, 
				attributes: ["id", "firstName", "lastName", "email", "role", "studentId"],
				required: true,
				include: [
					{
						model: StudentEnrollment,
						as: "enrollments" as any,
						attributes: [],
						required: !!instructorId,
						include: [
							{
								model: Section,
								as: "section" as any,
								attributes: [],
								required: !!instructorId,
								where: instructorId ? { instructorId } : undefined,
							},
						],
					},
				],
			},
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

/**
 * Log that an instructor viewed a report (for student notifications)
 */
export const createReportViewData = async (reportId: string, instructorId: string) => {
	const report = await Report.findByPk(reportId);
	if (!report) {
		throw new Error("Report not found");
	}

	const view = await ReportView.create({
		reportId,
		studentId: report.studentId,
		instructorId,
	} as any);

	return view;
};

/**
 * Get report view notifications for a student, optionally filtered by lastCheckTime
 */
export const getStudentReportViewNotificationsData = async (
	studentId: string,
	lastCheckTime?: string | null
) => {
	const where: any = { studentId };
	if (lastCheckTime) {
		where.createdAt = { [Op.gt]: new Date(lastCheckTime) };
	}

	const views = await ReportView.findAll({
		where,
		include: [
			{
				model: Report,
				as: "report" as any,
				attributes: ["id", "title", "type", "status", "submittedDate"],
			},
			{
				model: User,
				as: "instructor" as any,
				attributes: ["id", "firstName", "lastName", "email", "role"],
			},
		],
		order: [["createdAt", "DESC"]],
	});

	return views;
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
		startDate?: Date | null;
		endDate?: Date | null;
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
		startDate: updates.startDate ?? report.startDate ?? null,
		endDate: updates.endDate ?? report.endDate ?? null,
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

// Archive functions - NOTE: Reports currently don't have soft delete.
// These functions return empty results until soft delete is implemented.
// To implement: Add a deletedAt field or isActive flag to the Report model.
export const getArchivedReportsData = async (params: {
	page: number;
	limit: number;
	search: string;
}) => {
	// Return empty results until soft delete is implemented
	return {
		items: [],
		pagination: {
			currentPage: params.page,
			totalPages: 0,
			totalItems: 0,
			itemsPerPage: params.limit,
		},
	};
};

export const restoreReportData = async (id: string) => {
	throw new Error("Report restore is not yet implemented. Add soft delete support first.");
};

export const hardDeleteReportData = async (id: string) => {
	throw new Error("Report hard delete is not yet implemented. Add soft delete support first.");
};

