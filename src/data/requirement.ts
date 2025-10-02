import { Op } from "sequelize";
import Requirement from "@/db/models/requirement";
import RequirementTemplate from "@/db/models/requirement-template";
import User from "@/db/models/user";
import StudentEnrollment from "@/db/models/student-enrollment";
import Section from "@/db/models/section";

export type RequirementStatus =
	| "pending"
	| "submitted"
	| "approved"
	| "rejected"
	| "in-progress";

interface CreateRequirementFromTemplateParams {
	templateId: string;
	studentId: string;
	practicumId?: string | null;
	dueDate?: Date | null;
}

interface GetRequirementsParams {
	page: number;
	limit: number;
	search?: string;
	status?: RequirementStatus | "all";
	studentId?: string;
	practicumId?: string;
}

export const createRequirementFromTemplateData = async (
	params: CreateRequirementFromTemplateParams
) => {
	const template = await RequirementTemplate.findByPk(params.templateId);
	if (!template) {
		throw new Error("Requirement template not found");
	}

	const requirement = await Requirement.create({
		studentId: params.studentId,
		templateId: template.id,
		practicumId: params.practicumId ?? null,
		title: template.title,
		description: template.description,
		category: template.category,
		priority: template.priority,
		status: "pending",
		dueDate: params.dueDate ?? null,
	} as any);

	return requirement;
};

export const getRequirementsData = async (params: GetRequirementsParams) => {
	const { page, limit, search, status, studentId, practicumId } = params;
	const offset = (page - 1) * limit;

	const where: any = {};
	if (search) {
		where[Op.or] = [
			{ title: { [Op.iLike]: `%${search}%` } },
			{ description: { [Op.iLike]: `%${search}%` } },
		];
	}
	if (status && status !== "all") {
		where.status = status;
	}
	if (studentId) {
		where.studentId = studentId;
	}
	if (practicumId) {
		where.practicumId = practicumId;
	}

	const { count, rows } = await Requirement.findAndCountAll({
		where,
		limit,
		offset,
		order: [["createdAt", "DESC"]],
		include: [
			{ model: RequirementTemplate, as: "template" as any },
			{
				model: User,
				as: "student" as any,
				attributes: ["id", "firstName", "lastName", "email", "role"],
				include: [
					{
						model: StudentEnrollment,
						as: "enrollments" as any,
						attributes: ["id", "status"],
						include: [
							{
								model: Section,
								as: "section" as any,
								attributes: ["id", "name"],
							},
						],
					},
				],
			},
		],
	});

	return {
		requirements: rows,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
			itemsPerPage: limit,
		},
	};
};

export const findRequirementByID = async (id: string) => {
	const req = await Requirement.findByPk(id, {
		include: [
			{ model: RequirementTemplate, as: "template" as any },
			{ model: User, as: "student" as any, attributes: ["id", "firstName", "lastName", "email", "role"] },
			{ model: User, as: "approver" as any, attributes: ["id", "firstName", "lastName", "email", "role"] },
		],
	});
	return req;
};

export const updateRequirementFileData = async (
	id: string,
	file: { fileUrl: string; fileName: string; fileSize: number }
) => {
	const req = await Requirement.findByPk(id);
	if (!req) throw new Error("Requirement not found");
	await req.update({
		fileUrl: file.fileUrl,
		fileName: file.fileName,
		fileSize: file.fileSize,
		submittedDate: new Date(),
		status: "submitted",
	});
	return req;
};

export const approveRequirementData = async (
	id: string,
	approverId: string,
	feedback?: string | null
) => {
	const req = await Requirement.findByPk(id);
	if (!req) throw new Error("Requirement not found");
	await req.update({
		status: "approved",
		approvedBy: approverId,
		approvedDate: new Date(),
		feedback: feedback ?? req.feedback ?? null,
	});
	return req;
};

export const rejectRequirementData = async (
	id: string,
	approverId: string,
	reason: string
) => {
	if (!reason?.trim()) throw new Error("Rejection reason is required");
	const req = await Requirement.findByPk(id);
	if (!req) throw new Error("Requirement not found");
	await req.update({
		status: "rejected",
		approvedBy: approverId,
		approvedDate: null,
		feedback: reason,
	});
	return req;
};

export const getRequirementStatsData = async (studentId: string) => {
	try {
		// Get all requirements for the student
		const allRequirements = await Requirement.findAndCountAll({
			where: { studentId },
			include: [
				{ model: RequirementTemplate, as: "template" as any },
			],
		});

		const requirements = allRequirements.rows || [];
		
		// Calculate stats
		const total = requirements.length;
		const approved = requirements.filter(r => r.status === 'approved').length;
		const pending = requirements.filter(r => r.status === 'pending').length;
		const submitted = requirements.filter(r => r.status === 'submitted').length;
		const rejected = requirements.filter(r => r.status === 'rejected').length;
		const inProgress = requirements.filter(r => r.status === 'in-progress').length;

		return {
			total,
			approved,
			pending,
			submitted,
			rejected,
			inProgress,
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to get requirement statistics");
	}
};

