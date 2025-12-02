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
// Create report from template
router.post("/reports/from-template", auth_1.isAuthenticated, _1.createReportFromTemplateController);
// Create draft report
router.post("/reports", auth_1.isAuthenticated, _1.createReportController);
// List reports
router.get("/reports", auth_1.isAuthenticated, _1.getReportsController);
// List reports scoped to instructor
router.get("/instructor/reports", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.getInstructorReportsController);
// Narrative reports (convenience endpoints)
router.post("/reports/narrative", auth_1.isAuthenticated, uploader_1.default.single("submissionFile"), _1.createNarrativeReportController);
router.get("/reports/narrative", auth_1.isAuthenticated, _1.listNarrativeReportsController);
// Get single report
router.get("/reports/:id", auth_1.isAuthenticated, _1.getReportController);
// Submit report (student)
router.post("/reports/:id/submit", auth_1.isAuthenticated, uploader_1.default.single("submissionFile"), _1.submitReportController);
// Approve (instructor)
router.put("/reports/:id/approve", auth_1.isAuthenticated, _1.approveReportController);
// Reject (instructor)
router.put("/reports/:id/reject", auth_1.isAuthenticated, _1.rejectReportController);
// Get report stats for student
router.get("/reports/stats/:studentId", auth_1.isAuthenticated, _1.getReportStatsController);
exports.default = router;
