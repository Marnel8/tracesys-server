"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdminData = exports.toggleUserStatusData = exports.deleteUserData = exports.getUsersData = exports.changePasswordData = exports.updateUserData = exports.login = exports.createUserData = exports.findUserByID = void 0;
const db_1 = __importDefault(require("../db/index.js"));
const user_1 = __importStar(require("../db/models/user.js"));
const department_1 = __importDefault(require("../db/models/department.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
const student_enrollment_1 = __importDefault(require("../db/models/student-enrollment.js"));
const requirement_1 = __importDefault(require("../db/models/requirement.js"));
const requirement_comment_1 = __importDefault(require("../db/models/requirement-comment.js"));
const report_1 = __importDefault(require("../db/models/report.js"));
const report_view_1 = __importDefault(require("../db/models/report-view.js"));
const attendance_record_1 = __importDefault(require("../db/models/attendance-record.js"));
const practicum_1 = __importDefault(require("../db/models/practicum.js"));
const announcement_1 = __importDefault(require("../db/models/announcement.js"));
const announcement_comment_1 = __importDefault(require("../db/models/announcement-comment.js"));
const achievement_1 = __importDefault(require("../db/models/achievement.js"));
const file_attachment_1 = __importDefault(require("../db/models/file-attachment.js"));
const agency_1 = __importDefault(require("../db/models/agency.js"));
const error_1 = require("../utils/error.js");
const cloudinary_uploader_1 = require("../utils/cloudinary-uploader.js");
const sequelize_1 = require("sequelize");
const findUserByID = async (id) => {
    const user = await user_1.default.findByPk(id);
    if (!user)
        throw new error_1.NotFoundError("User not found.");
    return user;
};
exports.findUserByID = findUserByID;
const createUserData = async (userData) => {
    const t = await db_1.default.transaction();
    // Handle avatar - ensure it's a string (Cloudinary URL or empty string)
    const avatar = userData?.avatar || "";
    try {
        // Uniqueness pre-checks to provide clear errors before attempting insert
        // Check email uniqueness
        if (userData.email) {
            const existingByEmail = await user_1.default.findOne({
                where: { email: userData.email },
                transaction: t,
            });
            if (existingByEmail) {
                await t.rollback();
                throw new error_1.ConflictError("Email already exists.");
            }
        }
        // Check studentId uniqueness if provided
        if (userData.studentId) {
            const existingByStudentId = await user_1.default.findOne({
                where: { studentId: userData.studentId },
                transaction: t,
            });
            if (existingByStudentId) {
                await t.rollback();
                throw new error_1.ConflictError("Student ID already exists.");
            }
        }
        // Check instructorId uniqueness if provided
        if (userData.instructorId) {
            const existingByInstructorId = await user_1.default.findOne({
                where: { instructorId: userData.instructorId },
                transaction: t,
            });
            if (existingByInstructorId) {
                await t.rollback();
                throw new error_1.ConflictError("Instructor ID already exists.");
            }
        }
        // Determine role: validate consistency and infer if needed
        let finalRole;
        // If role is explicitly provided, validate it
        if (userData.role) {
            finalRole = userData.role;
            // Validate role consistency with IDs
            if (userData.instructorId && finalRole !== user_1.UserRole.INSTRUCTOR) {
                await t.rollback();
                throw new error_1.BadRequestError("If instructorId is provided, role must be 'instructor'.");
            }
            if (userData.studentId && finalRole !== user_1.UserRole.STUDENT) {
                await t.rollback();
                throw new error_1.BadRequestError("If studentId is provided, role must be 'student'.");
            }
        }
        else {
            // Infer role from IDs if not explicitly provided
            if (userData.instructorId) {
                finalRole = user_1.UserRole.INSTRUCTOR;
            }
            else if (userData.studentId) {
                finalRole = user_1.UserRole.STUDENT;
            }
            else {
                // Default to USER if no role or ID provided
                finalRole = user_1.UserRole.USER;
            }
        }
        const user = await user_1.default.create({
            firstName: userData.firstName,
            lastName: userData.lastName,
            middleName: userData.middleName,
            phone: userData.phone,
            email: userData.email,
            password: userData.password,
            age: userData?.age,
            gender: userData.gender,
            avatar: avatar,
            address: userData?.address,
            bio: userData?.bio,
            studentId: userData?.studentId,
            instructorId: userData?.instructorId,
            departmentId: userData?.departmentId,
            program: userData?.program,
            specialization: userData?.specialization,
            yearLevel: userData?.yearLevel,
            role: finalRole, // Explicitly set role, don't rely on database defaults
        }, { transaction: t });
        if (!user) {
            await t.rollback();
            throw new error_1.ConflictError("Failed to create user.");
        }
        await t.commit();
        return user;
    }
    catch (error) {
        // Safely rollback only if the transaction is not already finished
        try {
            // @ts-expect-error - Sequelize Transaction has runtime 'finished' flag
            if (!t.finished) {
                await t.rollback();
            }
        }
        catch (rollbackError) {
            console.error("Rollback failed or transaction already finished during user creation:", rollbackError);
        }
        // If user creation failed and we have an avatar, clean it up from Cloudinary
        if (avatar) {
            try {
                const avatarKey = (0, cloudinary_uploader_1.extractKeyFromUrl)(avatar);
                if (avatarKey) {
                    await (0, cloudinary_uploader_1.deleteFromCloudinary)(avatarKey);
                }
            }
            catch (cleanupError) {
                console.error("Failed to cleanup avatar from Cloudinary during user creation failure:", cleanupError);
                // Don't throw here as the main error is more important
            }
        }
        // Normalize unique constraint errors into domain-specific ConflictError
        if (error?.name === "SequelizeUniqueConstraintError") {
            const fields = error.fields || {};
            const message = (() => {
                if (fields.email)
                    return "Email already exists.";
                if (fields.studentId)
                    return "Student ID already exists.";
                if (fields.instructorId)
                    return "Instructor ID already exists.";
                // Fallback by inspecting message string
                const raw = String(error.message || "").toLowerCase();
                if (raw.includes("email"))
                    return "Email already exists.";
                if (raw.includes("student"))
                    return "Student ID already exists.";
                if (raw.includes("instructor"))
                    return "Instructor ID already exists.";
                return "Duplicate value violates a unique constraint.";
            })();
            throw new error_1.ConflictError(message);
        }
        throw error;
    }
};
exports.createUserData = createUserData;
const login = async ({ email, password, }) => {
    const user = await user_1.default.findOne({
        where: {
            email,
        },
    });
    if (!user) {
        throw new error_1.NotFoundError("User not found.");
    }
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch)
        throw new error_1.BadRequestError("Invalid Credentials.");
    if (!user.isActive) {
        throw new error_1.UnauthorizedError("Your account has been deactivated. Please contact your administrator.");
    }
    return user;
};
exports.login = login;
const updateUserData = async (id, userData) => {
    const t = await db_1.default.transaction();
    const user = await user_1.default.findByPk(id);
    if (!user) {
        await t.rollback();
        throw new error_1.NotFoundError("User not found.");
    }
    // Check if email is being updated and if it already exists
    if (userData.email && userData.email !== user.email) {
        const existingUser = await user_1.default.findOne({
            where: { email: userData.email },
        });
        if (existingUser) {
            await t.rollback();
            throw new error_1.ConflictError("Email already exists.");
        }
    }
    // Check if studentId is being updated and if it already exists
    if (userData.studentId && userData.studentId !== user.studentId) {
        const existingStudent = await user_1.default.findOne({
            where: { studentId: userData.studentId },
        });
        if (existingStudent) {
            await t.rollback();
            throw new error_1.ConflictError("Student ID already exists.");
        }
    }
    // Check if instructorId is being updated and if it already exists
    if (userData.instructorId && userData.instructorId !== user.instructorId) {
        const existingInstructor = await user_1.default.findOne({
            where: { instructorId: userData.instructorId },
        });
        if (existingInstructor) {
            await t.rollback();
            throw new error_1.ConflictError("Instructor ID already exists.");
        }
    }
    // Handle avatar update - delete old avatar from Cloudinary if new one is provided
    let oldAvatarKey = null;
    if (userData.avatar !== undefined && userData.avatar !== user.avatar) {
        // Extract the public key from the old avatar URL if it exists
        if (user.avatar) {
            oldAvatarKey = (0, cloudinary_uploader_1.extractKeyFromUrl)(user.avatar);
        }
    }
    // Update user fields
    const updatedUser = await user.update({
        ...(userData.firstName && { firstName: userData.firstName }),
        ...(userData.lastName && { lastName: userData.lastName }),
        ...(userData.middleName !== undefined && {
            middleName: userData.middleName,
        }),
        ...(userData.email && { email: userData.email }),
        ...(userData.phone && { phone: userData.phone }),
        ...(userData.age !== undefined && { age: userData.age }),
        ...(userData.gender && { gender: userData.gender }),
        ...(userData.avatar !== undefined && { avatar: userData.avatar }),
        ...(userData.address !== undefined && { address: userData.address }),
        ...(userData.bio !== undefined && { bio: userData.bio }),
        ...(userData.studentId !== undefined && {
            studentId: userData.studentId,
        }),
        ...(userData.instructorId !== undefined && {
            instructorId: userData.instructorId,
        }),
        ...(userData.role && { role: userData.role }),
        ...(userData.password && { password: userData.password }),
        ...(userData.departmentId !== undefined && {
            departmentId: userData.departmentId || null,
        }),
        ...(userData.program !== undefined && {
            program: userData.program || null,
        }),
        ...(userData.specialization !== undefined && {
            specialization: userData.specialization || null,
        }),
        ...(userData.yearLevel !== undefined && {
            yearLevel: userData.yearLevel || null,
        }),
    }, { transaction: t });
    await t.commit();
    // Delete old avatar from Cloudinary after successful update
    if (oldAvatarKey) {
        try {
            await (0, cloudinary_uploader_1.deleteFromCloudinary)(oldAvatarKey);
        }
        catch (error) {
            console.error("Failed to delete old avatar from Cloudinary:", error);
            // Don't throw error here as the user update was successful
        }
    }
    return updatedUser;
};
exports.updateUserData = updateUserData;
const changePasswordData = async (userId, currentPassword, newPassword) => {
    const t = await db_1.default.transaction();
    try {
        console.log("Looking for user with ID:", userId);
        const user = await user_1.default.findByPk(userId);
        console.log("Found user:", user ? "Yes" : "No");
        if (!user) {
            await t.rollback();
            throw new error_1.NotFoundError("User not found.");
        }
        // Verify current password
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            await t.rollback();
            throw new error_1.BadRequestError("Current password is incorrect");
        }
        // Update password
        user.password = newPassword;
        await user.save({ transaction: t });
        await t.commit();
        return user;
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.changePasswordData = changePasswordData;
const getUsersData = async (filters = {}) => {
    const page = filters.page || 1;
    const limit = filters.limit || 1000;
    const offset = (page - 1) * limit;
    const where = {};
    // Filter by role
    if (filters.role && filters.role !== "all") {
        where.role = filters.role;
    }
    // Filter by status
    if (filters.status && filters.status !== "all") {
        where.isActive = filters.status === "active";
    }
    // Search filter
    if (filters.search) {
        where[sequelize_1.Op.or] = [
            { firstName: { [sequelize_1.Op.iLike]: `%${filters.search}%` } },
            { lastName: { [sequelize_1.Op.iLike]: `%${filters.search}%` } },
            { email: { [sequelize_1.Op.iLike]: `%${filters.search}%` } },
        ];
    }
    const { count, rows: users } = await user_1.default.findAndCountAll({
        where,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        include: [
            {
                model: department_1.default,
                as: "department",
                required: false,
            },
        ],
    });
    return {
        users,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
    };
};
exports.getUsersData = getUsersData;
const deleteUserData = async (userId) => {
    const t = await db_1.default.transaction();
    try {
        const user = await user_1.default.findByPk(userId, { transaction: t });
        if (!user) {
            await t.rollback();
            throw new error_1.NotFoundError("User not found.");
        }
        const userRole = user.role;
        // Delete student-related records
        if (userRole === user_1.UserRole.STUDENT) {
            // Delete student enrollments
            await student_enrollment_1.default.destroy({
                where: { studentId: userId },
                transaction: t,
            });
            // Delete requirements and their comments
            const requirementIds = await requirement_1.default.findAll({
                where: { studentId: userId },
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
                where: { studentId: userId },
                transaction: t,
            });
            // Delete reports (clear report views first to satisfy FK constraint)
            const reportIds = await report_1.default.findAll({
                where: { studentId: userId },
                attributes: ["id"],
                transaction: t,
            });
            if (reportIds.length > 0) {
                await report_view_1.default.destroy({
                    where: { reportId: { [sequelize_1.Op.in]: reportIds.map((r) => r.id) } },
                    transaction: t,
                });
            }
            await report_1.default.destroy({
                where: { studentId: userId },
                transaction: t,
            });
            // Delete attendance records
            await attendance_record_1.default.destroy({
                where: { studentId: userId },
                transaction: t,
            });
            // Delete practicums
            await practicum_1.default.destroy({
                where: { studentId: userId },
                transaction: t,
            });
            // Delete achievements where user is the student
            await achievement_1.default.destroy({
                where: { studentId: userId },
                transaction: t,
            });
        }
        // Delete instructor-related records
        if (userRole === user_1.UserRole.INSTRUCTOR) {
            // Set NULL for sections where user is instructor
            await section_1.default.update({ instructorId: null }, { where: { instructorId: userId }, transaction: t });
            // Set NULL for departments where user is head
            await department_1.default.update({ headId: null }, { where: { headId: userId }, transaction: t });
            // Set NULL for agencies where user is instructor
            await agency_1.default.update({ instructorId: null }, { where: { instructorId: userId }, transaction: t });
            // Delete announcements authored by user
            const announcementIds = await announcement_1.default.findAll({
                where: { authorId: userId },
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
                where: { authorId: userId },
                transaction: t,
            });
        }
        // Delete admin-related records (if any)
        if (userRole === user_1.UserRole.ADMIN) {
            // Set NULL for departments where admin is head
            await department_1.default.update({ headId: null }, { where: { headId: userId }, transaction: t });
        }
        // Delete records that apply to all roles
        // Delete file attachments
        await file_attachment_1.default.destroy({
            where: { uploadedBy: userId },
            transaction: t,
        });
        // Set NULL for approvedBy fields in requirements
        await requirement_1.default.update({ approvedBy: null }, { where: { approvedBy: userId }, transaction: t });
        // Set NULL for approvedBy fields in reports
        await report_1.default.update({ approvedBy: null }, { where: { approvedBy: userId }, transaction: t });
        // Set NULL for approvedBy fields in attendance records
        await attendance_record_1.default.update({ approvedBy: null }, { where: { approvedBy: userId }, transaction: t });
        // Set NULL for awardedBy fields in achievements
        await achievement_1.default.update({ awardedBy: null }, { where: { awardedBy: userId }, transaction: t });
        // Delete comments by user
        await requirement_comment_1.default.destroy({
            where: { userId: userId },
            transaction: t,
        });
        await announcement_comment_1.default.destroy({
            where: { userId: userId },
            transaction: t,
        });
        // Delete avatar from Cloudinary if exists
        if (user.avatar) {
            try {
                const avatarKey = (0, cloudinary_uploader_1.extractKeyFromUrl)(user.avatar);
                if (avatarKey) {
                    await (0, cloudinary_uploader_1.deleteFromCloudinary)(avatarKey);
                }
            }
            catch (error) {
                console.error("Failed to delete avatar from Cloudinary:", error);
                // Don't throw - continue with user deletion
            }
        }
        // Finally, delete the user account
        await user.destroy({ transaction: t });
        await t.commit();
        return { success: true };
    }
    catch (error) {
        await t.rollback();
        throw error;
    }
};
exports.deleteUserData = deleteUserData;
const toggleUserStatusData = async (userId, isActive) => {
    const user = await user_1.default.findByPk(userId);
    if (!user) {
        throw new error_1.NotFoundError("User not found.");
    }
    await user.update({ isActive });
    return user;
};
exports.toggleUserStatusData = toggleUserStatusData;
const seedAdminData = async () => {
    // Check if an active admin already exists
    const existingActiveAdmin = await user_1.default.findOne({
        where: {
            role: user_1.UserRole.ADMIN,
            isActive: true,
        },
    });
    if (existingActiveAdmin) {
        throw new error_1.ConflictError("An active admin account already exists.");
    }
    // Check if admin email already exists (might be inactive)
    const defaultEmail = "admin@tracesys.com";
    const existingAdminByEmail = await user_1.default.findOne({
        where: { email: defaultEmail },
    });
    let admin;
    const defaultPassword = "Admin@123";
    if (existingAdminByEmail) {
        // If admin exists but is inactive, reactivate and reset password
        if (existingAdminByEmail.role === user_1.UserRole.ADMIN && !existingAdminByEmail.isActive) {
            existingAdminByEmail.password = defaultPassword;
            existingAdminByEmail.isActive = true;
            existingAdminByEmail.emailVerified = true;
            await existingAdminByEmail.save();
            admin = existingAdminByEmail;
        }
        else {
            throw new error_1.ConflictError(`Email ${defaultEmail} is already in use by another account.`);
        }
    }
    else {
        // Create new default admin account
        admin = await (0, exports.createUserData)({
            firstName: "Admin",
            lastName: "User",
            email: defaultEmail,
            password: defaultPassword,
            phone: "0000000000",
            role: user_1.UserRole.ADMIN,
            gender: user_1.Gender.MALE,
            age: 30,
        });
        // Activate immediately
        await admin.update({ isActive: true, emailVerified: true });
    }
    return {
        user: admin,
        email: admin.email,
        password: defaultPassword,
    };
};
exports.seedAdminData = seedAdminData;
