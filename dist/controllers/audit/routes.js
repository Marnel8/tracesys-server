"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const index_1 = require("./index.js");
const auth_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
// Audit log CRUD operations
router.post("/audit/", auth_1.isAuthenticated, index_1.createAuditLogController);
router.get("/audit/", auth_1.isAuthenticated, index_1.getAuditLogsController);
router.get("/audit/stats", auth_1.isAuthenticated, index_1.getAuditStatsController);
router.get("/audit/users", auth_1.isAuthenticated, index_1.getAuditUsersController);
router.get("/audit/categories", auth_1.isAuthenticated, index_1.getAuditCategoriesController);
router.get("/audit/severities", auth_1.isAuthenticated, index_1.getAuditSeveritiesController);
router.get("/audit/statuses", auth_1.isAuthenticated, index_1.getAuditStatusesController);
router.get("/audit/export", auth_1.isAuthenticated, index_1.exportAuditLogsController);
router.get("/audit/:id", auth_1.isAuthenticated, index_1.getAuditLogController);
router.delete("/audit/cleanup", auth_1.isAuthenticated, index_1.deleteOldAuditLogsController);
exports.default = router;
