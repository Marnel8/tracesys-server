"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDeleteCourseData = exports.restoreCourseData = exports.getArchivedCoursesData = exports.deleteCourseData = exports.updateCourseData = exports.findCourseByID = exports.getCoursesData = exports.createCourseData = void 0;
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db/index.js"));
const course_1 = __importDefault(require("../db/models/course.js"));
const department_1 = __importDefault(require("../db/models/department.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
const user_1 = __importDefault(require("../db/models/user.js"));
const audit_log_1 = __importDefault(require("../db/models/audit-log.js"));
const error_1 = require("../utils/error.js");
const createCourseData = async (data) => {
    try {
        // Check if course with same name or code already exists
        const existingCourse = await course_1.default.findOne({
            where: {
                [sequelize_1.Op.or]: [
                    { name: data.name },
                    { code: data.code }
                ]
            },
        });
        if (existingCourse) {
            throw new Error("Course with this name or code already exists");
        }
        const course = await course_1.default.create(data);
        return {
            course,
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to create course");
    }
};
exports.createCourseData = createCourseData;
const getCoursesData = async (params) => {
    try {
        const { page, limit, search, status, departmentId } = params;
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
        if (departmentId) {
            whereClause.departmentId = departmentId;
        }
        const { count, rows: courses } = await course_1.default.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: department_1.default,
                    as: "department",
                    required: true,
                },
                {
                    model: section_1.default,
                    as: "sections",
                    where: { isActive: true },
                    required: false,
                },
            ],
        });
        const totalPages = Math.ceil(count / limit);
        return {
            courses,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit,
            },
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to retrieve courses");
    }
};
exports.getCoursesData = getCoursesData;
const findCourseByID = async (id) => {
    try {
        const course = await course_1.default.findByPk(id, {
            include: [
                {
                    model: department_1.default,
                    as: "department",
                    required: true,
                },
                {
                    model: section_1.default,
                    as: "sections",
                    where: { isActive: true },
                    required: false,
                },
            ],
        });
        return course;
    }
    catch (error) {
        throw new Error(error.message || "Failed to find course");
    }
};
exports.findCourseByID = findCourseByID;
const updateCourseData = async (id, updateData) => {
    try {
        const course = await course_1.default.findByPk(id);
        if (!course) {
            throw new Error("Course not found");
        }
        // Check if name or code is being updated and if it conflicts with existing course
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
            const existingCourse = await course_1.default.findOne({
                where: whereClause,
            });
            if (existingCourse) {
                throw new Error("Course with this name or code already exists");
            }
        }
        await course.update(updateData);
        return course;
    }
    catch (error) {
        throw new Error(error.message || "Failed to update course");
    }
};
exports.updateCourseData = updateCourseData;
const deleteCourseData = async (id) => {
    try {
        const course = await course_1.default.findByPk(id);
        if (!course) {
            throw new Error("Course not found");
        }
        // Check if course has active sections
        const activeSections = await section_1.default.count({
            where: {
                courseId: id,
                isActive: true,
            },
        });
        if (activeSections > 0) {
            throw new Error("Cannot delete course with active sections");
        }
        // Soft delete by setting isActive to false
        await course.update({ isActive: false });
        return course;
    }
    catch (error) {
        throw new Error(error.message || "Failed to delete course");
    }
};
exports.deleteCourseData = deleteCourseData;
const getArchivedCoursesData = async (params) => {
    try {
        const { page, limit, search } = params;
        const offset = (page - 1) * limit;
        const whereClause = {
            isActive: false, // Only include archived (inactive) courses
        };
        if (search) {
            whereClause[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${search}%` } },
                { code: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        const { count, rows: courses } = await course_1.default.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: department_1.default,
                    as: "department",
                },
            ],
            limit,
            offset,
            order: [["updatedAt", "DESC"]],
        });
        // Look up who deleted each course from the audit logs
        const courseIds = courses.map((c) => c.id);
        let deletedByMap = {};
        if (courseIds.length > 0) {
            const deletionLogs = await audit_log_1.default.findAll({
                where: {
                    resource: "System",
                    action: "System Operation",
                    resourceId: { [sequelize_1.Op.in]: courseIds },
                },
                include: [
                    {
                        model: user_1.default,
                        as: "user",
                        attributes: ["id", "firstName", "lastName", "email"],
                    },
                ],
                order: [["createdAt", "DESC"]],
            });
            for (const log of deletionLogs) {
                const cid = log.resourceId;
                if (!cid)
                    continue;
                if (deletedByMap[cid])
                    continue;
                const deleter = log.user;
                if (deleter) {
                    const fullName = `${deleter.firstName ?? ""} ${deleter.lastName ?? ""}`.trim();
                    deletedByMap[cid] = fullName || deleter.email || "Unknown";
                }
                else {
                    deletedByMap[cid] = "Unknown";
                }
            }
        }
        // Transform to archive format
        const items = courses.map((course) => ({
            id: course.id,
            type: "course",
            name: course.name,
            deletedAt: course.updatedAt.toISOString(),
            deletedBy: deletedByMap[course.id] ?? null,
            meta: {
                code: course.code,
                department: course.department?.name,
            },
            raw: course.toJSON(),
        }));
        return {
            items,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                totalItems: count,
                itemsPerPage: limit,
            },
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to retrieve archived courses");
    }
};
exports.getArchivedCoursesData = getArchivedCoursesData;
const restoreCourseData = async (id) => {
    const t = await db_1.default.transaction();
    try {
        const course = await course_1.default.findOne({
            where: { id, isActive: false },
            transaction: t,
        });
        if (!course) {
            await t.rollback();
            throw new error_1.NotFoundError("Archived course not found.");
        }
        // Restore by setting isActive to true
        await course.update({ isActive: true }, { transaction: t });
        await t.commit();
        return course;
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.restoreCourseData = restoreCourseData;
const hardDeleteCourseData = async (id) => {
    const t = await db_1.default.transaction();
    try {
        const course = await course_1.default.findOne({
            where: { id, isActive: false },
            transaction: t,
        });
        if (!course) {
            await t.rollback();
            throw new error_1.NotFoundError("Archived course not found.");
        }
        // Check if course has any sections
        const sectionCount = await section_1.default.count({
            where: { courseId: id },
            transaction: t,
        });
        if (sectionCount > 0) {
            await t.rollback();
            throw new Error("Cannot permanently delete course with associated sections");
        }
        // Finally, delete the course
        await course.destroy({ transaction: t });
        await t.commit();
        return { success: true };
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.hardDeleteCourseData = hardDeleteCourseData;
