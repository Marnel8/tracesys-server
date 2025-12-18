import { Router } from "express";
import {
	createCourseController,
	getCoursesController,
	getCourseController,
	updateCourseController,
	deleteCourseController,
	getArchivedCoursesController,
	restoreCourseController,
	hardDeleteCourseController,
} from ".";
import { isAuthenticated } from "@/middlewares/auth";
import { auditMiddlewares } from "@/middlewares/audit";

const router = Router();

// Create new course
router.post("/course/", isAuthenticated, createCourseController);

// Get all courses with pagination and search (public - needed for signup forms)
router.get("/course/", getCoursesController);

// Archive endpoints (must come before /course/:id to avoid route conflicts)
router.get("/course/archives", isAuthenticated, getArchivedCoursesController);
router.post("/course/:id/restore", isAuthenticated, restoreCourseController);
router.delete("/course/:id/hard-delete", isAuthenticated, hardDeleteCourseController);

// Get single course by ID
router.get("/course/:id", isAuthenticated, getCourseController);

// Update course by ID
router.put("/course/:id", isAuthenticated, updateCourseController);

// Delete course by ID
router.delete(
	"/course/:id",
	isAuthenticated,
	auditMiddlewares.systemOperation,
	deleteCourseController
);

export default router;
