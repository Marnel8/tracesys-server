"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnnouncementStats = exports.deleteAnnouncementCommentData = exports.getAnnouncementCommentsData = exports.createAnnouncementCommentData = exports.toggleAnnouncementPin = exports.incrementAnnouncementViews = exports.hardDeleteAnnouncementData = exports.restoreAnnouncementData = exports.getArchivedAnnouncementsData = exports.deleteAnnouncementData = exports.updateAnnouncementData = exports.findAnnouncementByID = exports.getAnnouncementsData = exports.createAnnouncementData = void 0;
const sequelize_1 = require("sequelize");
const db_1 = __importDefault(require("../db/index.js"));
const announcement_1 = __importDefault(require("../db/models/announcement.js"));
const user_1 = __importDefault(require("../db/models/user.js"));
const announcement_target_1 = __importDefault(require("../db/models/announcement-target.js"));
const announcement_comment_1 = __importDefault(require("../db/models/announcement-comment.js"));
const student_enrollment_1 = __importDefault(require("../db/models/student-enrollment.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
const course_1 = __importDefault(require("../db/models/course.js"));
const department_1 = __importDefault(require("../db/models/department.js"));
const audit_log_1 = __importDefault(require("../db/models/audit-log.js"));
const error_1 = require("../utils/error.js");
const createAnnouncementData = async (data) => {
    try {
        const announcement = await announcement_1.default.create({
            title: data.title,
            content: data.content,
            priority: data.priority || "Medium",
            status: data.status || "Published",
            authorId: data.authorId,
            expiryDate: data.expiryDate,
            isPinned: data.isPinned || false,
        });
        // Create targets if provided
        // If no targets provided, create a default "all" target
        if (data.targets && data.targets.length > 0) {
            const targetPromises = data.targets
                .filter(target => target.targetType) // Filter out invalid targets
                .map(target => announcement_target_1.default.create({
                announcementId: announcement.id,
                targetType: target.targetType,
                targetId: target.targetId || null, // Ensure null instead of undefined
            }));
            await Promise.all(targetPromises);
        }
        else {
            // Default to "all" if no targets specified
            await announcement_target_1.default.create({
                announcementId: announcement.id,
                targetType: "all",
                targetId: null,
            });
        }
        // Fetch the created announcement with relations
        const createdAnnouncement = await announcement_1.default.findByPk(announcement.id, {
            include: [
                {
                    model: user_1.default,
                    as: "author",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
                {
                    model: announcement_target_1.default,
                    as: "targets",
                    attributes: ["id", "targetType", "targetId"],
                },
            ],
        });
        return {
            announcement: createdAnnouncement,
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to create announcement");
    }
};
exports.createAnnouncementData = createAnnouncementData;
const getAnnouncementsData = async (params) => {
    try {
        const { page, limit, search, status, authorId, userId } = params;
        const offset = (page - 1) * limit;
        // Build where clause
        const whereClause = {};
        // Filter by expiry date (only show non-expired announcements)
        whereClause[sequelize_1.Op.and] = [
            {
                [sequelize_1.Op.or]: [
                    { expiryDate: null },
                    { expiryDate: { [sequelize_1.Op.gt]: new Date() } },
                ],
            },
        ];
        if (search) {
            whereClause[sequelize_1.Op.and].push({
                [sequelize_1.Op.or]: [
                    { title: { [sequelize_1.Op.like]: `%${search}%` } },
                    { content: { [sequelize_1.Op.like]: `%${search}%` } },
                ],
            });
        }
        // Default to Published if status not provided
        const finalStatus = status || "Published";
        if (finalStatus !== "all") {
            whereClause[sequelize_1.Op.and].push({ status: finalStatus });
        }
        if (authorId) {
            whereClause[sequelize_1.Op.and].push({ authorId });
        }
        // Filter by userId if provided (for student-specific announcements)
        let studentContext = null;
        if (userId) {
            // Fetch student enrollment information
            const student = await user_1.default.findByPk(userId, {
                include: [
                    {
                        model: student_enrollment_1.default,
                        as: "enrollments",
                        where: { status: "enrolled" },
                        required: false,
                        include: [
                            {
                                model: section_1.default,
                                as: "section",
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
                            },
                        ],
                    },
                    {
                        model: department_1.default,
                        as: "department",
                        required: false,
                    },
                ],
            });
            if (student) {
                const enrollments = student.enrollments || [];
                const sectionIds = enrollments
                    .map((enrollment) => enrollment?.section?.id)
                    .filter(Boolean);
                const courseIds = enrollments
                    .map((enrollment) => enrollment?.section?.course?.id)
                    .filter(Boolean);
                const departmentId = student.department?.id || null;
                studentContext = {
                    sectionIds,
                    courseIds,
                    departmentId,
                };
            }
        }
        // When filtering by userId, we need to fetch matching announcements first
        // then filter by student context, then paginate
        // Fetch a reasonable amount (up to 500) to account for filtering, then paginate after
        const maxFetchLimit = userId ? Math.min(500, limit * 10) : limit; // Fetch more if filtering by userId
        const { count, rows: announcements } = await announcement_1.default.findAndCountAll({
            where: whereClause,
            limit: maxFetchLimit,
            offset: userId ? 0 : offset, // Start from beginning if filtering by userId
            order: [
                ["isPinned", "DESC"],
                ["createdAt", "DESC"],
            ],
            include: [
                {
                    model: user_1.default,
                    as: "author",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
                {
                    model: announcement_target_1.default,
                    as: "targets",
                    attributes: ["id", "targetType", "targetId"],
                },
                {
                    model: announcement_comment_1.default,
                    as: "comments",
                    attributes: ["id"],
                    required: false,
                },
            ],
        });
        // Filter announcements by student context if userId is provided
        // Note: We need to filter ALL announcements first, then paginate
        // So we fetch all matching announcements, filter them, then apply pagination
        let allFilteredAnnouncements = announcements;
        if (userId) {
            allFilteredAnnouncements = announcements.filter((announcement) => {
                const targets = announcement.targets || [];
                // If no targets, don't include (shouldn't happen, but safety check)
                if (targets.length === 0) {
                    return false;
                }
                // Check each target
                return targets.some((target) => {
                    // If target is "all", include for everyone (even if studentContext is null)
                    if (target.targetType === "all") {
                        return true;
                    }
                    // If studentContext is null (no enrollments), only show "all" targeted announcements
                    if (!studentContext) {
                        return false;
                    }
                    // If target is "section", check if student is enrolled in that section
                    if (target.targetType === "section" && target.targetId) {
                        return studentContext.sectionIds.includes(target.targetId);
                    }
                    // If target is "course", check if student is enrolled in a section with that course
                    if (target.targetType === "course" && target.targetId) {
                        return studentContext.courseIds.includes(target.targetId);
                    }
                    // Default: don't include
                    return false;
                });
            });
        }
        // Apply pagination AFTER filtering
        const totalFilteredCount = allFilteredAnnouncements.length;
        const paginatedAnnouncements = allFilteredAnnouncements.slice(offset, offset + limit);
        // Add comment count to each announcement
        const announcementsWithCommentCount = paginatedAnnouncements.map(announcement => ({
            ...announcement.toJSON(),
            commentCount: announcement.comments?.length || 0,
        }));
        // Calculate pagination based on total filtered count (before pagination)
        const totalPages = Math.ceil(totalFilteredCount / limit);
        return {
            announcements: announcementsWithCommentCount,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: totalFilteredCount,
                itemsPerPage: limit,
            },
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to retrieve announcements");
    }
};
exports.getAnnouncementsData = getAnnouncementsData;
const findAnnouncementByID = async (id) => {
    try {
        const announcement = await announcement_1.default.findByPk(id, {
            include: [
                {
                    model: user_1.default,
                    as: "author",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
                {
                    model: announcement_target_1.default,
                    as: "targets",
                    attributes: ["id", "targetType", "targetId"],
                },
                {
                    model: announcement_comment_1.default,
                    as: "comments",
                    include: [
                        {
                            model: user_1.default,
                            as: "user",
                            attributes: ["id", "firstName", "lastName", "email"],
                        },
                    ],
                    order: [["createdAt", "ASC"]],
                },
            ],
        });
        return announcement;
    }
    catch (error) {
        throw new Error(error.message || "Failed to find announcement");
    }
};
exports.findAnnouncementByID = findAnnouncementByID;
const updateAnnouncementData = async (id, updateData) => {
    try {
        const announcement = await announcement_1.default.findByPk(id);
        if (!announcement) {
            throw new Error("Announcement not found");
        }
        // Update announcement fields
        const updateFields = {};
        if (updateData.title)
            updateFields.title = updateData.title;
        if (updateData.content)
            updateFields.content = updateData.content;
        if (updateData.priority)
            updateFields.priority = updateData.priority;
        if (updateData.status)
            updateFields.status = updateData.status;
        if (updateData.expiryDate !== undefined)
            updateFields.expiryDate = updateData.expiryDate;
        if (updateData.isPinned !== undefined)
            updateFields.isPinned = updateData.isPinned;
        await announcement.update(updateFields);
        // Update targets if provided
        if (updateData.targets) {
            // Remove existing targets
            await announcement_target_1.default.destroy({
                where: { announcementId: id },
            });
            // Create new targets
            if (updateData.targets.length > 0) {
                const targetPromises = updateData.targets.map(target => announcement_target_1.default.create({
                    announcementId: id,
                    targetType: target.targetType,
                    targetId: target.targetId,
                }));
                await Promise.all(targetPromises);
            }
        }
        // Fetch updated announcement with relations
        const updatedAnnouncement = await announcement_1.default.findByPk(id, {
            include: [
                {
                    model: user_1.default,
                    as: "author",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
                {
                    model: announcement_target_1.default,
                    as: "targets",
                    attributes: ["id", "targetType", "targetId"],
                },
            ],
        });
        return updatedAnnouncement;
    }
    catch (error) {
        throw new Error(error.message || "Failed to update announcement");
    }
};
exports.updateAnnouncementData = updateAnnouncementData;
const deleteAnnouncementData = async (id) => {
    try {
        const announcement = await announcement_1.default.findByPk(id);
        if (!announcement) {
            throw new Error("Announcement not found");
        }
        // Soft delete by setting status to "Archived"
        await announcement.update({ status: "Archived" });
        return announcement;
    }
    catch (error) {
        throw new Error(error.message || "Failed to delete announcement");
    }
};
exports.deleteAnnouncementData = deleteAnnouncementData;
const getArchivedAnnouncementsData = async (params) => {
    try {
        const { page, limit, search } = params;
        const offset = (page - 1) * limit;
        const whereClause = {
            status: "Archived", // Only include archived announcements
        };
        if (search) {
            whereClause[sequelize_1.Op.or] = [
                { title: { [sequelize_1.Op.like]: `%${search}%` } },
                { content: { [sequelize_1.Op.like]: `%${search}%` } },
            ];
        }
        const { count, rows: announcements } = await announcement_1.default.findAndCountAll({
            where: whereClause,
            include: [
                {
                    model: user_1.default,
                    as: "author",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
            ],
            limit,
            offset,
            order: [["updatedAt", "DESC"]],
        });
        // Look up who deleted each announcement from the audit logs
        const announcementIds = announcements.map((a) => a.id);
        let deletedByMap = {};
        if (announcementIds.length > 0) {
            const deletionLogs = await audit_log_1.default.findAll({
                where: {
                    resource: "System",
                    action: "System Operation",
                    resourceId: { [sequelize_1.Op.in]: announcementIds },
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
                const aid = log.resourceId;
                if (!aid)
                    continue;
                if (deletedByMap[aid])
                    continue;
                const deleter = log.user;
                if (deleter) {
                    const fullName = `${deleter.firstName ?? ""} ${deleter.lastName ?? ""}`.trim();
                    deletedByMap[aid] = fullName || deleter.email || "Unknown";
                }
                else {
                    deletedByMap[aid] = "Unknown";
                }
            }
        }
        // Transform to archive format
        const items = announcements.map((announcement) => ({
            id: announcement.id,
            type: "announcement",
            name: announcement.title,
            deletedAt: announcement.updatedAt.toISOString(),
            deletedBy: deletedByMap[announcement.id] ?? null,
            meta: {
                author: announcement.author ? `${announcement.author.firstName} ${announcement.author.lastName}` : null,
                priority: announcement.priority,
            },
            raw: announcement.toJSON(),
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
        throw new Error(error.message || "Failed to retrieve archived announcements");
    }
};
exports.getArchivedAnnouncementsData = getArchivedAnnouncementsData;
const restoreAnnouncementData = async (id) => {
    const t = await db_1.default.transaction();
    try {
        const announcement = await announcement_1.default.findOne({
            where: { id, status: "Archived" },
            transaction: t,
        });
        if (!announcement) {
            await t.rollback();
            throw new error_1.NotFoundError("Archived announcement not found.");
        }
        // Restore by setting status to "Published"
        await announcement.update({ status: "Published" }, { transaction: t });
        await t.commit();
        return announcement;
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.restoreAnnouncementData = restoreAnnouncementData;
const hardDeleteAnnouncementData = async (id) => {
    const t = await db_1.default.transaction();
    try {
        const announcement = await announcement_1.default.findOne({
            where: { id, status: "Archived" },
            transaction: t,
        });
        if (!announcement) {
            await t.rollback();
            throw new error_1.NotFoundError("Archived announcement not found.");
        }
        // Delete related targets and comments first
        await announcement_target_1.default.destroy({
            where: { announcementId: id },
            transaction: t,
        });
        await announcement_comment_1.default.destroy({
            where: { announcementId: id },
            transaction: t,
        });
        // Finally, delete the announcement
        await announcement.destroy({ transaction: t });
        await t.commit();
        return { success: true };
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.hardDeleteAnnouncementData = hardDeleteAnnouncementData;
const incrementAnnouncementViews = async (id) => {
    try {
        const announcement = await announcement_1.default.findByPk(id);
        if (!announcement) {
            throw new Error("Announcement not found");
        }
        await announcement.increment("views");
        return true;
    }
    catch (error) {
        throw new Error(error.message || "Failed to increment views");
    }
};
exports.incrementAnnouncementViews = incrementAnnouncementViews;
const toggleAnnouncementPin = async (id) => {
    try {
        const announcement = await announcement_1.default.findByPk(id);
        if (!announcement) {
            throw new Error("Announcement not found");
        }
        await announcement.update({ isPinned: !announcement.isPinned });
        return announcement;
    }
    catch (error) {
        throw new Error(error.message || "Failed to toggle pin status");
    }
};
exports.toggleAnnouncementPin = toggleAnnouncementPin;
// Comment Management Functions
const createAnnouncementCommentData = async (data) => {
    try {
        // Check if announcement exists
        const announcement = await announcement_1.default.findByPk(data.announcementId);
        if (!announcement) {
            throw new Error("Announcement not found");
        }
        const comment = await announcement_comment_1.default.create(data);
        // Fetch comment with user details
        const commentWithUser = await announcement_comment_1.default.findByPk(comment.id, {
            include: [
                {
                    model: user_1.default,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
            ],
        });
        return {
            comment: commentWithUser,
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to create comment");
    }
};
exports.createAnnouncementCommentData = createAnnouncementCommentData;
const getAnnouncementCommentsData = async (params) => {
    try {
        const { announcementId, page, limit } = params;
        const offset = (page - 1) * limit;
        // Check if announcement exists
        const announcement = await announcement_1.default.findByPk(announcementId);
        if (!announcement) {
            throw new Error("Announcement not found");
        }
        const { count, rows: comments } = await announcement_comment_1.default.findAndCountAll({
            where: { announcementId },
            limit,
            offset,
            order: [["createdAt", "ASC"]],
            include: [
                {
                    model: user_1.default,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
            ],
        });
        const totalPages = Math.ceil(count / limit);
        return {
            comments,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: count,
                itemsPerPage: limit,
            },
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to retrieve comments");
    }
};
exports.getAnnouncementCommentsData = getAnnouncementCommentsData;
const deleteAnnouncementCommentData = async (id) => {
    try {
        const comment = await announcement_comment_1.default.findByPk(id);
        if (!comment) {
            throw new Error("Comment not found");
        }
        await comment.destroy();
        return true;
    }
    catch (error) {
        throw new Error(error.message || "Failed to delete comment");
    }
};
exports.deleteAnnouncementCommentData = deleteAnnouncementCommentData;
const getAnnouncementStats = async (authorId) => {
    try {
        const whereClause = {};
        if (authorId) {
            whereClause.authorId = authorId;
        }
        const totalAnnouncements = await announcement_1.default.count({
            where: whereClause,
        });
        const publishedAnnouncements = await announcement_1.default.count({
            where: { ...whereClause, status: "Published" },
        });
        const draftAnnouncements = await announcement_1.default.count({
            where: { ...whereClause, status: "Draft" },
        });
        const archivedAnnouncements = await announcement_1.default.count({
            where: { ...whereClause, status: "Archived" },
        });
        const pinnedAnnouncements = await announcement_1.default.count({
            where: { ...whereClause, isPinned: true },
        });
        const totalViews = await announcement_1.default.sum("views", {
            where: whereClause,
        }) || 0;
        return {
            totalAnnouncements,
            publishedAnnouncements,
            draftAnnouncements,
            archivedAnnouncements,
            pinnedAnnouncements,
            totalViews,
        };
    }
    catch (error) {
        throw new Error(error.message || "Failed to get announcement statistics");
    }
};
exports.getAnnouncementStats = getAnnouncementStats;
