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
exports.updateAllowLoginWithoutRequirementsController = exports.changePasswordController = exports.editUserController = exports.logoutController = exports.refreshTokenController = exports.getUserDetailsController = exports.resetPasswordController = exports.forgotPasswordController = exports.loginController = exports.activateUserController = exports.registerUserController = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const send_mail_1 = __importDefault(require("../../utils/send-mail.js"));
const user_1 = require("../../services/user.js");
const user_2 = __importStar(require("../../db/models/user.js"));
const http_status_codes_1 = require("http-status-codes");
const error_1 = require("../../utils/error.js");
const user_3 = require("../../data/user.js");
const student_enrollment_1 = __importDefault(require("../../db/models/student-enrollment.js"));
const section_1 = __importDefault(require("../../db/models/section.js"));
const requirement_1 = __importDefault(require("../../db/models/requirement.js"));
const sequelize_1 = require("sequelize");
const jwt_1 = require("../../utils/jwt.js");
// Simple in-memory reset store (email -> { code, expiresAt })
const passwordResetStore = new Map();
const registerUserController = async (req, res) => {
    const { firstName, lastName, email, password, role, gender, age, phone, middleName, address, bio, studentId, instructorId, departmentId, } = req.body;
    if (!firstName || !lastName || !email || !password) {
        throw new error_1.BadRequestError("Please provide all necessary data.");
    }
    // Validate and convert role
    let validatedRole;
    if (role) {
        // Convert string role to UserRole enum if needed
        const roleString = typeof role === "string" ? role.toLowerCase() : role;
        const validRoles = Object.values(user_2.UserRole);
        if (!validRoles.includes(roleString)) {
            throw new error_1.BadRequestError(`Invalid role. Must be one of: ${validRoles.join(", ")}`);
        }
        validatedRole = roleString;
    }
    // Validate role consistency with IDs
    if (instructorId && validatedRole && validatedRole !== user_2.UserRole.INSTRUCTOR) {
        throw new error_1.BadRequestError("If instructorId is provided, role must be 'instructor'.");
    }
    if (studentId && validatedRole && validatedRole !== user_2.UserRole.STUDENT) {
        throw new error_1.BadRequestError("If studentId is provided, role must be 'student'.");
    }
    // Infer role from IDs if not explicitly provided
    if (!validatedRole) {
        if (instructorId) {
            validatedRole = user_2.UserRole.INSTRUCTOR;
        }
        else if (studentId) {
            validatedRole = user_2.UserRole.STUDENT;
        }
    }
    // Handle avatar upload if provided - use Cloudinary URL if available
    const avatar = req.cloudUrls && req.cloudUrls.length > 0 ? req.cloudUrls[0] : "";
    const user = {
        firstName,
        lastName,
        email,
        password,
        age,
        role: validatedRole,
        gender,
        phone,
        middleName,
        address,
        bio,
        studentId,
        instructorId,
        departmentId,
        avatar,
    };
    const activationToken = (0, user_1.createActivationToken)(user);
    const activationCode = activationToken.activationCode;
    const data = { user, activationCode };
    const projectRoot = process.cwd();
    const candidateAssetDirs = [
        path_1.default.join(projectRoot, "assets"),
        path_1.default.join(projectRoot, "src", "assets"),
        path_1.default.join(projectRoot, "dist", "assets"),
    ];
    const assetsDir = candidateAssetDirs.find((p) => fs_1.default.existsSync(p)) || candidateAssetDirs[0];
    await (0, send_mail_1.default)({
        email: user.email,
        subject: "Activate your account",
        template: "activation-mail.ejs",
        data,
        attachments: [
            {
                filename: "logo.png",
                path: path_1.default.join(assetsDir, "logo.png"),
                cid: "logo",
            },
        ],
    });
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: `Please check your email: ${user.email} to activate your account`,
        activationToken: activationToken.token,
    });
};
exports.registerUserController = registerUserController;
const activateUserController = async (req, res) => {
    const { activation_token, activation_code } = req.body;
    const newUser = jsonwebtoken_1.default.verify(activation_token, process.env.ACTIVATION_SECRET);
    if (newUser.activationCode !== activation_code) {
        throw new error_1.BadRequestError("Activation code did not match.");
    }
    const { firstName, lastName, middleName, phone, email, age, password, gender, avatar, role, address, bio, studentId, instructorId, departmentId, } = newUser.user;
    const user = await (0, user_3.createUserData)({
        firstName,
        lastName,
        phone,
        middleName,
        email,
        password,
        age,
        gender,
        avatar,
        role,
        address,
        bio,
        studentId,
        instructorId,
        departmentId,
    });
    res.status(http_status_codes_1.StatusCodes.CREATED).json(user);
};
exports.activateUserController = activateUserController;
/**
 * Helper function to check if student can login based on requirements.
 *
 * This function:
 * 1. Checks if any of the student's instructors have enabled the bypass setting
 * 2. If no instructor allows bypass, verifies the student has at least one submitted/approved requirement
 * 3. Throws UnauthorizedError if requirements are not met
 *
 * @param studentId - The ID of the student to check
 * @throws {UnauthorizedError} If student cannot login due to missing requirements
 */
