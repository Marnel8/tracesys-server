import { Router } from "express";
import {
	createAuditLogController,
	getAuditLogsController,
	getAuditLogController,
	getAuditStatsController,
	getAuditUsersController,
	exportAuditLogsController,
	deleteOldAuditLogsController,
	getAuditCategoriesController,
	getAuditSeveritiesController,
	getAuditStatusesController,
} from "./index";
import { isAuthenticated } from "@/middlewares/auth";

const router = Router();

// Audit log CRUD operations
router.post("/audit/", isAuthenticated, createAuditLogController);
router.get("/audit/", isAuthenticated, getAuditLogsController);
router.get("/audit/stats", isAuthenticated, getAuditStatsController);
router.get("/audit/users", isAuthenticated, getAuditUsersController);
router.get("/audit/categories", isAuthenticated, getAuditCategoriesController);
router.get("/audit/severities", isAuthenticated, getAuditSeveritiesController);
router.get("/audit/statuses", isAuthenticated, getAuditStatusesController);
router.get("/audit/export", isAuthenticated, exportAuditLogsController);
router.get("/audit/:id", isAuthenticated, getAuditLogController);
router.delete("/audit/cleanup", isAuthenticated, deleteOldAuditLogsController);

export default router;
