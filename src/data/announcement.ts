import { Op } from "sequelize";
import sequelize from "@/db";
import Announcement from "@/db/models/announcement";
import User from "@/db/models/user";
import AnnouncementTarget from "@/db/models/announcement-target";
import AnnouncementComment from "@/db/models/announcement-comment";
import StudentEnrollment from "@/db/models/student-enrollment";
import Section from "@/db/models/section";
import Course from "@/db/models/course";
import Department from "@/db/models/department";
import AuditLog from "@/db/models/audit-log";
import { NotFoundError } from "@/utils/error";

interface CreateAnnouncementParams {
	title: string;
	content: string;
	priority?: "Low" | "Medium" | "High";
	status: "Draft" | "Published" | "Archived";
	authorId: string;
	expiryDate?: Date;
	isPinned?: boolean;
	targets?: {
		targetType: "section" | "course" | "all";
		targetId?: string;
	}[];
}

interface GetAnnouncementsParams {
	page: number;
	limit: number;
	search?: string;
	status?: string;
	authorId?: string;
	userId?: string; // For filtering announcements visible to a specific user
}

interface CreateAnnouncementCommentParams {
	announcementId: string;
	userId: string;
	content: string;
}

interface GetAnnouncementCommentsParams {
	announcementId: string;
	page: number;
	limit: number;
}

