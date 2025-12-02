"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const auth_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
// Create single invitation
router.post("/invitation/", auth_1.isAuthenticated, _1.createInvitationController);
// Create bulk invitations
router.post("/invitation/bulk", auth_1.isAuthenticated, _1.createBulkInvitationsController);
// Validate invitation token (public endpoint for checking before OAuth)
router.get("/invitation/validate/:token", _1.validateInvitationController);
// Get all invitations for authenticated instructor
router.get("/invitation/", auth_1.isAuthenticated, _1.getInvitationsController);
// Delete invitation
router.delete("/invitation/:id", auth_1.isAuthenticated, _1.deleteInvitationController);
exports.default = router;
