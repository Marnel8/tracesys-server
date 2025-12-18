"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSectionData = exports.updateSectionData = exports.findSectionByID = exports.getSectionsData = exports.createSectionData = void 0;
const sequelize_1 = require("sequelize");
const section_1 = __importDefault(require("../db/models/section.js"));
const course_1 = __importDefault(require("../db/models/course.js"));
const department_1 = __importDefault(require("../db/models/department.js"));
const createSectionData = async (data) => {
    try {
        // Check if section with same name or code already exists for the same course
        const orConditions = [{ name: data.name }];
        if (data.code) {
            orConditions.push({ code: data.code });
        }
        const existingSection = await section_1.default.findOne({
            where: {
                [sequelize_1.Op.or]: orConditions,
                courseId: data.courseId,
            },
        });
        if (existingSection) {
            throw new Error("Section with this name or code already exists for this course");
        }
        const section = await section_1.default.create(data);
        return {
            section,
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to create section");
    }
};
exports.createSectionData = createSectionData;
const getSectionsData = async (params) => {
    try {
        const { page, limit, search, status, courseId, year, semester } = params;
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
        if (courseId) {
            whereClause.courseId = courseId;
        }
        if (year) {
            whereClause.year = year;
        }
        if (semester) {
            whereClause.semester = semester;
        }
        const { count, rows: sections } = await section_1.default.findAndCountAll({
            where: whereClause,
            limit,
            offset,
            order: [["createdAt", "DESC"]],
            include: [
                {
                    model: course_1.default,
                    as: "course",
                    required: true,
                    include: [
                        {
                            model: department_1.default,
                            as: "department",
                            required: true,
                        },
                    ],
                },
            ],
        });
        const totalPages = Math.ceil(count / limit);
        return {
            sections,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit,
            },
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to retrieve sections");
    }
};
exports.getSectionsData = getSectionsData;
const findSectionByID = async (id) => {
    try {
        const section = await section_1.default.findByPk(id, {
            include: [
                {
                    model: course_1.default,
                    as: "course",
                    required: true,
                    include: [
                        {
                            model: department_1.default,
                            as: "department",
                            required: true,
                        },
                    ],
                },
            ],
        });
        return section;
    }
    catch (error) {
        throw new Error(error.message || "Failed to find section");
    }
};
exports.findSectionByID = findSectionByID;
const updateSectionData = async (id, updateData) => {
    try {
        const section = await section_1.default.findByPk(id);
        if (!section) {
            throw new Error("Section not found");
        }
        // Check if name or code is being updated and if it conflicts with existing section
        if (updateData.name || updateData.code) {
            const whereClause = {
                id: { [sequelize_1.Op.ne]: id },
                courseId: updateData.courseId || section.courseId,
            };
            if (updateData.name) {
                whereClause.name = updateData.name;
            }
            if (updateData.code) {
                whereClause.code = updateData.code;
            }
            const existingSection = await section_1.default.findOne({
                where: whereClause,
            });
            if (existingSection) {
                throw new Error("Section with this name or code already exists for this course");
            }
        }
        await section.update(updateData);
        return section;
    }
    catch (error) {
        throw new Error(error.message || "Failed to update section");
    }
};
exports.updateSectionData = updateSectionData;
const deleteSectionData = async (id) => {
    try {
        const section = await section_1.default.findByPk(id);
        if (!section) {
            throw new Error("Section not found");
        }
        // Check if section has enrolled students
        // Note: This would need to be implemented based on your student enrollment model
        // const enrolledStudents = await StudentEnrollment.count({
        // 	where: {
        // 		sectionId: id,
        // 	},
        // });
        // if (enrolledStudents > 0) {
        // 	throw new Error("Cannot delete section with enrolled students");
        // }
        await section.destroy();
        return true;
    }
    catch (error) {
        throw new Error(error.message || "Failed to delete section");
    }
};
exports.deleteSectionData = deleteSectionData;
