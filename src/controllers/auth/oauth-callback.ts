import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/utils/error";
import {
  validateInvitationToken,
  markInvitationAsUsed,
} from "@/data/invitation";
import { createStudentFromOAuth } from "@/data/student";
import User, { UserRole } from "@/db/models/user";
import StudentEnrollment from "@/db/models/student-enrollment";
import Section from "@/db/models/section";
import Requirement from "@/db/models/requirement";
import {
  getAccessTokenOptions,
  getRefreshTokenOptions,
  createAuthTokens,
} from "@/utils/jwt";

interface OAuthCallbackRequest {
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  provider: string;
  invitationToken?: string;
}

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
const checkStudentLoginRequirements = async (
  studentId: string
): Promise<void> => {
  // Get student's enrollments to find their sections and instructors
  const enrollments = await StudentEnrollment.findAll({
    where: { studentId },
    include: [
      {
        model: Section,
        as: "section" as any,
        required: false, // Left join to handle students without sections
        include: [
          {
            model: User,
            as: "instructor" as any,
            attributes: ["id", "allowLoginWithoutRequirements"],
            required: false, // Left join to handle sections without instructors
          },
        ],
      },
    ],
  });

  // Check if any instructor allows login without requirements
  // Also handle case where student has no enrollments
  const hasInstructorAllowingLogin =
    enrollments.length > 0 &&
    enrollments.some(
      (enrollment: any) =>
        enrollment.section?.instructor?.allowLoginWithoutRequirements === true
    );

  // If no instructor allows it, check if student has submitted requirements
  if (!hasInstructorAllowingLogin) {
    const submittedRequirements = await Requirement.count({
      where: {
        studentId,
        status: {
          [Op.in]: ["submitted", "approved"],
        },
      },
    });

    if (submittedRequirements === 0) {
      throw new UnauthorizedError(
        "You must submit at least one requirement before you can login. Please contact your instructor for assistance."
      );
    }
  }
};

export const handleOAuthCallback = async (req: Request, res: Response) => {
  const {
    email,
    firstName,
    lastName,
    avatar,
    provider,
    invitationToken,
  }: OAuthCallbackRequest = req.body;

  if (!email || !firstName || !lastName || !provider) {
    throw new BadRequestError("Missing required OAuth data.");
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    where: { email },
  });

  const issueTokens = (user: User) => {
    const { accessToken, refreshToken } = createAuthTokens(user);

    // Use getter functions to ensure correct cookie configuration
    const accessOptions = getAccessTokenOptions();
    const refreshOptions = getRefreshTokenOptions();

    res.cookie("access_token", accessToken, accessOptions);
    res.cookie("refresh_token", refreshToken, refreshOptions);

    return { accessToken, refreshToken };
  };

  if (existingUser) {
    // Check if user is active
    if (!existingUser.isActive) {
      throw new UnauthorizedError(
        "Your account has been deactivated. Please contact your administrator."
      );
    }

    // User exists - mark invitation as used if provided and return user
    if (invitationToken) {
      try {
        await markInvitationAsUsed(invitationToken);
      } catch (error) {
        // Invitation might already be used, continue anyway
      }
    }

    // Note: Login requirement check removed - students can now login without requirements
    // Requirement check is enforced at clock-in/out instead

    const tokens = issueTokens(existingUser);

    res.status(StatusCodes.OK).json({
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
        needsOnboarding:
          !existingUser.age ||
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
    throw new BadRequestError(
      "Invitation token is required for new user registration."
    );
  }

  // Validate invitation
  const invitation = await validateInvitationToken(invitationToken);

  // Check if email matches invitation
  if (invitation.email !== email) {
    throw new BadRequestError("OAuth email does not match invitation email.");
  }

  // Create user based on invitation role
  if (invitation.role === "student") {
    if (!invitation.sectionId) {
      throw new BadRequestError(
        "Section ID is required for student registration."
      );
    }

    const result = await createStudentFromOAuth({
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
    await markInvitationAsUsed(invitationToken);

    const createdUser = await User.findByPk(result.user.id);
    if (!createdUser) {
      throw new NotFoundError("Newly created student not found.");
    }

    // Note: Login requirement check removed - students can now login without requirements
    // Requirement check is enforced at clock-in/out instead

    const tokens = issueTokens(createdUser);

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: "Student account created successfully",
      data: {
        ...result,
        tokens,
      },
    });
    return;
  } else if (invitation.role === "instructor") {
    // Create instructor user
    const instructor = await User.create({
      email,
      firstName,
      lastName,
      password: null,
      role: UserRole.INSTRUCTOR,
      avatar: avatar || "",
      provider,
      emailVerified: true,
      isActive: true,
    });

    // Mark invitation as used
    await markInvitationAsUsed(invitationToken);

    const tokens = issueTokens(instructor);

    res.status(StatusCodes.CREATED).json({
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
        needsOnboarding:
          !instructor.age || !instructor.phone || !instructor.gender,
        tokens,
      },
    });
    return;
  }

  throw new BadRequestError("Invalid invitation role.");
};