export const createAnnouncementData = async (data: CreateAnnouncementParams) => {
	try {
		const announcement = await Announcement.create({
			title: data.title,
			content: data.content,
			priority: data.priority || "Medium",
			status: data.status || "Published",
			authorId: data.authorId,
			expiryDate: data.expiryDate,
			isPinned: data.isPinned || false,
		} as any);

		// Create targets if provided
		// If no targets provided, create a default "all" target
		if (data.targets && data.targets.length > 0) {
			const targetPromises = data.targets
				.filter(target => target.targetType) // Filter out invalid targets
				.map(target =>
					AnnouncementTarget.create({
						announcementId: announcement.id,
						targetType: target.targetType,
						targetId: target.targetId || null, // Ensure null instead of undefined
					} as any)
				);
			await Promise.all(targetPromises);
		} else {
			// Default to "all" if no targets specified
			await AnnouncementTarget.create({
				announcementId: announcement.id,
				targetType: "all",
				targetId: null,
			} as any);
		}

		// Fetch the created announcement with relations
		const createdAnnouncement = await Announcement.findByPk(announcement.id, {
			include: [
				{
					model: User,
					as: "author",
					attributes: ["id", "firstName", "lastName", "email"],
				},
				{
					model: AnnouncementTarget,
					as: "targets",
					attributes: ["id", "targetType", "targetId"],
				},
			],
		});

		return {
			announcement: createdAnnouncement,
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to create announcement");
	}
};

export const getAnnouncementsData = async (params: GetAnnouncementsParams) => {
	try {
		const { page, limit, search, status, authorId, userId } = params;
		const offset = (page - 1) * limit;

		// Build where clause
		const whereClause: any = {};

		// Filter by expiry date (only show non-expired announcements)
		whereClause[Op.and] = [
			{
				[Op.or]: [
					{ expiryDate: null },
					{ expiryDate: { [Op.gt]: new Date() } },
				],
			},
		];

		if (search) {
			whereClause[Op.and].push({
				[Op.or]: [
					{ title: { [Op.like]: `%${search}%` } },
					{ content: { [Op.like]: `%${search}%` } },
				],
			});
		}

		// Default to Published if status not provided
		const finalStatus = status || "Published";
		if (finalStatus !== "all") {
			whereClause[Op.and].push({ status: finalStatus });
		}

		if (authorId) {
			whereClause[Op.and].push({ authorId });
		}

		// Filter by userId if provided (for student-specific announcements)
		let studentContext: {
			sectionIds: string[];
			courseIds: string[];
			departmentId: string | null;
		} | null = null;

		if (userId) {
			// Fetch student enrollment information
			const student = await User.findByPk(userId, {
				include: [
					{
						model: StudentEnrollment,
						as: "enrollments",
						where: { status: "enrolled" },
						required: false,
						include: [
							{
								model: Section,
								as: "section",
								include: [
									{
										model: Course,
										as: "course",
										include: [
											{
												model: Department,
												as: "department",
											},
										],
									},
								],
							},
						],
					},
					{
						model: Department,
						as: "department",
						required: false,
					},
				],
			});

			if (student) {
				const enrollments = (student as any).enrollments || [];
				const sectionIds = enrollments
					.map((enrollment: any) => enrollment?.section?.id)
					.filter(Boolean);
				const courseIds = enrollments
					.map((enrollment: any) => enrollment?.section?.course?.id)
					.filter(Boolean);
				const departmentId = (student as any).department?.id || null;

				studentContext = {
					sectionIds,
					courseIds,
					departmentId,
				};
			}
		}

		// When filtering by userId, we need to fetch matching announcements first
		// then filter by student context, then paginate
		// Fetch a reasonable amount (up to 500) to account for filtering, then paginate after
		const maxFetchLimit = userId ? Math.min(500, limit * 10) : limit; // Fetch more if filtering by userId
		const { count, rows: announcements } = await Announcement.findAndCountAll({
			where: whereClause,
			limit: maxFetchLimit,
			offset: userId ? 0 : offset, // Start from beginning if filtering by userId
			order: [
				["isPinned", "DESC"],
				["createdAt", "DESC"],
			],
			include: [
				{
					model: User,
					as: "author",
					attributes: ["id", "firstName", "lastName", "email"],
				},
				{
					model: AnnouncementTarget,
					as: "targets",
					attributes: ["id", "targetType", "targetId"],
				},
				{
					model: AnnouncementComment,
					as: "comments",
					attributes: ["id"],
					required: false,
				},
			],
		});

		// Filter announcements by student context if userId is provided
		// Note: We need to filter ALL announcements first, then paginate
		// So we fetch all matching announcements, filter them, then apply pagination
		let allFilteredAnnouncements = announcements;
		if (userId) {
			allFilteredAnnouncements = announcements.filter((announcement) => {
				const targets = (announcement as any).targets || [];
				
				// If no targets, don't include (shouldn't happen, but safety check)
				if (targets.length === 0) {
					return false;
				}

				// Check each target
				return targets.some((target: any) => {
					// If target is "all", include for everyone (even if studentContext is null)
					if (target.targetType === "all") {
						return true;
					}

					// If studentContext is null (no enrollments), only show "all" targeted announcements
					if (!studentContext) {
						return false;
					}

					// If target is "section", check if student is enrolled in that section
					if (target.targetType === "section" && target.targetId) {
						return studentContext.sectionIds.includes(target.targetId);
					}

					// If target is "course", check if student is enrolled in a section with that course
					if (target.targetType === "course" && target.targetId) {
						return studentContext.courseIds.includes(target.targetId);
					}

					// Default: don't include
					return false;
				});
			});
		}

		// Apply pagination AFTER filtering
		const totalFilteredCount = allFilteredAnnouncements.length;
		const paginatedAnnouncements = allFilteredAnnouncements.slice(offset, offset + limit);

		// Add comment count to each announcement
		const announcementsWithCommentCount = paginatedAnnouncements.map(announcement => ({
			...announcement.toJSON(),
			commentCount: announcement.comments?.length || 0,
		}));

		// Calculate pagination based on total filtered count (before pagination)
		const totalPages = Math.ceil(totalFilteredCount / limit);

		return {
			announcements: announcementsWithCommentCount,
			pagination: {
				currentPage: page,
				totalPages,
				totalItems: totalFilteredCount,
				itemsPerPage: limit,
			},
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to retrieve announcements");
	}
};

export const findAnnouncementByID = async (id: string) => {
	try {
		const announcement = await Announcement.findByPk(id, {
			include: [
				{
					model: User,
					as: "author",
					attributes: ["id", "firstName", "lastName", "email"],
				},
				{
					model: AnnouncementTarget,
					as: "targets",
					attributes: ["id", "targetType", "targetId"],
				},
				{
					model: AnnouncementComment,
					as: "comments",
					include: [
						{
							model: User,
							as: "user",
							attributes: ["id", "firstName", "lastName", "email"],
						},
					],
					order: [["createdAt", "ASC"]],
				},
			],
		});

		return announcement;
	} catch (error: any) {
		throw new Error(error.message || "Failed to find announcement");
	}
};

export const updateAnnouncementData = async (id: string, updateData: Partial<CreateAnnouncementParams>) => {
	try {
		const announcement = await Announcement.findByPk(id);

		if (!announcement) {
			throw new Error("Announcement not found");
		}

		// Update announcement fields
		const updateFields: any = {};
		if (updateData.title) updateFields.title = updateData.title;
		if (updateData.content) updateFields.content = updateData.content;
		if (updateData.priority) updateFields.priority = updateData.priority;
		if (updateData.status) updateFields.status = updateData.status;
		if (updateData.expiryDate !== undefined) updateFields.expiryDate = updateData.expiryDate;
		if (updateData.isPinned !== undefined) updateFields.isPinned = updateData.isPinned;

		await announcement.update(updateFields);

		// Update targets if provided
		if (updateData.targets) {
			// Remove existing targets
			await AnnouncementTarget.destroy({
				where: { announcementId: id },
			});

			// Create new targets
			if (updateData.targets.length > 0) {
				const targetPromises = updateData.targets.map(target =>
					AnnouncementTarget.create({
						announcementId: id,
						targetType: target.targetType,
						targetId: target.targetId,
					} as any)
				);
				await Promise.all(targetPromises);
			}
		}

		// Fetch updated announcement with relations
		const updatedAnnouncement = await Announcement.findByPk(id, {
			include: [
				{
					model: User,
					as: "author",
					attributes: ["id", "firstName", "lastName", "email"],
				},
				{
					model: AnnouncementTarget,
					as: "targets",
					attributes: ["id", "targetType", "targetId"],
				},
			],
		});

		return updatedAnnouncement;
	} catch (error: any) {
		throw new Error(error.message || "Failed to update announcement");
	}
};

export const deleteAnnouncementData = async (id: string) => {
	try {
		const announcement = await Announcement.findByPk(id);

		if (!announcement) {
			throw new Error("Announcement not found");
		}

		// Soft delete by setting status to "Archived"
		await announcement.update({ status: "Archived" });

		return announcement;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete announcement");
	}
};

export const getArchivedAnnouncementsData = async (params: {
	page: number;
	limit: number;
	search: string;
	authorId?: string;
}) => {
	try {
		const { page, limit, search, authorId } = params;
		const offset = (page - 1) * limit;

		const whereClause: any = {
			status: "Archived", // Only include archived announcements
		};
		if (authorId) {
			whereClause.authorId = authorId;
		}

		if (search) {
			whereClause[Op.or] = [
				{ title: { [Op.like]: `%${search}%` } },
				{ content: { [Op.like]: `%${search}%` } },
			];
		}

		const { count, rows: announcements } = await Announcement.findAndCountAll({
			where: whereClause,
			include: [
				{
					model: User,
					as: "author",
					attributes: ["id", "firstName", "lastName", "email"],
				},
			],
			limit,
			offset,
			order: [["updatedAt", "DESC"]],
		});

		// Look up who deleted each announcement from the audit logs
		const announcementIds = announcements.map((a) => a.id);
		let deletedByMap: Record<string, string> = {};

		if (announcementIds.length > 0) {
			const deletionLogs = await AuditLog.findAll({
				where: {
					resource: "System",
					action: "System Operation",
					resourceId: { [Op.in]: announcementIds },
				},
				include: [
					{
						model: User,
						as: "user",
						attributes: ["id", "firstName", "lastName", "email"],
					},
				],
				order: [["createdAt", "DESC"]],
			});

			for (const log of deletionLogs as any[]) {
				const aid = log.resourceId as string;
				if (!aid) continue;
				if (deletedByMap[aid]) continue;

				const deleter = log.user as User | undefined;
				if (deleter) {
					const fullName = `${deleter.firstName ?? ""} ${deleter.lastName ?? ""}`.trim();
					deletedByMap[aid] = fullName || deleter.email || "Unknown";
				} else {
					deletedByMap[aid] = "Unknown";
				}
			}
		}

		// Transform to archive format
		const items = announcements.map((announcement) => ({
			id: announcement.id,
			type: "announcement" as const,
			name: announcement.title,
			deletedAt: announcement.updatedAt.toISOString(),
			deletedBy: deletedByMap[announcement.id] ?? null,
			meta: {
				author: announcement.author ? `${announcement.author.firstName} ${announcement.author.lastName}` : null,
				priority: announcement.priority,
			},
			raw: announcement.toJSON(),
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
	} catch (error: any) {
		throw new Error(error.message || "Failed to retrieve archived announcements");
	}
};

export const restoreAnnouncementData = async (id: string) => {
	const t = await sequelize.transaction();

	try {
		const announcement = await Announcement.findOne({
			where: { id, status: "Archived" },
			transaction: t,
		});

		if (!announcement) {
			await t.rollback();
			throw new NotFoundError("Archived announcement not found.");
		}

		// Restore by setting status to "Published"
		await announcement.update({ status: "Published" }, { transaction: t });

		await t.commit();

		return announcement;
	} catch (error) {
		await t.rollback();
		throw error;
	}
};

export const hardDeleteAnnouncementData = async (id: string) => {
	const t = await sequelize.transaction();

	try {
		const announcement = await Announcement.findOne({
			where: { id, status: "Archived" },
			transaction: t,
		});

		if (!announcement) {
			await t.rollback();
			throw new NotFoundError("Archived announcement not found.");
		}

		// Delete related targets and comments first
		await AnnouncementTarget.destroy({
			where: { announcementId: id },
			transaction: t,
		});

		await AnnouncementComment.destroy({
			where: { announcementId: id },
			transaction: t,
		});

		// Finally, delete the announcement
		await announcement.destroy({ transaction: t });

		await t.commit();

		return { success: true };
	} catch (error) {
		await t.rollback();
		throw error;
	}
};

export const incrementAnnouncementViews = async (id: string) => {
	try {
		const announcement = await Announcement.findByPk(id);

		if (!announcement) {
			throw new Error("Announcement not found");
		}

		await announcement.increment("views");

		return true;
	} catch (error: any) {
		throw new Error(error.message || "Failed to increment views");
	}
};

export const toggleAnnouncementPin = async (id: string) => {
	try {
		const announcement = await Announcement.findByPk(id);

		if (!announcement) {
			throw new Error("Announcement not found");
		}

		await announcement.update({ isPinned: !announcement.isPinned });

		return announcement;
	} catch (error: any) {
		throw new Error(error.message || "Failed to toggle pin status");
	}
};

// Comment Management Functions

export const createAnnouncementCommentData = async (data: CreateAnnouncementCommentParams) => {
	try {
		// Check if announcement exists
		const announcement = await Announcement.findByPk(data.announcementId);
		if (!announcement) {
			throw new Error("Announcement not found");
		}

		const comment = await AnnouncementComment.create(data as any);

		// Fetch comment with user details
		const commentWithUser = await AnnouncementComment.findByPk(comment.id, {
			include: [
				{
					model: User,
					as: "user",
					attributes: ["id", "firstName", "lastName", "email"],
				},
			],
		});

		return {
			comment: commentWithUser,
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to create comment");
	}
};

export const getAnnouncementCommentsData = async (params: GetAnnouncementCommentsParams) => {
	try {
		const { announcementId, page, limit } = params;
		const offset = (page - 1) * limit;

		// Check if announcement exists
		const announcement = await Announcement.findByPk(announcementId);
		if (!announcement) {
			throw new Error("Announcement not found");
		}

		const { count, rows: comments } = await AnnouncementComment.findAndCountAll({
			where: { announcementId },
			limit,
			offset,
			order: [["createdAt", "ASC"]],
			include: [
				{
					model: User,
					as: "user",
					attributes: ["id", "firstName", "lastName", "email"],
				},
			],
		});

		const totalPages = Math.ceil(count / limit);

		return {
			comments,
			pagination: {
				currentPage: page,
				totalPages,
				totalItems: count,
				itemsPerPage: limit,
			},
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to retrieve comments");
	}
};

export const deleteAnnouncementCommentData = async (id: string) => {
	try {
		const comment = await AnnouncementComment.findByPk(id);

		if (!comment) {
			throw new Error("Comment not found");
		}

		await comment.destroy();

		return true;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete comment");
	}
};

export const getAnnouncementStats = async (authorId?: string) => {
	try {
		const whereClause: any = {};
		if (authorId) {
			whereClause.authorId = authorId;
		}

		const totalAnnouncements = await Announcement.count({
			where: whereClause,
		});

		const publishedAnnouncements = await Announcement.count({
			where: { ...whereClause, status: "Published" },
		});

		const draftAnnouncements = await Announcement.count({
			where: { ...whereClause, status: "Draft" },
		});

		const archivedAnnouncements = await Announcement.count({
			where: { ...whereClause, status: "Archived" },
		});

		const pinnedAnnouncements = await Announcement.count({
			where: { ...whereClause, isPinned: true },
		});

		const totalViews = await Announcement.sum("views", {
			where: whereClause,
		}) || 0;

		return {
			totalAnnouncements,
			publishedAnnouncements,
			draftAnnouncements,
			archivedAnnouncements,
			pinnedAnnouncements,
			totalViews,
		};
	} catch (error: any) {
		throw new Error(error.message || "Failed to get announcement statistics");
	}
};
