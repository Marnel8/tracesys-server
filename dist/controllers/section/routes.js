"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const auth_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
// Create new section
router.post("/section/", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.createSectionController);
// Get all sections with pagination and search
router.get("/section/", auth_1.isAuthenticated, _1.getSectionsController);
// Get single section by ID
router.get("/section/:id", auth_1.isAuthenticated, _1.getSectionController);
// Update section by ID
router.put("/section/:id", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.updateSectionController);
// Delete section by ID
router.delete("/section/:id", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("instructor"), _1.deleteSectionController);
exports.default = router;
