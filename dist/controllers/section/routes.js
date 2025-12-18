"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const auth_1 = require("../../middlewares/auth.js");
const audit_1 = require("../../middlewares/audit.js");
const router = (0, express_1.Router)();
// Create new section
router.post("/section/", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.createSectionController);
// Get all sections with pagination and search
router.get("/section/", auth_1.isAuthenticated, _1.getSectionsController);
// Archive endpoints (must come before /section/:id to avoid route conflicts)
router.get("/section/archives", auth_1.isAuthenticated, _1.getArchivedSectionsController);
router.post("/section/:id/restore", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.restoreSectionController);
router.delete("/section/:id/hard-delete", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.hardDeleteSectionController);
// Get single section by ID
router.get("/section/:id", auth_1.isAuthenticated, _1.getSectionController);
// Update section by ID
router.put("/section/:id", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.updateSectionController);
// Delete section by ID
router.delete("/section/:id", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), audit_1.auditMiddlewares.systemOperation, _1.deleteSectionController);
exports.default = router;
