import { Router } from "express";
import {
	createStudentController,
	getStudentsController,
	getStudentController,
	getStudentsByTeacherController,
	updateStudentController,
	deleteStudentController,
	getArchivedStudentsController,
	restoreStudentController,
	hardDeleteStudentController,
} from ".";
import { uploadUserAvatar, uploadUserAvatarUpdate } from "@/utils/image-handler";
import { isAuthenticated } from "@/middlewares/auth";
import { auditMiddlewares } from "@/middlewares/audit";

const router = Router();

// Create new student with practicum information
// Get students by teacher with pagination and search
router.post("/student/", isAuthenticated, uploadUserAvatar, createStudentController);

router.get("/student/teacher/:teacherId", isAuthenticated, getStudentsByTeacherController);

// Archive endpoints (must come before /student/:id to avoid route conflicts)
router.get("/student/archives", isAuthenticated, getArchivedStudentsController);
router.post("/student/:id/restore", isAuthenticated, restoreStudentController);
router.delete("/student/:id/hard-delete", isAuthenticated, hardDeleteStudentController);

// Get single student by ID
router.get("/student/:id", isAuthenticated, getStudentController);
// Get all students with pagination and search
router.get("/student/", isAuthenticated, getStudentsController);

// Update student information
router.put("/student/:id", isAuthenticated, uploadUserAvatarUpdate, updateStudentController);

// Delete (deactivate) student
router.delete(
	"/student/:id",
	isAuthenticated,
	auditMiddlewares.userDelete,
	deleteStudentController
);

export default router;