"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCourseController = exports.updateCourseController = exports.getCourseController = exports.getCoursesController = exports.createCourseController = void 0;
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const course_1 = require("../../data/course.js");
const createCourseController = async (req, res) => {
    const { name, code, description, departmentId, isActive = true, } = req.body;
    if (!name || !code || !departmentId) {
        throw new error_1.BadRequestError("Please provide course name, code, and department.");
    }
    const courseData = {
        name,
        code,
        description,
        departmentId,
        isActive,
    };
    const result = await (0, course_1.createCourseData)(courseData);
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Course created successfully",
        data: result,
    });
};
exports.createCourseController = createCourseController;
const getCoursesController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all", departmentId } = req.query;
    const result = await (0, course_1.getCoursesData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
        status: status,
        departmentId: departmentId,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Courses retrieved successfully",
        data: result,
    });
};
exports.getCoursesController = getCoursesController;
const getCourseController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Course ID is required");
    }
    const course = await (0, course_1.findCourseByID)(id);
    if (!course) {
        throw new error_1.NotFoundError("Course not found");
    }
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Course retrieved successfully",
        data: course,
    });
};
exports.getCourseController = getCourseController;
const updateCourseController = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) {
        throw new error_1.BadRequestError("Course ID is required");
    }
    const course = await (0, course_1.findCourseByID)(id);
    if (!course) {
        throw new error_1.NotFoundError("Course not found");
    }
    const result = await (0, course_1.updateCourseData)(id, updateData);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Course updated successfully",
        data: result,
    });
};
exports.updateCourseController = updateCourseController;
const deleteCourseController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Course ID is required");
    }
    const course = await (0, course_1.findCourseByID)(id);
    if (!course) {
        throw new error_1.NotFoundError("Course not found");
    }
    await (0, course_1.deleteCourseData)(id);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Course deleted successfully",
    });
};
exports.deleteCourseController = deleteCourseController;
