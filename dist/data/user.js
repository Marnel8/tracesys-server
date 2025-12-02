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
exports.changePasswordData = exports.updateUserData = exports.login = exports.createUserData = exports.findUserByID = void 0;
const db_1 = __importDefault(require("../db/index.js"));
const user_1 = __importStar(require("../db/models/user.js"));
const error_1 = require("../utils/error.js");
const cloudinary_uploader_1 = require("../utils/cloudinary-uploader.js");
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
