import { Op } from "sequelize";
import Announcement from "@/db/models/announcement";
import User from "@/db/models/user";
import AnnouncementTarget from "@/db/models/announcement-target";
import AnnouncementComment from "@/db/models/announcement-comment";

interface CreateAnnouncementParams {
	title: string;
	content: string;
	priority: "Low" | "Medium" | "High";
	status: "Draft" | "Published" | "Archived";
	authorId: string;
	expiryDate?: Date;
	isPinned?: boolean;
	targets?: {
		targetType: "section" | "course" | "department" | "all";
		targetId?: string;
	}[];
}

interface GetAnnouncementsParams {
	page: number;
	limit: number;
	search?: string;
	status?: string;
	priority?: string;
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
			priority: data.priority,
			status: data.status,
			authorId: data.authorId,
			expiryDate: data.expiryDate,
			isPinned: data.isPinned || false,
		} as any);

		// Create targets if provided
		if (data.targets && data.targets.length > 0) {
			const targetPromises = data.targets.map(target =>
				AnnouncementTarget.create({
					announcementId: announcement.id,
					targetType: target.targetType,
					targetId: target.targetId,
				} as any)
			);
			await Promise.all(targetPromises);
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
		const { page, limit, search, status, priority, authorId, userId } = params;
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
					{ title: { [Op.iLike]: `%${search}%` } },
					{ content: { [Op.iLike]: `%${search}%` } },
				],
			});
		}

		if (status && status !== "all") {
			whereClause[Op.and].push({ status });
		}

		if (priority && priority !== "all") {
			whereClause[Op.and].push({ priority });
		}

		if (authorId) {
			whereClause[Op.and].push({ authorId });
		}

		const { count, rows: announcements } = await Announcement.findAndCountAll({
			where: whereClause,
			limit,
			offset,
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

		// Add comment count to each announcement
		const announcementsWithCommentCount = announcements.map(announcement => ({
			...announcement.toJSON(),
			commentCount: announcement.comments?.length || 0,
		}));

		const totalPages = Math.ceil(count / limit);

		return {
			announcements: announcementsWithCommentCount,
			pagination: {
				currentPage: page,
				totalPages,
				totalItems: count,
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

		// Delete related targets and comments first
		await AnnouncementTarget.destroy({
			where: { announcementId: id },
		});

		await AnnouncementComment.destroy({
			where: { announcementId: id },
		});

		await announcement.destroy();

		return true;
	} catch (error: any) {
		throw new Error(error.message || "Failed to delete announcement");
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
