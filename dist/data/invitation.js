"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInvitationByToken = exports.deleteInvitation = exports.getInvitationsByInstructor = exports.markInvitationAsUsed = exports.validateInvitationToken = exports.createBulkInvitations = exports.createInvitation = void 0;
const db_1 = __importDefault(require("../db/index.js"));
const invitation_1 = __importDefault(require("../db/models/invitation.js"));
const user_1 = __importDefault(require("../db/models/user.js"));
const student_enrollment_1 = __importDefault(require("../db/models/student-enrollment.js"));
const requirement_1 = __importDefault(require("../db/models/requirement.js"));
const report_1 = __importDefault(require("../db/models/report.js"));
const report_view_1 = __importDefault(require("../db/models/report-view.js"));
const attendance_record_1 = __importDefault(require("../db/models/attendance-record.js"));
const practicum_1 = __importDefault(require("../db/models/practicum.js"));
const announcement_1 = __importDefault(require("../db/models/announcement.js"));
const achievement_1 = __importDefault(require("../db/models/achievement.js"));
const file_attachment_1 = __importDefault(require("../db/models/file-attachment.js"));
const requirement_comment_1 = __importDefault(require("../db/models/requirement-comment.js"));
const announcement_comment_1 = __importDefault(require("../db/models/announcement-comment.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
const department_1 = __importDefault(require("../db/models/department.js"));
const error_1 = require("../utils/error.js");
const sequelize_1 = require("sequelize");
const crypto_1 = __importDefault(require("crypto"));
const createInvitation = async (params) => {
    const { email, role, departmentId, sectionId, program, createdBy, expiresInDays = 7, } = params;
    // Check if user already exists in the database
    const existingUser = await user_1.default.findOne({
        where: { email },
    });
    if (existingUser) {
        throw new error_1.ConflictError("A user with this email already exists in the system.");
    }
    // Check if invitation was already used (usedAt is not null)
    const usedInvitation = await invitation_1.default.findOne({
        where: {
            email,
            role,
            usedAt: { [sequelize_1.Op.ne]: null },
        },
    });
    if (usedInvitation) {
        throw new error_1.ConflictError("An invitation for this email has already been used.");
    }
    // Check if invitation already exists for this email and is not used
    const existingInvitation = await invitation_1.default.findOne({
        where: {
            email,
            role,
            usedAt: null,
        },
    });
    if (existingInvitation && !existingInvitation.isExpired()) {
        throw new error_1.ConflictError("An active invitation already exists for this email.");
    }
    // Generate secure random token
    const token = crypto_1.default.randomBytes(32).toString("hex");
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    const invitation = await invitation_1.default.create({
        token,
        email,
        role,
        departmentId: departmentId || null,
        sectionId: sectionId || null,
        program: program || null,
        expiresAt,
        createdBy,
    });
    return invitation;
};
exports.createInvitation = createInvitation;
const createBulkInvitations = async (params) => {
    const { emails, role, departmentId, sectionId, program, createdBy, expiresInDays = 7, } = params;
    if (!emails || emails.length === 0) {
        throw new error_1.BadRequestError("At least one email address is required.");
    }
    // Validate all emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter((email) => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
        throw new error_1.BadRequestError(`Invalid email addresses: ${invalidEmails.join(", ")}`);
    }
    const invitations = [];
    const errors = [];
    // Create invitations in a transaction
    const t = await db_1.default.transaction();
    try {
        for (const email of emails) {
            try {
                // Check if user already exists in the database
                const existingUser = await user_1.default.findOne({
                    where: { email },
                    transaction: t,
                });
                if (existingUser) {
                    errors.push(`${email}: User already exists in the system`);
                    continue;
                }
                // Check if invitation was already used (usedAt is not null)
                const usedInvitation = await invitation_1.default.findOne({
                    where: {
                        email,
                        role,
                        usedAt: { [sequelize_1.Op.ne]: null },
                    },
                    transaction: t,
                });
                if (usedInvitation) {
                    errors.push(`${email}: Invitation already used`);
                    continue;
                }
                // Check if active invitation exists
                const existingInvitation = await invitation_1.default.findOne({
                    where: {
                        email,
                        role,
                        usedAt: null,
                    },
                    transaction: t,
                });
                if (existingInvitation && !existingInvitation.isExpired()) {
                    errors.push(`${email}: Active invitation already exists`);
                    continue;
                }
                // Generate secure random token
                const token = crypto_1.default.randomBytes(32).toString("hex");
                // Calculate expiration date
                const expiresAt = new Date();
                expiresAt.setDate(expiresAt.getDate() + expiresInDays);
                const invitation = await invitation_1.default.create({
                    token,
                    email,
                    role,
                    departmentId: departmentId || null,
                    sectionId: sectionId || null,
                    program: program || null,
                    expiresAt,
                    createdBy,
                }, { transaction: t });
                invitations.push(invitation);
            }
            catch (error) {
                errors.push(`${email}: ${error.message}`);
            }
        }
        await t.commit();
        if (errors.length > 0 && invitations.length === 0) {
            throw new error_1.BadRequestError(`Failed to create invitations: ${errors.join("; ")}`);
        }
        return invitations;
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.createBulkInvitations = createBulkInvitations;
const validateInvitationToken = async (token) => {
    const invitation = await invitation_1.default.findOne({
        where: { token },
        include: ["department", "section", "creator"],
    });
    if (!invitation) {
        throw new error_1.NotFoundError("Invitation not found.");
    }
    if (invitation.isExpired()) {
        throw new error_1.BadRequestError("Invitation has expired.");
    }
    if (invitation.isUsed()) {
        throw new error_1.BadRequestError("Invitation has already been used.");
    }
    return invitation;
};
exports.validateInvitationToken = validateInvitationToken;
const markInvitationAsUsed = async (token) => {
    const invitation = await invitation_1.default.findOne({
        where: { token },
    });
    if (!invitation) {
        throw new error_1.NotFoundError("Invitation not found.");
    }
    invitation.usedAt = new Date();
    await invitation.save();
    return invitation;
};
exports.markInvitationAsUsed = markInvitationAsUsed;
const getInvitationsByInstructor = async (instructorId, options) => {
    const { status = "all", limit = 50, offset = 0, search } = options || {};
    const whereClause = {
        createdBy: instructorId,
    };
    if (search) {
        whereClause.email = {
            [sequelize_1.Op.like]: `%${search}%`,
        };
    }
    if (status !== "all") {
        if (status === "pending") {
            whereClause.usedAt = null;
            whereClause.expiresAt = {
                [sequelize_1.Op.gt]: new Date(),
            };
        }
        else if (status === "used") {
            whereClause.usedAt = {
                [sequelize_1.Op.ne]: null,
            };
        }
        else if (status === "expired") {
            whereClause.expiresAt = {
                [sequelize_1.Op.lt]: new Date(),
            };
            whereClause.usedAt = null;
        }
    }
    const { count, rows } = await invitation_1.default.findAndCountAll({
        where: whereClause,
        include: ["department", "section"],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
    });
    return {
        invitations: rows,
        total: count,
    };
};
exports.getInvitationsByInstructor = getInvitationsByInstructor;
const deleteInvitation = async (invitationId, instructorId) => {
    const t = await db_1.default.transaction();
    try {
        const invitation = await invitation_1.default.findOne({
            where: {
                id: invitationId,
                createdBy: instructorId,
            },
            transaction: t,
        });
        if (!invitation) {
            await t.rollback();
            throw new error_1.NotFoundError("Invitation not found or you don't have permission to delete it.");
        }
        // If invitation was used, delete the associated user account
        if (invitation.usedAt) {
            const user = await user_1.default.findOne({
                where: {
                    email: invitation.email,
                    role: invitation.role,
                },
                transaction: t,
            });
            if (user) {
                // Delete student-related records
                if (invitation.role === "student") {
                    // Delete student enrollments
                    await student_enrollment_1.default.destroy({
                        where: { studentId: user.id },
                        transaction: t,
                    });
                    // Delete requirements and their comments
                    const requirementIds = await requirement_1.default.findAll({
                        where: { studentId: user.id },
                        attributes: ["id"],
                        transaction: t,
                    });
                    if (requirementIds.length > 0) {
                        await requirement_comment_1.default.destroy({
                            where: {
                                requirementId: { [sequelize_1.Op.in]: requirementIds.map((r) => r.id) },
                            },
                            transaction: t,
                        });
                    }
                    await requirement_1.default.destroy({
                        where: { studentId: user.id },
                        transaction: t,
                    });
                    // Delete reports (clear report views first to satisfy FK constraint)
                    const reportIds = await report_1.default.findAll({
                        where: { studentId: user.id },
                        attributes: ["id"],
                        transaction: t,
                    });
                    if (reportIds.length > 0) {
                        await report_view_1.default.destroy({
                            where: { reportId: { [sequelize_1.Op.in]: reportIds.map((r) => r.id) } },
                            transaction: t,
                        });
                    }
                    // Delete reports
                    await report_1.default.destroy({
                        where: { studentId: user.id },
                        transaction: t,
                    });
                    // Delete attendance records
                    await attendance_record_1.default.destroy({
                        where: { studentId: user.id },
                        transaction: t,
                    });
                    // Delete practicums
                    await practicum_1.default.destroy({
                        where: { studentId: user.id },
                        transaction: t,
                    });
                    // Delete achievements where user is the student
                    await achievement_1.default.destroy({
                        where: { studentId: user.id },
                        transaction: t,
                    });
                }
                // Delete instructor-related records
                if (invitation.role === "instructor") {
                    // Set NULL for sections where user is instructor
                    await section_1.default.update({ instructorId: null }, { where: { instructorId: user.id }, transaction: t });
                    // Set NULL for departments where user is head
                    await department_1.default.update({ headId: null }, { where: { headId: user.id }, transaction: t });
                    // Delete announcements authored by user
                    const announcementIds = await announcement_1.default.findAll({
                        where: { authorId: user.id },
                        attributes: ["id"],
                        transaction: t,
                    });
                    if (announcementIds.length > 0) {
                        await announcement_comment_1.default.destroy({
                            where: {
                                announcementId: { [sequelize_1.Op.in]: announcementIds.map((a) => a.id) },
                            },
                            transaction: t,
                        });
                    }
                    await announcement_1.default.destroy({
                        where: { authorId: user.id },
                        transaction: t,
                    });
                }
                // Delete records that apply to both roles
                // Delete file attachments
                await file_attachment_1.default.destroy({
                    where: { uploadedBy: user.id },
                    transaction: t,
                });
                // Set NULL for approvedBy fields in requirements
                await requirement_1.default.update({ approvedBy: null }, { where: { approvedBy: user.id }, transaction: t });
                // Set NULL for approvedBy fields in reports
                await report_1.default.update({ approvedBy: null }, { where: { approvedBy: user.id }, transaction: t });
                // Set NULL for approvedBy fields in attendance records
                await attendance_record_1.default.update({ approvedBy: null }, { where: { approvedBy: user.id }, transaction: t });
                // Set NULL for awardedBy fields in achievements
                await achievement_1.default.update({ awardedBy: null }, { where: { awardedBy: user.id }, transaction: t });
                // Delete comments by user
                await requirement_comment_1.default.destroy({
                    where: { userId: user.id },
                    transaction: t,
                });
                await announcement_comment_1.default.destroy({
                    where: { userId: user.id },
                    transaction: t,
                });
                // Delete the user account
                await user.destroy({ transaction: t });
            }
        }
        // Delete the invitation
        await invitation.destroy({ transaction: t });
        await t.commit();
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.deleteInvitation = deleteInvitation;
const getInvitationByToken = async (token) => {
    return await invitation_1.default.findOne({
        where: { token },
        include: ["department", "section", "creator"],
    });
};
exports.getInvitationByToken = getInvitationByToken;
