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
// List attendance records
router.get("/attendance", auth_1.isAuthenticated, _1.listAttendanceController);
// List attendance scoped to instructor
router.get("/instructor/attendance", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.listInstructorAttendanceController);
// Student-specific attendance endpoints (must come before /attendance/:id)
router.get("/attendance/student/:studentId", auth_1.isAuthenticated, _1.getStudentAttendanceController);
router.get("/attendance/stats", auth_1.isAuthenticated, _1.getAttendanceStatsController);
router.get("/attendance/today/:studentId", auth_1.isAuthenticated, _1.getTodayAttendanceController);
// Clock-in with optional photo
router.post("/attendance/clock-in", auth_1.isAuthenticated, uploader_1.default.single("photo"), _1.clockInController);
// Clock-out with optional photo
router.post("/attendance/clock-out", auth_1.isAuthenticated, uploader_1.default.single("photo"), _1.clockOutController);
// Get a single attendance record (must come after specific routes)
router.get("/attendance/:id", auth_1.isAuthenticated, _1.getAttendanceController);
// Approve attendance (instructor)
router.put("/attendance/:id/approve", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.approveAttendanceController);
// Reject attendance (instructor)
router.put("/attendance/:id/reject", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.rejectAttendanceController);
exports.default = router;
