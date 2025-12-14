import { Router } from "express";
import { isAuthenticated, authorizeRoles } from "@/middlewares/auth";
import upload from "@/utils/uploader";
import {
	approveRequirementController,
	createRequirementFromTemplateController,
	getRequirementController,
	getRequirementsController,
	getInstructorRequirementsController,
	rejectRequirementController,
	submitRequirementController,
	updateRequirementDueDateController,
	getRequirementStatsController,
	createRequirementCommentController,
	getRequirementCommentsController,
	getStudentRequirementCommentsController,
} from ".";

const router = Router();

// Create requirement from template
router.post(
	"/requirements/from-template",
	isAuthenticated,
	createRequirementFromTemplateController
);

// List requirements
router.get("/requirements", isAuthenticated, getRequirementsController);

// List requirements scoped to instructor
router.get(
	"/instructor/requirements",
	isAuthenticated,
	authorizeRoles("instructor"),
	getInstructorRequirementsController
);

// Get single requirement
router.get("/requirements/:id", isAuthenticated, getRequirementController);

// Submit requirement (student)
router.post(
	"/requirements/:id/submit",
	isAuthenticated,
	upload.single("submissionFile"),
	submitRequirementController
);

// Approve (instructor)
router.put(
	"/requirements/:id/approve",
	isAuthenticated,
	approveRequirementController
);

// Reject (instructor)
router.put(
	"/requirements/:id/reject",
	isAuthenticated,
	rejectRequirementController
);

// Update due date (instructor)
router.put(
	"/requirements/:id/due-date",
	isAuthenticated,
	authorizeRoles("instructor"),
	updateRequirementDueDateController
);

// Get requirement stats for student
router.get("/requirements/stats/:studentId", isAuthenticated, getRequirementStatsController);

// Create comment on requirement (instructor only)
router.post(
	"/requirements/:id/comments",
	isAuthenticated,
	authorizeRoles("instructor"),
	createRequirementCommentController
);

// Get comments for a requirement (authenticated)
router.get("/requirements/:id/comments", isAuthenticated, getRequirementCommentsController);

// Get unread comments for a student (student only, for notifications)
router.get(
	"/requirements/comments/student/:studentId",
	isAuthenticated,
	getStudentRequirementCommentsController
);

export default router;


