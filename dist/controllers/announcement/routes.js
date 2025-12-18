"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const auth_1 = require("../../middlewares/auth.js");
const audit_1 = require("../../middlewares/audit.js");
const router = (0, express_1.Router)();
// Announcement Management Routes
// Public route for published announcements (no authentication required)
router.get("/announcement/public", _1.getPublicAnnouncementsController);
// Create new announcement
router.post("/announcement/", auth_1.isAuthenticated, _1.createAnnouncementController);
// Get all announcements with pagination and search
router.get("/announcement/", auth_1.isAuthenticated, _1.getAnnouncementsController);
// Get announcement statistics (must come before /:id route)
router.get("/announcement/stats", auth_1.isAuthenticated, _1.getAnnouncementStatsController);
// Archive endpoints (must come before /announcement/:id to avoid route conflicts)
router.get("/announcement/archives", auth_1.isAuthenticated, _1.getArchivedAnnouncementsController);
router.post("/announcement/:id/restore", auth_1.isAuthenticated, _1.restoreAnnouncementController);
router.delete("/announcement/:id/hard-delete", auth_1.isAuthenticated, _1.hardDeleteAnnouncementController);
// Get single announcement by ID
router.get("/announcement/:id", auth_1.isAuthenticated, _1.getAnnouncementController);
// Update announcement by ID
router.put("/announcement/:id", auth_1.isAuthenticated, _1.updateAnnouncementController);
// Delete announcement by ID
router.delete("/announcement/:id", auth_1.isAuthenticated, audit_1.auditMiddlewares.systemOperation, _1.deleteAnnouncementController);
// Toggle pin status of announcement
router.put("/announcement/:id/pin", auth_1.isAuthenticated, _1.togglePinAnnouncementController);
// Comment Management Routes
// Create new comment for an announcement
router.post("/announcement/:announcementId/comment/", auth_1.isAuthenticated, _1.createAnnouncementCommentController);
// Get all comments for an announcement with pagination
router.get("/announcement/:announcementId/comment/", auth_1.isAuthenticated, _1.getAnnouncementCommentsController);
// Delete comment by ID
router.delete("/comment/:id", auth_1.isAuthenticated, _1.deleteAnnouncementCommentController);
exports.default = router;
