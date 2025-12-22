"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const auth_1 = require("../../middlewares/auth.js");
const uploader_1 = __importDefault(require("../../utils/uploader.js"));
const router = (0, express_1.Router)();
// Create new requirement template
router.post("/requirement-template/", auth_1.isAuthenticated, uploader_1.default.single("templateFile"), _1.createRequirementTemplateController);
// Archive endpoints (placed before /requirement-template/:id to avoid conflicts)
router.get("/requirement-template/archives", auth_1.isAuthenticated, _1.getArchivedRequirementTemplatesController);
router.post("/requirement-template/:id/archive", auth_1.isAuthenticated, _1.archiveRequirementTemplateController);
router.post("/requirement-template/:id/restore", auth_1.isAuthenticated, _1.restoreRequirementTemplateController);
router.delete("/requirement-template/:id/hard-delete", auth_1.isAuthenticated, _1.hardDeleteRequirementTemplateController);
// Get all requirement templates with pagination/search
router.get("/requirement-template/", auth_1.isAuthenticated, _1.getRequirementTemplatesController);
// Get single template by ID
router.get("/requirement-template/:id", auth_1.isAuthenticated, _1.getRequirementTemplateController);
// Update template by ID
router.put("/requirement-template/:id", auth_1.isAuthenticated, uploader_1.default.single("templateFile"), _1.updateRequirementTemplateController);
// Delete template by ID
router.delete("/requirement-template/:id", auth_1.isAuthenticated, _1.deleteRequirementTemplateController);
exports.default = router;
