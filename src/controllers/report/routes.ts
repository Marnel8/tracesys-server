import { Router } from "express";
import { isAuthenticated, authorizeRoles } from "@/middlewares/auth";
import upload from "@/utils/uploader";
import {
	approveReportController,
	createReportController,
	createReportFromTemplateController,
	getReportController,
	getReportsController,
	getInstructorReportsController,
	rejectReportController,
	submitReportController,
	getReportStatsController,
	createNarrativeReportController,
	listNarrativeReportsController,
	logReportViewController,
	getStudentReportViewNotificationsController,
} from ".";

const router = Router();

// Create report from template
router.post(
	"/reports/from-template",
	isAuthenticated,
	createReportFromTemplateController
);

// Create draft report
router.post(
	"/reports",
	isAuthenticated,
	createReportController
);

// List reports
router.get("/reports", isAuthenticated, getReportsController);

// List reports scoped to instructor
router.get(
	"/instructor/reports",
	isAuthenticated,
	authorizeRoles("instructor"),
	getInstructorReportsController
);

// Narrative reports (convenience endpoints)
router.post(
	"/reports/narrative",
	isAuthenticated,
	upload.single("submissionFile"),
	createNarrativeReportController
);
router.get("/reports/narrative", isAuthenticated, listNarrativeReportsController);

// Get single report
router.get("/reports/:id", isAuthenticated, getReportController);

// Submit report (student)
router.post(
	"/reports/:id/submit",
	isAuthenticated,
	upload.single("submissionFile"),
	submitReportController
);

// Approve (instructor)
router.put(
	"/reports/:id/approve",
	isAuthenticated,
	approveReportController
);

// Reject (instructor)
router.put(
	"/reports/:id/reject",
	isAuthenticated,
	rejectReportController
);

// Log a report view (instructor viewing a student's report)
router.post(
	"/reports/:id/view",
	isAuthenticated,
	authorizeRoles("instructor"),
	logReportViewController
);

// Get report view notifications for a student
router.get(
	"/reports/views/student/:studentId",
	isAuthenticated,
	getStudentReportViewNotificationsController
);

// Get report stats for student
router.get("/reports/stats/:studentId", isAuthenticated, getReportStatsController);

export default router;


