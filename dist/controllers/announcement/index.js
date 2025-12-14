"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAnnouncementCommentController = exports.getAnnouncementCommentsController = exports.createAnnouncementCommentController = exports.getAnnouncementStatsController = exports.togglePinAnnouncementController = exports.deleteAnnouncementController = exports.updateAnnouncementController = exports.getAnnouncementController = exports.getPublicAnnouncementsController = exports.getAnnouncementsController = exports.createAnnouncementController = void 0;
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const announcement_1 = require("../../data/announcement.js");
const createAnnouncementController = async (req, res) => {
    const { title, content, priority = "Medium", status = "Published", authorId, expiryDate, isPinned = false, targets = [], } = req.body;
    if (!title || !content || !authorId) {
        throw new error_1.BadRequestError("Please provide title, content, and author ID.");
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
    const result = await (0, announcement_1.createAnnouncementData)(announcementData);
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Announcement created successfully",
        data: result,
    });
};
exports.createAnnouncementController = createAnnouncementController;
const getAnnouncementsController = async (req, res) => {
    const { page = 1, limit = 10, search = "", authorId, userId } = req.query;
    const result = await (0, announcement_1.getAnnouncementsData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
        status: "Published",
        authorId: authorId,
        userId: userId,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Announcements retrieved successfully",
        data: result,
    });
};
exports.getAnnouncementsController = getAnnouncementsController;
// Public controller for published announcements (no authentication required)
const getPublicAnnouncementsController = async (req, res) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    // Only allow fetching published announcements for public access
    const result = await (0, announcement_1.getAnnouncementsData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
        status: "Published", // Force status to Published for public access
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Public announcements retrieved successfully",
        data: result,
    });
};
exports.getPublicAnnouncementsController = getPublicAnnouncementsController;
const getAnnouncementController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Announcement ID is required");
    }
    const announcement = await (0, announcement_1.findAnnouncementByID)(id);
    if (!announcement) {
        throw new error_1.NotFoundError("Announcement not found");
    }
    // Increment views when viewing announcement
    await (0, announcement_1.incrementAnnouncementViews)(id);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Announcement retrieved successfully",
        data: announcement,
    });
};
exports.getAnnouncementController = getAnnouncementController;
const updateAnnouncementController = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) {
        throw new error_1.BadRequestError("Announcement ID is required");
    }
    const announcement = await (0, announcement_1.findAnnouncementByID)(id);
    if (!announcement) {
        throw new error_1.NotFoundError("Announcement not found");
    }
    const result = await (0, announcement_1.updateAnnouncementData)(id, updateData);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Announcement updated successfully",
        data: result,
    });
};
exports.updateAnnouncementController = updateAnnouncementController;
const deleteAnnouncementController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Announcement ID is required");
    }
    const announcement = await (0, announcement_1.findAnnouncementByID)(id);
    if (!announcement) {
        throw new error_1.NotFoundError("Announcement not found");
    }
    await (0, announcement_1.deleteAnnouncementData)(id);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Announcement deleted successfully",
    });
};
exports.deleteAnnouncementController = deleteAnnouncementController;
const togglePinAnnouncementController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Announcement ID is required");
    }
    const announcement = await (0, announcement_1.findAnnouncementByID)(id);
    if (!announcement) {
        throw new error_1.NotFoundError("Announcement not found");
    }
    const result = await (0, announcement_1.toggleAnnouncementPin)(id);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Announcement pin status updated successfully",
        data: result,
    });
};
exports.togglePinAnnouncementController = togglePinAnnouncementController;
const getAnnouncementStatsController = async (req, res) => {
    const { authorId } = req.query;
    const stats = await (0, announcement_1.getAnnouncementStats)(authorId);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Announcement statistics retrieved successfully",
        data: stats,
    });
};
exports.getAnnouncementStatsController = getAnnouncementStatsController;
// Comment Management Controllers
const createAnnouncementCommentController = async (req, res) => {
    const { announcementId, userId, content, } = req.body;
    if (!announcementId || !userId || !content) {
        throw new error_1.BadRequestError("Please provide announcement ID, user ID, and content.");
    }
    const commentData = {
        announcementId,
        userId,
        content,
    };
    const result = await (0, announcement_1.createAnnouncementCommentData)(commentData);
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Comment created successfully",
        data: result,
    });
};
exports.createAnnouncementCommentController = createAnnouncementCommentController;
const getAnnouncementCommentsController = async (req, res) => {
    const { announcementId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    if (!announcementId) {
        throw new error_1.BadRequestError("Announcement ID is required");
    }
    const result = await (0, announcement_1.getAnnouncementCommentsData)({
        announcementId,
        page: Number(page),
        limit: Number(limit),
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Comments retrieved successfully",
        data: result,
    });
};
exports.getAnnouncementCommentsController = getAnnouncementCommentsController;
const deleteAnnouncementCommentController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Comment ID is required");
    }
    const comment = await (0, announcement_1.deleteAnnouncementCommentData)(id);
    if (!comment) {
        throw new error_1.NotFoundError("Comment not found");
    }
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Comment deleted successfully",
    });
};
exports.deleteAnnouncementCommentController = deleteAnnouncementCommentController;
