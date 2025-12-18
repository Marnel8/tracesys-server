"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const auth_1 = require("../../middlewares/auth.js");
const audit_1 = require("../../middlewares/audit.js");
const router = (0, express_1.Router)();
// Create new course
router.post("/course/", auth_1.isAuthenticated, _1.createCourseController);
// Get all courses with pagination and search (public - needed for signup forms)
router.get("/course/", _1.getCoursesController);
// Archive endpoints (must come before /course/:id to avoid route conflicts)
router.get("/course/archives", auth_1.isAuthenticated, _1.getArchivedCoursesController);
router.post("/course/:id/restore", auth_1.isAuthenticated, _1.restoreCourseController);
router.delete("/course/:id/hard-delete", auth_1.isAuthenticated, _1.hardDeleteCourseController);
// Get single course by ID
router.get("/course/:id", auth_1.isAuthenticated, _1.getCourseController);
// Update course by ID
router.put("/course/:id", auth_1.isAuthenticated, _1.updateCourseController);
// Delete course by ID
router.delete("/course/:id", auth_1.isAuthenticated, audit_1.auditMiddlewares.systemOperation, _1.deleteCourseController);
exports.default = router;
