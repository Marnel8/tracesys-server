"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const auth_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
// Create new agency
router.post("/agency/", auth_1.isAuthenticated, _1.createAgencyController);
// Get all agencies with pagination and search
router.get("/agency/", auth_1.isAuthenticated, _1.getAgenciesController);
// Get single agency by ID
router.get("/agency/:id", auth_1.isAuthenticated, _1.getAgencyController);
// Update agency by ID
router.put("/agency/:id", auth_1.isAuthenticated, _1.updateAgencyController);
// Delete agency by ID
router.delete("/agency/:id", auth_1.isAuthenticated, _1.deleteAgencyController);
// Supervisor Management Routes
// Create new supervisor for an agency
router.post("/agency/:agencyId/supervisor/", auth_1.isAuthenticated, _1.createSupervisorController);
// Get all supervisors for an agency with pagination and search
router.get("/agency/:agencyId/supervisor/", auth_1.isAuthenticated, _1.getSupervisorsController);
// Get single supervisor by ID
router.get("/supervisor/:id", auth_1.isAuthenticated, _1.getSupervisorController);
// Update supervisor by ID
router.put("/supervisor/:id", auth_1.isAuthenticated, _1.updateSupervisorController);
// Delete supervisor by ID
router.delete("/supervisor/:id", auth_1.isAuthenticated, _1.deleteSupervisorController);
// Get supervisor statistics for an agency
router.get("/agency/:agencyId/supervisor/stats", auth_1.isAuthenticated, _1.getAgencySupervisorStatsController);
exports.default = router;
