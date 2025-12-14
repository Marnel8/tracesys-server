"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middlewares/auth.js");
const uploader_1 = __importDefault(require("../../utils/uploader.js"));
const _1 = require("./index.js");
const router = (0, express_1.Router)();
// Create requirement from template
router.post("/requirements/from-template", auth_1.isAuthenticated, _1.createRequirementFromTemplateController);
// List requirements
router.get("/requirements", auth_1.isAuthenticated, _1.getRequirementsController);
// List requirements scoped to instructor
router.get("/instructor/requirements", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.getInstructorRequirementsController);
// Get single requirement
router.get("/requirements/:id", auth_1.isAuthenticated, _1.getRequirementController);
// Submit requirement (student)
router.post("/requirements/:id/submit", auth_1.isAuthenticated, uploader_1.default.single("submissionFile"), _1.submitRequirementController);
// Approve (instructor)
router.put("/requirements/:id/approve", auth_1.isAuthenticated, _1.approveRequirementController);
// Reject (instructor)
router.put("/requirements/:id/reject", auth_1.isAuthenticated, _1.rejectRequirementController);
// Update due date (instructor)
router.put("/requirements/:id/due-date", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.updateRequirementDueDateController);
// Get requirement stats for student
router.get("/requirements/stats/:studentId", auth_1.isAuthenticated, _1.getRequirementStatsController);
// Create comment on requirement (instructor only)
router.post("/requirements/:id/comments", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.createRequirementCommentController);
// Get comments for a requirement (authenticated)
router.get("/requirements/:id/comments", auth_1.isAuthenticated, _1.getRequirementCommentsController);
// Get unread comments for a student (student only, for notifications)
router.get("/requirements/comments/student/:studentId", auth_1.isAuthenticated, _1.getStudentRequirementCommentsController);
exports.default = router;
