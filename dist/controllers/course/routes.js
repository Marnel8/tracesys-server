"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const auth_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
// Create new course
router.post("/course/", auth_1.isAuthenticated, _1.createCourseController);
// Get all courses with pagination and search
router.get("/course/", auth_1.isAuthenticated, _1.getCoursesController);
// Get single course by ID
router.get("/course/:id", auth_1.isAuthenticated, _1.getCourseController);
// Update course by ID
router.put("/course/:id", auth_1.isAuthenticated, _1.updateCourseController);
// Delete course by ID
router.delete("/course/:id", auth_1.isAuthenticated, _1.deleteCourseController);
exports.default = router;
