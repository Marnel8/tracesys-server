import { Router } from "express";
import {
	createSectionController,
	getSectionsController,
	getSectionController,
	updateSectionController,
	deleteSectionController,
	getArchivedSectionsController,
	restoreSectionController,
	hardDeleteSectionController,
} from ".";
import { isAuthenticated, authorizeRoles } from "@/middlewares/auth";
import { auditMiddlewares } from "@/middlewares/audit";

const router = Router();

// Create new section
router.post("/section/", isAuthenticated, authorizeRoles("instructor"), createSectionController);

// Get all sections with pagination and search
router.get("/section/", isAuthenticated, getSectionsController);

// Archive endpoints (must come before /section/:id to avoid route conflicts)
router.get("/section/archives", isAuthenticated, getArchivedSectionsController);
router.post("/section/:id/restore", isAuthenticated, authorizeRoles("instructor"), restoreSectionController);
router.delete("/section/:id/hard-delete", isAuthenticated, authorizeRoles("instructor"), hardDeleteSectionController);

// Get single section by ID
router.get("/section/:id", isAuthenticated, getSectionController);

// Update section by ID
router.put("/section/:id", isAuthenticated, authorizeRoles("instructor"), updateSectionController);

// Delete section by ID
router.delete(
	"/section/:id",
	isAuthenticated,
	authorizeRoles("instructor"),
	auditMiddlewares.systemOperation,
	deleteSectionController
);

export default router;
