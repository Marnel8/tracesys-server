import { Router } from "express";
import { isAuthenticated } from "@/middlewares/auth";
import upload from "@/utils/uploader";
import {
	clockInController,
	clockOutController,
	getAttendanceController,
	listAttendanceController,
	getStudentAttendanceController,
	getAttendanceStatsController,
	getTodayAttendanceController,
} from ".";

const router = Router();

// List attendance records
router.get("/attendance", isAuthenticated, listAttendanceController);

// Student-specific attendance endpoints (must come before /attendance/:id)
router.get("/attendance/student/:studentId", isAuthenticated, getStudentAttendanceController);
router.get("/attendance/stats", isAuthenticated, getAttendanceStatsController);
router.get("/attendance/today/:studentId", isAuthenticated, getTodayAttendanceController);

// Clock-in with optional photo
router.post(
	"/attendance/clock-in",
	isAuthenticated,
	upload.single("photo"),
	clockInController
);

// Clock-out with optional photo
router.post(
	"/attendance/clock-out",
	isAuthenticated,
	upload.single("photo"),
	clockOutController
);

// Get a single attendance record (must come after specific routes)
router.get("/attendance/:id", isAuthenticated, getAttendanceController);

export default router;


