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
exports.handleOAuthCallback = void 0;
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const error_1 = require("../../utils/error.js");
const invitation_1 = require("../../data/invitation.js");
const student_1 = require("../../data/student.js");
const user_1 = __importStar(require("../../db/models/user.js"));
const student_enrollment_1 = __importDefault(require("../../db/models/student-enrollment.js"));
const section_1 = __importDefault(require("../../db/models/section.js"));
const requirement_1 = __importDefault(require("../../db/models/requirement.js"));
const jwt_1 = require("../../utils/jwt.js");
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
                        model: user_1.default,
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
const handleOAuthCallback = async (req, res) => {
    const { email, firstName, lastName, avatar, provider, invitationToken, } = req.body;
    if (!email || !firstName || !lastName || !provider) {
        throw new error_1.BadRequestError("Missing required OAuth data.");
    }
    // Check if user already exists
    const existingUser = await user_1.default.findOne({
        where: { email },
    });
    const issueTokens = (user) => {
        const { accessToken, refreshToken } = (0, jwt_1.createAuthTokens)(user);
        // Use getter functions to ensure correct cookie configuration
        const accessOptions = (0, jwt_1.getAccessTokenOptions)();
        const refreshOptions = (0, jwt_1.getRefreshTokenOptions)();
        res.cookie("access_token", accessToken, accessOptions);
        res.cookie("refresh_token", refreshToken, refreshOptions);
        return { accessToken, refreshToken };
    };
    if (existingUser) {
        // Check if user is active
        if (!existingUser.isActive) {
            throw new error_1.UnauthorizedError("Your account has been deactivated. Please contact your administrator.");
        }
        // User exists - mark invitation as used if provided and return user
        if (invitationToken) {
            try {
                await (0, invitation_1.markInvitationAsUsed)(invitationToken);
            }
            catch (error) {
                // Invitation might already be used, continue anyway
            }
        }
        // Note: Login requirement check removed - students can now login without requirements
        // Requirement check is enforced at clock-in/out instead
        const tokens = issueTokens(existingUser);
        res.status(http_status_codes_1.StatusCodes.OK).json({
            success: true,
            message: "User already exists",
            data: {
                user: {
                    id: existingUser.id,
                    email: existingUser.email,
                    role: existingUser.role,
                    firstName: existingUser.firstName,
                    lastName: existingUser.lastName,
                },
                needsOnboarding: !existingUser.age ||
                    !existingUser.phone ||
                    !existingUser.gender ||
                    (existingUser.role === "student" && !existingUser.studentId),
                tokens,
            },
        });
        return;
    }
    // New user - check if invitation exists
    if (!invitationToken) {
        throw new error_1.BadRequestError("Invitation token is required for new user registration.");
    }
    // Validate invitation
    const invitation = await (0, invitation_1.validateInvitationToken)(invitationToken);
    // Check if email matches invitation
    if (invitation.email !== email) {
        throw new error_1.BadRequestError("OAuth email does not match invitation email.");
    }
    // Create user based on invitation role
    if (invitation.role === "student") {
        if (!invitation.sectionId) {
            throw new error_1.BadRequestError("Section ID is required for student registration.");
        }
        const result = await (0, student_1.createStudentFromOAuth)({
            email,
            firstName,
            lastName,
            avatar,
            provider,
            departmentId: invitation.departmentId || undefined,
            sectionId: invitation.sectionId,
            program: invitation.program || undefined,
        });
        // Mark invitation as used
        await (0, invitation_1.markInvitationAsUsed)(invitationToken);
        const createdUser = await user_1.default.findByPk(result.user.id);
        if (!createdUser) {
            throw new error_1.NotFoundError("Newly created student not found.");
        }
        // Note: Login requirement check removed - students can now login without requirements
        // Requirement check is enforced at clock-in/out instead
        const tokens = issueTokens(createdUser);
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "Student account created successfully",
            data: {
                ...result,
                tokens,
            },
        });
        return;
    }
    else if (invitation.role === "instructor") {
        // Create instructor user
        const instructor = await user_1.default.create({
            email,
            firstName,
            lastName,
            password: null,
            role: user_1.UserRole.INSTRUCTOR,
            avatar: avatar || "",
            provider,
            emailVerified: true,
            isActive: true,
        });
        // Mark invitation as used
        await (0, invitation_1.markInvitationAsUsed)(invitationToken);
        const tokens = issueTokens(instructor);
        res.status(http_status_codes_1.StatusCodes.CREATED).json({
            success: true,
            message: "Instructor account created successfully",
            data: {
                user: {
                    id: instructor.id,
                    email: instructor.email,
                    role: instructor.role,
                    firstName: instructor.firstName,
                    lastName: instructor.lastName,
                },
                needsOnboarding: !instructor.age || !instructor.phone || !instructor.gender,
                tokens,
            },
        });
        return;
    }
    throw new error_1.BadRequestError("Invalid invitation role.");
};
exports.handleOAuthCallback = handleOAuthCallback;
