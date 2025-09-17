import { Router } from "express";
import {
	createDepartmentController,
	getDepartmentsController,
	getDepartmentController,
	updateDepartmentController,
	deleteDepartmentController,
} from ".";
import { isAuthenticated } from "@/middlewares/auth";

const router = Router();

// Create new department
router.post("/department/", isAuthenticated, createDepartmentController);

// Get all departments with pagination and search
router.get("/department/", getDepartmentsController);

// Get single department by ID
router.get("/department/:id", isAuthenticated, getDepartmentController);

// Update department by ID
router.put("/department/:id", isAuthenticated, updateDepartmentController);

// Delete department by ID
router.delete("/department/:id", isAuthenticated, deleteDepartmentController);

export default router;
