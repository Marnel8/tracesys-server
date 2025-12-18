import { Router } from "express";
import {
	createAgencyController,
	getAgenciesController,
	getAgencyController,
	updateAgencyController,
	deleteAgencyController,
	getArchivedAgenciesController,
	restoreAgencyController,
	hardDeleteAgencyController,
	createSupervisorController,
	getSupervisorsController,
	getSupervisorController,
	updateSupervisorController,
	deleteSupervisorController,
	getAgencySupervisorStatsController,
} from ".";
import { isAuthenticated } from "@/middlewares/auth";
import { auditMiddlewares } from "@/middlewares/audit";

const router = Router();

// Create new agency
router.post("/agency/", isAuthenticated, createAgencyController);

// Get all agencies with pagination and search
router.get("/agency/", isAuthenticated, getAgenciesController);

// Archive endpoints (must come before /agency/:id to avoid route conflicts)
router.get("/agency/archives", isAuthenticated, getArchivedAgenciesController);
router.post("/agency/:id/restore", isAuthenticated, restoreAgencyController);
router.delete("/agency/:id/hard-delete", isAuthenticated, hardDeleteAgencyController);

// Get single agency by ID
router.get("/agency/:id", isAuthenticated, getAgencyController);

// Update agency by ID
router.put("/agency/:id", isAuthenticated, updateAgencyController);

// Delete agency by ID
router.delete(
	"/agency/:id",
	isAuthenticated,
	auditMiddlewares.agencyDelete,
	deleteAgencyController
);

// Supervisor Management Routes

// Create new supervisor for an agency
router.post("/agency/:agencyId/supervisor/", isAuthenticated, createSupervisorController);

// Get all supervisors for an agency with pagination and search
router.get("/agency/:agencyId/supervisor/", isAuthenticated, getSupervisorsController);

// Get single supervisor by ID
router.get("/supervisor/:id", isAuthenticated, getSupervisorController);

// Update supervisor by ID
router.put("/supervisor/:id", isAuthenticated, updateSupervisorController);

// Delete supervisor by ID
router.delete("/supervisor/:id", isAuthenticated, deleteSupervisorController);

// Get supervisor statistics for an agency
router.get("/agency/:agencyId/supervisor/stats", isAuthenticated, getAgencySupervisorStatsController);

export default router;
