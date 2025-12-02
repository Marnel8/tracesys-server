"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartmentController = exports.updateDepartmentController = exports.getDepartmentController = exports.getDepartmentsController = exports.createDepartmentController = void 0;
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const department_1 = require("../../data/department.js");
const createDepartmentController = async (req, res) => {
    const { name, code, description, isActive = true, } = req.body;
    if (!name || !code) {
        throw new error_1.BadRequestError("Please provide department name and code.");
    }
    const departmentData = {
        name,
        code,
        description,
        isActive,
    };
    const result = await (0, department_1.createDepartmentData)(departmentData);
    res.status(http_status_codes_1.StatusCodes.CREATED).json({
        success: true,
        message: "Department created successfully",
        data: result,
    });
};
exports.createDepartmentController = createDepartmentController;
const getDepartmentsController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all" } = req.query;
    const result = await (0, department_1.getDepartmentsData)({
        page: Number(page),
        limit: Number(limit),
        search: search,
        status: status,
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Departments retrieved successfully",
        data: result,
    });
};
exports.getDepartmentsController = getDepartmentsController;
const getDepartmentController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Department ID is required");
    }
    const department = await (0, department_1.findDepartmentByID)(id);
    if (!department) {
        throw new error_1.NotFoundError("Department not found");
    }
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Department retrieved successfully",
        data: department,
    });
};
exports.getDepartmentController = getDepartmentController;
const updateDepartmentController = async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) {
        throw new error_1.BadRequestError("Department ID is required");
    }
    const department = await (0, department_1.findDepartmentByID)(id);
    if (!department) {
        throw new error_1.NotFoundError("Department not found");
    }
    const result = await (0, department_1.updateDepartmentData)(id, updateData);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Department updated successfully",
        data: result,
    });
};
exports.updateDepartmentController = updateDepartmentController;
const deleteDepartmentController = async (req, res) => {
    const { id } = req.params;
    if (!id) {
        throw new error_1.BadRequestError("Department ID is required");
    }
    const department = await (0, department_1.findDepartmentByID)(id);
    if (!department) {
        throw new error_1.NotFoundError("Department not found");
    }
    await (0, department_1.deleteDepartmentData)(id);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Department deleted successfully",
    });
};
exports.deleteDepartmentController = deleteDepartmentController;
