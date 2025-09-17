import { Router } from "express";
import {
	createSectionController,
	getSectionsController,
	getSectionController,
	updateSectionController,
	deleteSectionController,
} from ".";
import { isAuthenticated, authorizeRoles } from "@/middlewares/auth";

const router = Router();

// Create new section
router.post("/section/", isAuthenticated, authorizeRoles("instructor"), createSectionController);

// Get all sections with pagination and search
router.get("/section/", isAuthenticated, getSectionsController);

// Get single section by ID
router.get("/section/:id", isAuthenticated, getSectionController);

// Update section by ID
router.put("/section/:id", isAuthenticated, authorizeRoles("instructor"), updateSectionController);

// Delete section by ID
router.delete("/section/:id", isAuthenticated, authorizeRoles("instructor"), deleteSectionController);

export default router;
