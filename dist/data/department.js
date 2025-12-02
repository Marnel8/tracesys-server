"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDepartmentData = exports.updateDepartmentData = exports.findDepartmentByID = exports.getDepartmentsData = exports.createDepartmentData = void 0;
const sequelize_1 = require("sequelize");
const department_1 = __importDefault(require("../db/models/department.js"));
const course_1 = __importDefault(require("../db/models/course.js"));
const createDepartmentData = async (data) => {
    try {
        // Check if department with same name or code already exists
        const existingDepartment = await department_1.default.findOne({
            where: {
                [sequelize_1.Op.or]: [
                    { name: data.name },
                    { code: data.code }
                ]
            },
        });
        if (existingDepartment) {
            throw new Error("Department with this name or code already exists");
        }
        const department = await department_1.default.create(data);
        return {
            department,
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to create department");
    }
};
exports.createDepartmentData = createDepartmentData;
const getDepartmentsData = async (params) => {
    try {
        const { page, limit, search, status } = params;
        const offset = (page - 1) * limit;
        // Build where clause
        const whereClause = {};
        if (search) {
            whereClause[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${search}%` } },
                { code: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        if (status && status !== "all") {
            whereClause.isActive = status === "active";
        }
        const { count, rows: departments } = await department_1.default.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: course_1.default,
                    as: "courses",
                    where: { isActive: true },
                    required: false,
                },
            ],
        });
        const totalPages = Math.ceil(count / limit);
        console.log(departments);
        return {
            departments,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit,
            },
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to retrieve departments");
    }
};
exports.getDepartmentsData = getDepartmentsData;
const findDepartmentByID = async (id) => {
    try {
        const department = await department_1.default.findByPk(id, {
            include: [
                {
                    model: course_1.default,
                    as: "courses",
                    where: { isActive: true },
                    required: false,
                },
            ],
        });
        return department;
    }
    catch (error) {
        throw new Error(error.message || "Failed to find department");
    }
};
exports.findDepartmentByID = findDepartmentByID;
const updateDepartmentData = async (id, updateData) => {
    try {
        const department = await department_1.default.findByPk(id);
        if (!department) {
            throw new Error("Department not found");
        }
        // Check if name or code is being updated and if it conflicts with existing department
        if (updateData.name || updateData.code) {
            const whereClause = {
                id: { [sequelize_1.Op.ne]: id },
            };
            if (updateData.name) {
                whereClause.name = updateData.name;
            }
            if (updateData.code) {
                whereClause.code = updateData.code;
            }
            const existingDepartment = await department_1.default.findOne({
                where: whereClause,
            });
            if (existingDepartment) {
                throw new Error("Department with this name or code already exists");
            }
        }
        await department.update(updateData);
        return department;
    }
    catch (error) {
        throw new Error(error.message || "Failed to update department");
    }
};
exports.updateDepartmentData = updateDepartmentData;
const deleteDepartmentData = async (id) => {
    try {
        const department = await department_1.default.findByPk(id);
        if (!department) {
            throw new Error("Department not found");
        }
        // Check if department has active courses
        const activeCourses = await course_1.default.count({
            where: {
                departmentId: id,
                isActive: true,
            },
        });
        if (activeCourses > 0) {
            throw new Error("Cannot delete department with active courses");
        }
        await department.destroy();
        return true;
    }
    catch (error) {
        throw new Error(error.message || "Failed to delete department");
    }
};
exports.deleteDepartmentData = deleteDepartmentData;
