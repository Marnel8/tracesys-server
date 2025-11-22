import { Router } from "express";
import {
	createInvitationController,
	createBulkInvitationsController,
	validateInvitationController,
	getInvitationsController,
	deleteInvitationController,
} from ".";
import { isAuthenticated } from "@/middlewares/auth";

const router = Router();

// Create single invitation
router.post("/invitation/", isAuthenticated, createInvitationController);

// Create bulk invitations
router.post("/invitation/bulk", isAuthenticated, createBulkInvitationsController);

// Validate invitation token (public endpoint for checking before OAuth)
router.get("/invitation/validate/:token", validateInvitationController);

// Get all invitations for authenticated instructor
router.get("/invitation/", isAuthenticated, getInvitationsController);

// Delete invitation
router.delete("/invitation/:id", isAuthenticated, deleteInvitationController);

export default router;

