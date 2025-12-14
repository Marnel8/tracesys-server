import { Op } from "sequelize";
import RequirementTemplate from "@/db/models/requirement-template";
import Requirement from "@/db/models/requirement";

export type RequirementCategory =
	| "health"
	| "reports"
	| "training"
	| "academic"
	| "evaluation"
	| "legal";

export type RequirementPriority = "urgent" | "high" | "medium" | "low";

interface CreateRequirementTemplateParams {
	title: string;
	description: string;
	category: RequirementCategory;
	priority?: RequirementPriority; // Optional, defaults to "medium" in database
	isRequired: boolean;
	instructions?: string | null;
	allowedFileTypes?: string[] | null; // will be stored as CSV in TEXT field
	maxFileSize?: number | null; // MB
	isActive?: boolean;
	createdBy: string;
	// Optional downloadable template file metadata
	templateFileUrl?: string | null;
	templateFileName?: string | null;
	templateFileType?: string | null;
	templateFileSize?: number | null; // bytes
}

interface GetRequirementTemplatesParams {
	page: number;
	limit: number;
	search?: string;
	status?: string; // "all" | "active" | "inactive"
}

export const createRequirementTemplateData = async (
	data: CreateRequirementTemplateParams
) => {
	try {
		// Prevent duplicate titles (case-insensitive)
		const existing = await RequirementTemplate.findOne({
			where: {
				title: { [Op.like]: data.title },
			},
		});

		if (existing) {
			throw new Error("Requirement template with this title already exists");
		}

		const template = await RequirementTemplate.create({
			...data,
			priority: data.priority || "medium", // Default to "medium" if not provided
			allowedFileTypes: data.allowedFileTypes?.join(",") ?? null,
		} as any);

		return { template };
	} catch (error: any) {
		throw new Error(error.message || "Failed to create requirement template");
	}
};

export const getRequirementTemplatesData = async (
	params: GetRequirementTemplatesParams
) => {
	try {
		const { page, limit, search, status } = params;
		const offset = (page - 1) * limit;

		const whereClause: any = {};
		if (search) {
			whereClause[Op.or] = [
				{ title: { [Op.like]: `%${search}%` } },
				{ description: { [Op.like]: `%${search}%` } },
			];
		}
		if (status && status !== "all") {
			whereClause.isActive = status === "active";
		}

		const { count, rows } = await RequirementTemplate.findAndCountAll({
			where: whereClause,
			limit,
			offset,
			order: [["createdAt", "DESC"]],
		});

		const totalPages = Math.ceil(count / limit);

		return {
			requirementTemplates: rows,
			pagination: {
				currentPage: page,
				totalPages,
				totalItems: count,
				itemsPerPage: limit,
			},
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to retrieve requirement templates");
	}
};

export const findRequirementTemplateByID = async (id: string) => {
	try {
		const template = await RequirementTemplate.findByPk(id);
		return template;
	} catch (error: any) {
		throw new Error(error.message || "Failed to find requirement template");
	}
};

export const updateRequirementTemplateData = async (
	id: string,
	updateData: Partial<CreateRequirementTemplateParams>
) => {
	try {
		const template = await RequirementTemplate.findByPk(id);
		if (!template) {
			throw new Error("Requirement template not found");
		}

		// Prevent duplicate titles when updating
		if (updateData.title && updateData.title !== template.title) {
			const existing = await RequirementTemplate.findOne({
				where: {
					title: { [Op.like]: updateData.title },
					id: { [Op.ne]: id },
				},
			});
			if (existing) {
				throw new Error("Requirement template with this title already exists");
			}
		}

		const persistedUpdate: any = { ...updateData };
		if (Array.isArray(updateData.allowedFileTypes)) {
			persistedUpdate.allowedFileTypes = updateData.allowedFileTypes.join(",");
		}

		await template.update(persistedUpdate);
		return template;
	} catch (error: any) {
		throw new Error(error.message || "Failed to update requirement template");
	}
};

export const deleteRequirementTemplateData = async (id: string) => {
	try {
		const template = await RequirementTemplate.findByPk(id);
		if (!template) {
			throw new Error("Requirement template not found");
		}

		// Prevent deletion if there are associated requirements
		const requirementCount = await Requirement.count({ where: { templateId: id } });
		if (requirementCount > 0) {
			throw new Error("Cannot delete template with existing requirements");
		}

		await template.destroy();
		return true;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete requirement template");
	}
};


