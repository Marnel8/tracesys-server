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
	appliesToSchoolAffiliated?: boolean; // Optional, defaults to true in database
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
	createdBy?: string;
}

interface GetArchivedRequirementTemplatesParams {
  page: number;
  limit: number;
  search?: string;
  createdBy?: string;
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
			appliesToSchoolAffiliated: data.appliesToSchoolAffiliated !== undefined ? data.appliesToSchoolAffiliated : true, // Default to true if not provided
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
		const { page, limit, search, status, createdBy } = params;
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
		if (createdBy) {
			whereClause.createdBy = createdBy;
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

		// Prevent deletion if there are associated active (non-archived) requirements
		// that have been worked on (not just pending with no files)
		// Try to filter by isActive if the column exists, otherwise count all requirements
		let requirementsWithWork = 0;
		try {
			// Count requirements that are not just "pending with no files"
			// (i.e., have files uploaded, or have been submitted/approved/rejected/in-progress)
			// Only count active (non-archived) requirements
			requirementsWithWork = await Requirement.count({ 
				where: { 
					templateId: id,
					[Op.and]: [
						{
							[Op.or]: [
								{ isActive: true },
								{ isActive: { [Op.is]: null } } // Include null for backward compatibility
							]
						},
						{
							[Op.or]: [
								// Has file uploaded
								{ fileUrl: { [Op.ne]: null } },
								{ fileName: { [Op.ne]: null } },
								// Or status is not pending
								{ status: { [Op.ne]: "pending" } }
							]
						}
					]
				} 
			});
		} catch (queryError: any) {
			// If isActive column doesn't exist yet, fall back to checking all requirements
			if (queryError.message && queryError.message.includes("isActive")) {
				requirementsWithWork = await Requirement.count({ 
					where: { 
						templateId: id,
						[Op.or]: [
							// Has file uploaded
							{ fileUrl: { [Op.ne]: null } },
							{ fileName: { [Op.ne]: null } },
							// Or status is not pending
							{ status: { [Op.ne]: "pending" } }
						]
					} 
				});
			} else {
				throw queryError; // Re-throw if it's a different error
			}
		}

		if (requirementsWithWork > 0) {
			throw new Error("Cannot delete template with existing requirements that have been worked on");
		}
		
		// If we reach here, there are either no requirements or only pending requirements with no files
		// We can safely delete those pending requirements and then delete the template
		try {
			// Delete all pending requirements with no files for this template
			// Only delete active ones (archived ones will be handled separately if needed)
			await Requirement.destroy({
				where: {
					templateId: id,
					status: "pending",
					[Op.and]: [
						{ fileUrl: { [Op.is]: null } },
						{ fileName: { [Op.is]: null } },
						{
							[Op.or]: [
								{ isActive: true },
								{ isActive: { [Op.is]: null } } // Include null for backward compatibility
							]
						}
					]
				}
			});
		} catch (deleteError: any) {
			// If isActive column doesn't exist, try without it
			if (deleteError.message && deleteError.message.includes("isActive")) {
				// Just try to delete pending requirements without isActive filter
				await Requirement.destroy({
					where: {
						templateId: id,
						status: "pending",
						[Op.and]: [
							{ fileUrl: { [Op.is]: null } },
							{ fileName: { [Op.is]: null } }
						]
					}
				});
			} else {
				// If deletion fails, log but don't block template deletion
				console.warn("Failed to delete pending requirements:", deleteError.message);
			}
		}

		await template.destroy();
		return true;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete requirement template");
	}
};

// Archive helpers for requirement templates
export const getArchivedRequirementTemplatesData = async (
	params: GetArchivedRequirementTemplatesParams
) => {
	const { page, limit, search, createdBy } = params;
	const offset = (page - 1) * limit;

	const whereClause: any = {
		isActive: false,
	};

	if (search) {
		whereClause[Op.or] = [
			{ title: { [Op.like]: `%${search}%` } },
			{ description: { [Op.like]: `%${search}%` } },
		];
	}

	if (createdBy) {
		whereClause.createdBy = createdBy;
	}

	const { count, rows } = await RequirementTemplate.findAndCountAll({
		where: whereClause,
		limit,
		offset,
		order: [["updatedAt", "DESC"]],
	});

	const items = rows.map((template: any) => ({
		id: template.id,
		type: "requirementTemplate" as const,
		name: template.title,
		deletedAt: template.updatedAt.toISOString(),
		deletedBy: null,
		meta: {
			category: template.category,
			isRequired: template.isRequired,
		},
		raw: template.toJSON(),
	}));

	return {
		items,
		pagination: {
			currentPage: page,
			totalPages: Math.ceil(count / limit),
			totalItems: count,
			itemsPerPage: limit,
		},
	};
};

export const archiveRequirementTemplateData = async (id: string) => {
	const template = await RequirementTemplate.findByPk(id);
	if (!template) {
		throw new Error("Requirement template not found");
	}

	if (template.isActive === false) {
		return template;
	}

	await template.update({ isActive: false });
	return template;
};

export const restoreRequirementTemplateData = async (id: string) => {
	const template = await RequirementTemplate.findByPk(id);
	if (!template || template.isActive === true) {
		throw new Error("Archived requirement template not found");
	}

	await template.update({ isActive: true });
	return template;
};

export const hardDeleteRequirementTemplateData = async (id: string) => {
	// Reuse existing deletion rules; only allow hard delete for already-archived templates
	const template = await RequirementTemplate.findByPk(id);
	if (!template || template.isActive !== false) {
		throw new Error("Archived requirement template not found");
	}

	// Delegate to existing delete logic (will still enforce safety checks)
	return deleteRequirementTemplateData(id);
};