const checkStudentLoginRequirements = async (studentId) => {
    // Get student's enrollments to find their sections and instructors
    const enrollments = await student_enrollment_1.default.findAll({
        where: { studentId },
        include: [
            {
                model: section_1.default,
                as: "section",
                required: false, // Left join to handle students without sections
                include: [
                    {
                        model: user_2.default,
                        as: "instructor",
                        attributes: ["id", "allowLoginWithoutRequirements"],
                        required: false, // Left join to handle sections without instructors
                    },
                ],
            },
        ],
    });
    // Check if any instructor allows login without requirements
    // Also handle case where student has no enrollments
    const hasInstructorAllowingLogin = enrollments.length > 0 &&
        enrollments.some((enrollment) => enrollment.section?.instructor?.allowLoginWithoutRequirements === true);
    // If no instructor allows it, check if student has submitted requirements
    if (!hasInstructorAllowingLogin) {
        const submittedRequirements = await requirement_1.default.count({
            where: {
                studentId,
                status: {
                    [sequelize_1.Op.in]: ["submitted", "approved"],
                },
            },
        });
        if (submittedRequirements === 0) {
            throw new error_1.UnauthorizedError("You must submit at least one requirement before you can login. Please contact your instructor for assistance.");
        }
    }
};
const loginController = async (req, res) => {
    const { email, password } = req.body;
    const userResult = await (0, user_3.login)({ email, password });
    // Check requirement login restriction for students (defense in depth)
    if (userResult.role === user_2.UserRole.STUDENT) {
        await checkStudentLoginRequirements(userResult.id);
    }
    (0, jwt_1.sendToken)(userResult, http_status_codes_1.StatusCodes.OK, res);
};
exports.loginController = loginController;
const forgotPasswordController = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        throw new error_1.BadRequestError("Email is required");
    }
    const user = await user_2.default.findOne({ where: { email } });
    // Do not reveal whether user exists
    if (!user) {
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "If the email exists, a code has been sent",
        });
        return;
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = Date.now() + 15 * 60 * 1000;
    passwordResetStore.set(email, { code, expiresAt });
    const projectRoot = process.cwd();
    const candidateAssetDirs = [
        path_1.default.join(projectRoot, "assets"),
        path_1.default.join(projectRoot, "src", "assets"),
        path_1.default.join(projectRoot, "dist", "assets"),
    ];
    const assetsDir = candidateAssetDirs.find((p) => fs_1.default.existsSync(p)) || candidateAssetDirs[0];
    await (0, send_mail_1.default)({
        email,
        subject: "Reset your password",
        template: "activation-mail.ejs",
        data: { user, activationCode: code },
        attachments: [
            {
                filename: "logo.png",
                path: path_1.default.join(assetsDir, "logo.png"),
                cid: "logo",
            },
        ],
    });
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ success: true, message: "Verification code sent" });
};
exports.forgotPasswordController = forgotPasswordController;
const resetPasswordController = async (req, res) => {
    const { email, activation_code, password } = req.body;
    if (!email || !activation_code || !password) {
        throw new error_1.BadRequestError("Email, code and new password are required");
    }
    const entry = passwordResetStore.get(email);
    if (!entry) {
        throw new error_1.BadRequestError("Invalid or expired code");
    }
    if (Date.now() > entry.expiresAt) {
        passwordResetStore.delete(email);
        throw new error_1.BadRequestError("Code expired");
    }
    if (entry.code !== activation_code) {
        throw new error_1.BadRequestError("Invalid code");
    }
    const user = await user_2.default.findOne({ where: { email } });
    if (!user) {
        throw new error_1.NotFoundError("User not found");
    }
    user.password = password;
    await user.save();
    passwordResetStore.delete(email);
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ success: true, message: "Password has been reset" });
};
exports.resetPasswordController = resetPasswordController;
const getUserDetailsController = async (req, res) => {
    const { access_token } = req.cookies;
    if (!access_token) {
        throw new error_1.UnauthorizedError("No token provided");
    }
    const decoded = jsonwebtoken_1.default.verify(access_token, process.env.ACCESS_TOKEN_SECRET);
    if (!decoded)
        throw new error_1.UnauthorizedError("Invalid token");
    const user = await (0, user_3.findUserByID)(decoded.id);
    if (!user) {
        throw new error_1.NotFoundError("User not found.");
    }
    res.status(http_status_codes_1.StatusCodes.OK).json(user);
};
exports.getUserDetailsController = getUserDetailsController;
const refreshTokenController = async (req, res) => {
    const refresh_token = req.cookies.refresh_token;
    if (!refresh_token) {
        throw new error_1.UnauthorizedError("Refresh token not provided");
    }
    let decoded;
    try {
        decoded = jsonwebtoken_1.default.verify(refresh_token, process.env.REFRESH_TOKEN_SECRET);
    }
    catch (error) {
        throw new error_1.UnauthorizedError("Invalid or expired refresh token");
    }
    const userSession = await (0, user_3.findUserByID)(decoded.id);
    if (!userSession) {
        throw new error_1.NotFoundError("User not found.");
    }
    const accessToken = jsonwebtoken_1.default.sign({ id: userSession.id }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
    });
    const refreshToken = jsonwebtoken_1.default.sign({ id: userSession.id }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "3d",
    });
    req.user = userSession;
    // Use getter functions to ensure correct cookie configuration
    const accessOptions = (0, jwt_1.getAccessTokenOptions)();
    const refreshOptions = (0, jwt_1.getRefreshTokenOptions)();
    res.cookie("access_token", accessToken, accessOptions);
    res.cookie("refresh_token", refreshToken, refreshOptions);
    res.status(http_status_codes_1.StatusCodes.OK).json({ success: true });
};
exports.refreshTokenController = refreshTokenController;
const logoutController = async (req, res) => {
    try {
        // Clear cookies with matching options (must match the options used when setting cookies)
        // IMPORTANT: Must include domain if cookies were set with a domain
        const isProd = process.env.NODE_ENV === "production";
        // Use the same domain logic as when setting cookies
        const cookieDomain = isProd
            ? ".mvsoftwares.space" // Leading dot makes it accessible to all subdomains
            : undefined; // In development, don't set domain to allow localhost
        const clearOptions = {
            httpOnly: true,
            sameSite: isProd ? "none" : "lax",
            secure: isProd,
            path: "/",
            // Include domain if it was set when creating cookies
            ...(cookieDomain ? { domain: cookieDomain } : {}),
        };
        console.log("[Logout] Clearing cookies with options:", clearOptions);
        res.clearCookie("access_token", clearOptions);
        res.clearCookie("refresh_token", clearOptions);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "Logged out succesfully",
        });
    }
    catch (error) {
        throw new error_1.ConflictError("Something went wrong.");
    }
};
exports.logoutController = logoutController;
const editUserController = async (req, res) => {
    const { id } = req.params;
    const { firstName, lastName, middleName, email, phone, age, gender, address, bio, studentId, instructorId, role, password, } = req.body;
    if (!id) {
        throw new error_1.BadRequestError("User ID is required.");
    }
    // Handle avatar upload if provided - use Cloudinary URL if available
    const avatar = req.cloudUrls && req.cloudUrls.length > 0 ? req.cloudUrls[0] : undefined;
    const updateData = {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(middleName !== undefined && { middleName }),
        ...(email && { email }),
        ...(phone && { phone }),
        ...(age !== undefined && { age }),
        ...(gender && { gender }),
        ...(address !== undefined && { address }),
        ...(bio !== undefined && { bio }),
        ...(studentId !== undefined && { studentId }),
        ...(instructorId !== undefined && { instructorId }),
        ...(role && { role }),
        ...(password && { password }),
        ...(avatar && { avatar }),
    };
    const updatedUser = await (0, user_3.updateUserData)(id, updateData);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "User updated successfully",
        user: updatedUser,
    });
};
exports.editUserController = editUserController;
const changePasswordController = async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        throw new error_1.BadRequestError("Current password and new password are required");
    }
    if (newPassword.length < 6) {
        throw new error_1.BadRequestError("New password must be at least 6 characters long");
    }
    // Get user ID from authenticated user (set by auth middleware)
    console.log("req.user:", req.user);
    console.log("req.user?.id:", req.user?.id);
    const userId = req.user?.id;
    if (!userId) {
        throw new error_1.UnauthorizedError("User not authenticated");
    }
    await (0, user_3.changePasswordData)(userId, currentPassword, newPassword);
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: "Password changed successfully",
    });
};
exports.changePasswordController = changePasswordController;
const updateAllowLoginWithoutRequirementsController = async (req, res) => {
    const { allowLoginWithoutRequirements } = req.body;
    if (typeof allowLoginWithoutRequirements !== "boolean") {
        throw new error_1.BadRequestError("allowLoginWithoutRequirements must be a boolean");
    }
    // Get user ID from authenticated user (set by auth middleware)
    const userId = req.user?.id;
    if (!userId) {
        throw new error_1.UnauthorizedError("User not authenticated");
    }
    const user = await (0, user_3.findUserByID)(userId);
    // Verify user is an instructor
    if (user.role !== user_2.UserRole.INSTRUCTOR) {
        throw new error_1.UnauthorizedError("Only instructors can update this setting");
    }
    // Update the setting
    user.allowLoginWithoutRequirements = allowLoginWithoutRequirements;
    await user.save();
    res.status(http_status_codes_1.StatusCodes.OK).json({
        success: true,
        message: allowLoginWithoutRequirements
            ? "Students can now login without completing requirements"
            : "Students must submit requirements before logging in",
        user: {
            id: user.id,
            allowLoginWithoutRequirements: user.allowLoginWithoutRequirements,
        },
    });
};
exports.updateAllowLoginWithoutRequirementsController = updateAllowLoginWithoutRequirementsController;
