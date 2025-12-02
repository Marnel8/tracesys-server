"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const auth_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
// Create new department
router.post("/department/", auth_1.isAuthenticated, _1.createDepartmentController);
// Get all departments with pagination and search
router.get("/department/", _1.getDepartmentsController);
// Get single department by ID
router.get("/department/:id", auth_1.isAuthenticated, _1.getDepartmentController);
// Update department by ID
router.put("/department/:id", auth_1.isAuthenticated, _1.updateDepartmentController);
// Delete department by ID
router.delete("/department/:id", auth_1.isAuthenticated, _1.deleteDepartmentController);
exports.default = router;
