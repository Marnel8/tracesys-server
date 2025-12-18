import { Router } from "express";
import {
	createAnnouncementController,
	getAnnouncementsController,
	getPublicAnnouncementsController,
	getAnnouncementController,
	updateAnnouncementController,
	deleteAnnouncementController,
	getArchivedAnnouncementsController,
	restoreAnnouncementController,
	hardDeleteAnnouncementController,
	togglePinAnnouncementController,
	getAnnouncementStatsController,
	createAnnouncementCommentController,
	getAnnouncementCommentsController,
	deleteAnnouncementCommentController,
} from ".";
import { isAuthenticated } from "@/middlewares/auth";
import { auditMiddlewares } from "@/middlewares/audit";

const router = Router();

// Announcement Management Routes

// Public route for published announcements (no authentication required)
router.get("/announcement/public", getPublicAnnouncementsController);

// Create new announcement
router.post("/announcement/", isAuthenticated, createAnnouncementController);

// Get all announcements with pagination and search
router.get("/announcement/", isAuthenticated, getAnnouncementsController);

// Get announcement statistics (must come before /:id route)
router.get("/announcement/stats", isAuthenticated, getAnnouncementStatsController);

// Archive endpoints (must come before /announcement/:id to avoid route conflicts)
router.get("/announcement/archives", isAuthenticated, getArchivedAnnouncementsController);
router.post("/announcement/:id/restore", isAuthenticated, restoreAnnouncementController);
router.delete("/announcement/:id/hard-delete", isAuthenticated, hardDeleteAnnouncementController);

// Get single announcement by ID
router.get("/announcement/:id", isAuthenticated, getAnnouncementController);

// Update announcement by ID
router.put("/announcement/:id", isAuthenticated, updateAnnouncementController);

// Delete announcement by ID
router.delete(
	"/announcement/:id",
	isAuthenticated,
	auditMiddlewares.systemOperation,
	deleteAnnouncementController
);

// Toggle pin status of announcement
router.put("/announcement/:id/pin", isAuthenticated, togglePinAnnouncementController);

// Comment Management Routes

// Create new comment for an announcement
router.post("/announcement/:announcementId/comment/", isAuthenticated, createAnnouncementCommentController);

// Get all comments for an announcement with pagination
router.get("/announcement/:announcementId/comment/", isAuthenticated, getAnnouncementCommentsController);

// Delete comment by ID
router.delete("/comment/:id", isAuthenticated, deleteAnnouncementCommentController);

export default router;
