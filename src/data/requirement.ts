import { Op } from "sequelize";
import Requirement from "@/db/models/requirement";
import RequirementTemplate from "@/db/models/requirement-template";
import RequirementComment from "@/db/models/requirement-comment";
import User from "@/db/models/user";
import StudentEnrollment from "@/db/models/student-enrollment";
import Section from "@/db/models/section";
import Practicum from "@/db/models/practicum";
import Agency from "@/db/models/agency";

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
	instructorId?: string;
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
	const { page, limit, search, status, studentId, practicumId, instructorId } = params;
	const offset = (page - 1) * limit;

	const where: any = {};
	const andConditions: any[] = [];
	
	if (search) {
		andConditions.push({
			[Op.or]: [
				{ title: { [Op.like]: `%${search}%` } },
				{ description: { [Op.like]: `%${search}%` } },
				{ fileName: { [Op.like]: `%${search}%` } },
				{ "$student.firstName$": { [Op.like]: `%${search}%` } },
				{ "$student.lastName$": { [Op.like]: `%${search}%` } },
				{ "$student.email$": { [Op.like]: `%${search}%` } },
				{ "$student.studentId$": { [Op.like]: `%${search}%` } },
			],
		});
	}
	
	if (status && status !== "all") {
		where.status = status;
	} else if (status === "all" && instructorId) {
		// When status is "all" and user is instructor, only show requirements with files
		// UNLESS includePending is true (for summary page where we need to see all requirements)
		// This ensures pagination works correctly (no empty pages) for the requirements list page
		const includePending = (params as any).includePending;
		if (!includePending) {
			andConditions.push({
				[Op.or]: [
					{ fileUrl: { [Op.ne]: null } },
					{ fileName: { [Op.ne]: null } },
				],
			});
		}
	}
	
	// Combine all AND conditions
	if (andConditions.length > 0) {
		where[Op.and] = andConditions;
	}
	if (studentId) {
		where.studentId = studentId;
	}
	if (practicumId) {
		where.practicumId = practicumId;
	}

	// Ensure students under this instructor have requirement rows for all active templates
		if (instructorId) {
		const [enrollments, allTemplates] = await Promise.all([
			StudentEnrollment.findAll({
				attributes: ["studentId"],
				include: [
					{
						model: Section,
						as: "section" as any,
						attributes: [],
						where: { instructorId },
						required: true,
					},
				],
				raw: true,
			}),
			RequirementTemplate.findAll({
				where: { isActive: true },
				raw: true,
			}),
		]);

		const studentIds = Array.from(
			new Set(
				enrollments
					.map((e: any) => e.studentId)
					.filter((id): id is string => !!id)
			)
		);

		// Get student practicums with agency information to filter templates
		const practicums = await Practicum.findAll({
			where: {
				studentId: { [Op.in]: studentIds },
				status: "active",
			},
			include: [
				{
					model: Agency,
					as: "agency",
					attributes: ["id", "isSchoolAffiliated"],
					required: false,
				},
			],
		});

		// Create a map of studentId -> agency school affiliation status
		const studentAgencyMap = new Map<string, boolean>();
		for (const practicum of practicums) {
			const agency = (practicum as any).agency;
			if (agency) {
				studentAgencyMap.set(practicum.studentId, agency.isSchoolAffiliated || false);
			}
		}

		// Filter templates based on agency school affiliation
		// Logic: If agency isSchoolAffiliated is true, only include templates where appliesToSchoolAffiliated is true
		// If agency isSchoolAffiliated is false/undefined, include all templates
		const templates = allTemplates.filter((tmpl: any) => {
			// If no practicum/agency info, include all templates (backward compatibility)
			if (studentIds.length === 0) return true;
			
			// For each student, we'll filter when creating requirements
			// Here we just keep all templates that could be applicable
			return true;
		});

		const templateIds = templates.map((t: any) => t.id).filter(Boolean);

		if (studentIds.length && templateIds.length) {
			const existing = await Requirement.findAll({
				attributes: ["id", "studentId", "templateId", "createdAt"],
				where: {
					studentId: { [Op.in]: studentIds },
					templateId: { [Op.in]: templateIds },
				},
				raw: true,
			});

			// Deduplicate legacy rows: keep the newest per (studentId, templateId)
			if (existing.length > 0) {
				const seen = new Map<string, { id: string; createdAt: Date }>();
				const toDelete: string[] = [];

				for (const row of existing) {
					const key = `${row.studentId}:${row.templateId}`;
					const createdAt = new Date(row.createdAt as any);
					if (!seen.has(key)) {
						seen.set(key, { id: row.id, createdAt });
						continue;
					}
					const current = seen.get(key)!;
					// Keep the newest record, delete the older one
					if (createdAt > current.createdAt) {
						toDelete.push(current.id);
						seen.set(key, { id: row.id, createdAt });
					} else {
						toDelete.push(row.id);
					}
				}

				if (toDelete.length) {
					await Requirement.destroy({ where: { id: { [Op.in]: toDelete } } });
				}
			}

			const existingSet = new Set(
				existing.map((r: any) => `${r.studentId}:${r.templateId}`)
			);

			const toCreate: any[] = [];
			for (const sid of studentIds) {
				const isSchoolAffiliated = studentAgencyMap.get(sid) || false;
				
				for (const tmpl of allTemplates) {
					// Filter: If agency is school-affiliated, only include templates that apply to school-affiliated
					// If agency is NOT school-affiliated, include all templates
					if (isSchoolAffiliated && !(tmpl as any).appliesToSchoolAffiliated) {
						continue; // Skip templates that don't apply to school-affiliated agencies
					}
					
					const key = `${sid}:${tmpl.id}`;
					if (existingSet.has(key)) continue;
					toCreate.push({
						studentId: sid,
						templateId: tmpl.id,
						title: tmpl.title,
						description: tmpl.description,
						category: tmpl.category,
						priority: tmpl.priority,
						status: "pending",
						dueDate: null,
					});
				}
			}

			if (toCreate.length) {
				await Requirement.bulkCreate(toCreate);
			}
		}
	}

	const { count, rows } = await Requirement.findAndCountAll({
		where,
		limit,
		offset,
		order: [["createdAt", "DESC"]],
		subQuery: false,
		distinct: true,
		include: [
			{ model: RequirementTemplate, as: "template" as any },
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
			{
				model: RequirementComment,
				as: "comments" as any,
				include: [
					{ model: User, as: "user" as any, attributes: ["id", "firstName", "lastName", "email", "role"] },
				],
				order: [["createdAt", "ASC"]],
			},
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

export const updateRequirementDueDateData = async (
	id: string,
	dueDate: Date | null
) => {
	const req = await Requirement.findByPk(id);
	if (!req) throw new Error("Requirement not found");
	await req.update({
		dueDate: dueDate,
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

export const createRequirementCommentData = async (
	requirementId: string,
	userId: string,
	content: string,
	isPrivate: boolean = false
) => {
	const requirement = await Requirement.findByPk(requirementId);
	if (!requirement) {
		throw new Error("Requirement not found");
	}

	const comment = await RequirementComment.create({
		requirementId,
		userId,
		content,
		isPrivate,
	} as any);

	// Fetch the comment with user information
	const commentWithUser = await RequirementComment.findByPk(comment.id, {
		include: [
			{ model: User, as: "user" as any, attributes: ["id", "firstName", "lastName", "email", "role"] },
			{ model: Requirement, as: "requirement" as any, attributes: ["id", "title", "studentId"] },
		],
	});

	return commentWithUser;
};

export const getRequirementCommentsData = async (requirementId: string) => {
	const requirement = await Requirement.findByPk(requirementId);
	if (!requirement) {
		throw new Error("Requirement not found");
	}

	const comments = await RequirementComment.findAll({
		where: { requirementId, isPrivate: false },
		include: [
			{ model: User, as: "user" as any, attributes: ["id", "firstName", "lastName", "email", "role"] },
		],
		order: [["createdAt", "ASC"]],
	});

	return comments;
};

export const getStudentUnreadCommentsData = async (
	studentId: string,
	lastCheckTime?: string | null
) => {
	// Get all requirements for the student
	const requirements = await Requirement.findAll({
		where: { studentId },
		attributes: ["id"],
		raw: true,
	});

	const requirementIds = requirements.map((r: any) => r.id);

	if (requirementIds.length === 0) {
		return [];
	}

	const whereConditions: any = {
		requirementId: { [Op.in]: requirementIds },
		isPrivate: false,
	};

	// If lastCheckTime is provided, only get comments created after that time
	if (lastCheckTime) {
		whereConditions.createdAt = { [Op.gt]: new Date(lastCheckTime) };
	}

	const comments = await RequirementComment.findAll({
		where: whereConditions,
		include: [
			{ model: User, as: "user" as any, attributes: ["id", "firstName", "lastName", "email", "role"] },
			{
				model: Requirement,
				as: "requirement" as any,
				attributes: ["id", "title", "studentId"],
			},
		],
		order: [["createdAt", "DESC"]],
	});

	return comments;
};

