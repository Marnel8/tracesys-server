import { Router } from "express";
import {
	createCourseController,
	getCoursesController,
	getCourseController,
	updateCourseController,
	deleteCourseController,
} from ".";
import { isAuthenticated } from "@/middlewares/auth";

const router = Router();

// Create new course
router.post("/course/", isAuthenticated, createCourseController);

// Get all courses with pagination and search (public - needed for signup forms)
router.get("/course/", getCoursesController);

// Get single course by ID
router.get("/course/:id", isAuthenticated, getCourseController);

// Update course by ID
router.put("/course/:id", isAuthenticated, updateCourseController);

// Delete course by ID
router.delete("/course/:id", isAuthenticated, deleteCourseController);

export default router;
