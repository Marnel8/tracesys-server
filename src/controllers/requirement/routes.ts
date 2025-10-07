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
	getRequirementStatsController,
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

// Get requirement stats for student
router.get("/requirements/stats/:studentId", isAuthenticated, getRequirementStatsController);

export default router;


