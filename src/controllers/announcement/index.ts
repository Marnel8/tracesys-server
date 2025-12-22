import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import {
	BadRequestError,
	ConflictError,
	NotFoundError,
} from "@/utils/error";
import { 
	createAnnouncementData, 
	findAnnouncementByID, 
	updateAnnouncementData, 
	deleteAnnouncementData, 
	getAnnouncementsData,
	createAnnouncementCommentData,
	getAnnouncementCommentsData,
	deleteAnnouncementCommentData,
	incrementAnnouncementViews,
	toggleAnnouncementPin,
	getAnnouncementStats,
	getArchivedAnnouncementsData,
	restoreAnnouncementData,
	hardDeleteAnnouncementData
} from "@/data/announcement";

// Announcement data interface
interface AnnouncementData {
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

// Comment data interface
interface CommentData {
	announcementId: string;
	userId: string;
	content: string;
}

export const createAnnouncementController = async (req: Request, res: Response) => {
	const {
		title,
		content,
		priority = "Medium",
		status = "Published",
		authorId,
		expiryDate,
		isPinned = false,
		targets = [],
	}: AnnouncementData = req.body;

	// Always trust authenticated instructor for authoring to avoid cross-instructor leakage
	const authUser = req.user as any;
	const resolvedAuthorId =
		authUser?.role === "instructor" ? authUser.id : authorId;

	if (!title || !content || !resolvedAuthorId) {
		throw new BadRequestError("Please provide title, content, and author ID.");
	}

	const announcementData = {
		title,
		content,
		priority,
		status,
		authorId: resolvedAuthorId,
		expiryDate,
		isPinned,
		targets,
	};

	const result = await createAnnouncementData(announcementData);

	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Announcement created successfully",
		data: result,
	});
};

export const getAnnouncementsController = async (req: Request, res: Response) => {
	const { 
		page = 1, 
		limit = 10, 
		search = "", 
		authorId,
		userId
	} = req.query;

	// If the requester is an instructor, force scoping to their own announcements
	const authUser = req.user as any;
	const resolvedAuthorId =
		authUser?.role === "instructor" ? authUser.id : (authorId as string | undefined);

	const result = await getAnnouncementsData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: "Published",
		authorId: resolvedAuthorId,
		userId: userId as string,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Announcements retrieved successfully",
		data: result,
	});
};

// Public controller for published announcements (no authentication required)
export const getPublicAnnouncementsController = async (req: Request, res: Response) => {
	const { 
		page = 1, 
		limit = 10, 
		search = ""
	} = req.query;

	// Only allow fetching published announcements for public access
	const result = await getAnnouncementsData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: "Published", // Force status to Published for public access
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Public announcements retrieved successfully",
		data: result,
	});
};

export const getAnnouncementController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Announcement ID is required");
	}

	const announcement = await findAnnouncementByID(id);

	if (!announcement) {
		throw new NotFoundError("Announcement not found");
	}

	// Increment views when viewing announcement
	await incrementAnnouncementViews(id);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Announcement retrieved successfully",
		data: announcement,
	});
};

export const updateAnnouncementController = async (req: Request, res: Response) => {
	const { id } = req.params;
	const updateData = req.body;

	if (!id) {
		throw new BadRequestError("Announcement ID is required");
	}

	const announcement = await findAnnouncementByID(id);

	if (!announcement) {
		throw new NotFoundError("Announcement not found");
	}

	const result = await updateAnnouncementData(id, updateData);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Announcement updated successfully",
		data: result,
	});
};

export const deleteAnnouncementController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Announcement ID is required");
	}

	const announcement = await findAnnouncementByID(id);

	if (!announcement) {
		throw new NotFoundError("Announcement not found");
	}

	await deleteAnnouncementData(id);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Announcement deleted successfully",
	});
};

export const togglePinAnnouncementController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Announcement ID is required");
	}

	const announcement = await findAnnouncementByID(id);

	if (!announcement) {
		throw new NotFoundError("Announcement not found");
	}

	const result = await toggleAnnouncementPin(id);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Announcement pin status updated successfully",
		data: result,
	});
};

export const getAnnouncementStatsController = async (req: Request, res: Response) => {
	const { authorId } = req.query;

	const stats = await getAnnouncementStats(authorId as string);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Announcement statistics retrieved successfully",
		data: stats,
	});
};

// Comment Management Controllers

export const createAnnouncementCommentController = async (req: Request, res: Response) => {
	const {
		announcementId,
		userId,
		content,
	}: CommentData = req.body;

	if (!announcementId || !userId || !content) {
		throw new BadRequestError("Please provide announcement ID, user ID, and content.");
	}

	const commentData = {
		announcementId,
		userId,
		content,
	};

	const result = await createAnnouncementCommentData(commentData);

	res.status(StatusCodes.CREATED).json({
		success: true,
		message: "Comment created successfully",
		data: result,
	});
};

export const getAnnouncementCommentsController = async (req: Request, res: Response) => {
	const { announcementId } = req.params;
	const { page = 1, limit = 10 } = req.query;

	if (!announcementId) {
		throw new BadRequestError("Announcement ID is required");
	}

	const result = await getAnnouncementCommentsData({
		announcementId,
		page: Number(page),
		limit: Number(limit),
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Comments retrieved successfully",
		data: result,
	});
};

export const deleteAnnouncementCommentController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Comment ID is required");
	}

	const comment = await deleteAnnouncementCommentData(id);

	if (!comment) {
		throw new NotFoundError("Comment not found");
	}

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Comment deleted successfully",
	});
};

export const getArchivedAnnouncementsController = async (req: Request, res: Response) => {
	const { page = 1, limit = 10, search = "" } = req.query;
	const authUser = req.user as any;
	const authorId = authUser?.role === "instructor" ? authUser.id : undefined;

	const result = await getArchivedAnnouncementsData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		authorId,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		data: result,
	});
};

export const restoreAnnouncementController = async (req: Request, res: Response) => {
	const { id } = req.params;

	if (!id) {
		throw new BadRequestError("Announcement ID is required.");
	}

	const announcement = await restoreAnnouncementData(id);

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Announcement restored successfully",
		data: announcement,
	});
};

export const hardDeleteAnnouncementController = async (req: Request, res: Response) => {
	try {
		const { id } = req.params;

		if (!id) {
			throw new BadRequestError("Announcement ID is required.");
		}

		await hardDeleteAnnouncementData(id);

		res.status(StatusCodes.OK).json({
			success: true,
			message: "Announcement permanently deleted successfully",
		});
	} catch (error: any) {
		res.status(error.statusCode || StatusCodes.INTERNAL_SERVER_ERROR).json({
			success: false,
			message: error.message || "Failed to permanently delete announcement",
		});
	}
};
