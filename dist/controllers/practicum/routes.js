"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const auth_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
router.post("/practicum/", auth_1.isAuthenticated, (0, auth_1.authorizeRoles)("student"), _1.upsertPracticumController);
exports.default = router;
