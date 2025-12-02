"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const _1 = require("./index.js");
const image_handler_1 = require("../../utils/image-handler.js");
const auth_1 = require("../../middlewares/auth.js");
const router = (0, express_1.Router)();
// Create new student with practicum information
// Get students by teacher with pagination and search
router.post("/student/", auth_1.isAuthenticated, image_handler_1.uploadUserAvatar, _1.createStudentController);
router.get("/student/teacher/:teacherId", auth_1.isAuthenticated, _1.getStudentsByTeacherController);
// Get single student by ID
router.get("/student/:id", auth_1.isAuthenticated, _1.getStudentController);
// Get all students with pagination and search
router.get("/student/", auth_1.isAuthenticated, _1.getStudentsController);
// Update student information
router.put("/student/:id", auth_1.isAuthenticated, image_handler_1.uploadUserAvatarUpdate, _1.updateStudentController);
// Delete (deactivate) student
router.delete("/student/:id", auth_1.isAuthenticated, _1.deleteStudentController);
exports.default = router;
