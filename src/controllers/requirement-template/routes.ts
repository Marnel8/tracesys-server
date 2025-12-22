import { Router } from "express";
import {
	createRequirementTemplateController,
	getRequirementTemplatesController,
	getRequirementTemplateController,
	updateRequirementTemplateController,
	deleteRequirementTemplateController,
	getArchivedRequirementTemplatesController,
	archiveRequirementTemplateController,
	restoreRequirementTemplateController,
	hardDeleteRequirementTemplateController,
} from ".";
import { isAuthenticated } from "@/middlewares/auth";
import upload from "@/utils/uploader";

const router = Router();

// Create new requirement template
router.post(
	"/requirement-template/",
	isAuthenticated,
	upload.single("templateFile"),
	createRequirementTemplateController
);

// Archive endpoints (placed before /requirement-template/:id to avoid conflicts)
router.get(
	"/requirement-template/archives",
	isAuthenticated,
	getArchivedRequirementTemplatesController
);
router.post(
	"/requirement-template/:id/archive",
	isAuthenticated,
	archiveRequirementTemplateController
);
router.post(
	"/requirement-template/:id/restore",
	isAuthenticated,
	restoreRequirementTemplateController
);
router.delete(
	"/requirement-template/:id/hard-delete",
	isAuthenticated,
	hardDeleteRequirementTemplateController
);

// Get all requirement templates with pagination/search
router.get("/requirement-template/", isAuthenticated, getRequirementTemplatesController);

// Get single template by ID
router.get("/requirement-template/:id", isAuthenticated, getRequirementTemplateController);

// Update template by ID
router.put(
	"/requirement-template/:id",
	isAuthenticated,
	upload.single("templateFile"),
	updateRequirementTemplateController
);

// Delete template by ID
router.delete("/requirement-template/:id", isAuthenticated, deleteRequirementTemplateController);

export default router;


