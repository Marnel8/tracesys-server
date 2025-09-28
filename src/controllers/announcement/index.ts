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
	getAnnouncementStats
} from "@/data/announcement";

// Announcement data interface
interface AnnouncementData {
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
		status = "Draft",
		authorId,
		expiryDate,
		isPinned = false,
		targets = [],
	}: AnnouncementData = req.body;

	if (!title || !content || !authorId) {
		throw new BadRequestError("Please provide title, content, and author ID.");
	}

	const announcementData = {
		title,
		content,
		priority,
		status,
		authorId,
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
		status = "all", 
		priority = "all",
		authorId,
		userId
	} = req.query;

	const result = await getAnnouncementsData({
		page: Number(page),
		limit: Number(limit),
		search: search as string,
		status: status as string,
		priority: priority as string,
		authorId: authorId as string,
		userId: userId as string,
	});

	res.status(StatusCodes.OK).json({
		success: true,
		message: "Announcements retrieved successfully",
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
