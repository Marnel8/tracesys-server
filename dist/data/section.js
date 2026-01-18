"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hardDeleteSectionData = exports.restoreSectionData = exports.getArchivedSectionsData = exports.deleteSectionData = exports.updateSectionData = exports.findSectionByID = exports.getSectionsData = exports.createSectionData = void 0;
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db/index.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
const course_1 = __importDefault(require("../db/models/course.js"));
const department_1 = __importDefault(require("../db/models/department.js"));
const student_enrollment_1 = __importDefault(require("../db/models/student-enrollment.js"));
const user_1 = __importDefault(require("../db/models/user.js"));
const audit_log_1 = __importDefault(require("../db/models/audit-log.js"));
const error_1 = require("../utils/error.js");
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
        const { page, limit, search, status, courseId, year, semester, instructorId } = params;
        const offset = (page - 1) * limit;
        // Build where clause
        const whereClause = {};
        // Only filter by instructorId if provided (admins can view all sections)
        if (instructorId) {
            whereClause.instructorId = instructorId;
        }
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
        // Soft delete by setting isActive to false
        await section.update({ isActive: false });
        return section;
    }
    catch (error) {
        throw new Error(error.message || "Failed to delete section");
    }
};
exports.deleteSectionData = deleteSectionData;
const getArchivedSectionsData = async (params) => {
    try {
        const { page, limit, search, instructorId } = params;
        const offset = (page - 1) * limit;
        const whereClause = {
            isActive: false, // Only include archived (inactive) sections
        };
        if (instructorId) {
            whereClause.instructorId = instructorId;
        }
        if (search) {
            whereClause[sequelize_1.Op.or] = [
                { name: { [sequelize_1.Op.like]: `%${search}%` } },
                { code: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        const { count, rows: sections } = await section_1.default.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: course_1.default,
                    as: "course",
                    include: [
                        {
                            model: department_1.default,
                            as: "department",
                        },
                    ],
                },
            ],
            limit,
            offset,
            order: [["updatedAt", "DESC"]],
        });
        // Look up who deleted each section from the audit logs
        const sectionIds = sections.map((s) => s.id);
        let deletedByMap = {};
        if (sectionIds.length > 0) {
            const deletionLogs = await audit_log_1.default.findAll({
                where: {
                    resource: "System",
                    action: "System Operation",
                    resourceId: { [sequelize_1.Op.in]: sectionIds },
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
                const sid = log.resourceId;
                if (!sid)
                    continue;
                if (deletedByMap[sid])
                    continue;
                const deleter = log.user;
                if (deleter) {
                    const fullName = `${deleter.firstName ?? ""} ${deleter.lastName ?? ""}`.trim();
                    deletedByMap[sid] = fullName || deleter.email || "Unknown";
                }
                else {
                    deletedByMap[sid] = "Unknown";
                }
            }
        }
        // Transform to archive format
        const items = sections.map((section) => ({
            id: section.id,
            type: "section",
            name: section.name,
            deletedAt: section.updatedAt.toISOString(),
            deletedBy: deletedByMap[section.id] ?? null,
            meta: {
                code: section.code,
                course: section.course?.name,
                courseCode: section.course?.code,
                academicYear: section.academicYear,
            },
            raw: section.toJSON(),
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
        throw new Error(error.message || "Failed to retrieve archived sections");
    }
};
exports.getArchivedSectionsData = getArchivedSectionsData;
const restoreSectionData = async (id) => {
    const t = await db_1.default.transaction();
    try {
        const section = await section_1.default.findOne({
            where: { id, isActive: false },
            transaction: t,
        });
        if (!section) {
            await t.rollback();
            throw new error_1.NotFoundError("Archived section not found.");
        }
        // Restore by setting isActive to true
        await section.update({ isActive: true }, { transaction: t });
        await t.commit();
        return section;
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.restoreSectionData = restoreSectionData;
const hardDeleteSectionData = async (id) => {
    const t = await db_1.default.transaction();
    try {
        const section = await section_1.default.findOne({
            where: { id, isActive: false },
            transaction: t,
        });
        if (!section) {
            await t.rollback();
            throw new error_1.NotFoundError("Archived section not found.");
        }
        // Check if section has enrolled students
        const enrolledStudents = await student_enrollment_1.default.count({
            where: { sectionId: id },
            transaction: t,
        });
        if (enrolledStudents > 0) {
            await t.rollback();
            throw new Error("Cannot permanently delete section with enrolled students");
        }
        // Finally, delete the section
        await section.destroy({ transaction: t });
        await t.commit();
        return { success: true };
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.hardDeleteSectionData = hardDeleteSectionData;
