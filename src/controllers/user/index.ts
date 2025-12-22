import { Request, Response } from "express";
import path from "path";
import fs from "fs";

import jwt, { JwtPayload } from "jsonwebtoken";
import sendMail from "@/utils/send-mail";
import { createActivationToken } from "@/services/user";
import User, { UserRole } from "@/db/models/user";
import { IActivationRequest, CreateUserParams } from "@/@types/user";
import { StatusCodes } from "http-status-codes";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "@/utils/error";
import {
  createUserData,
  findUserByID,
  login,
  updateUserData,
  changePasswordData,
} from "@/data/user";
import StudentEnrollment from "@/db/models/student-enrollment";
import Section from "@/db/models/section";
import Requirement from "@/db/models/requirement";
import { Op } from "sequelize";
import {
  getAccessTokenOptions,
  getRefreshTokenOptions,
  sendToken,
} from "@/utils/jwt";
import {
  uploadUserAvatarUpdate,
  uploadUserAvatar,
} from "@/utils/image-handler";
// Simple in-memory reset store (email -> { code, expiresAt })
const passwordResetStore: Map<string, { code: string; expiresAt: number }> =
  new Map();

export const registerUserController = async (req: Request, res: Response) => {
  const {
    firstName,
    lastName,
    email,
    password,
    role,
    gender,
    age,
    phone,
    middleName,
    address,
    bio,
    studentId,
    instructorId,
    departmentId,
    program,
    specialization,
    yearLevel,
  } = req.body;

  if (!firstName || !lastName || !email || !password) {
    throw new BadRequestError("Please provide all necessary data.");
  }

  // Validate and convert role
  let validatedRole: UserRole | undefined;
  if (role) {
    // Convert string role to UserRole enum if needed
    const roleString = typeof role === "string" ? role.toLowerCase() : role;
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(roleString as UserRole)) {
      throw new BadRequestError(
        `Invalid role. Must be one of: ${validRoles.join(", ")}`
      );
    }
    validatedRole = roleString as UserRole;
  }

  // Validate role consistency with IDs
  if (instructorId && validatedRole && validatedRole !== UserRole.INSTRUCTOR) {
    throw new BadRequestError(
      "If instructorId is provided, role must be 'instructor'."
    );
  }
  if (studentId && validatedRole && validatedRole !== UserRole.STUDENT) {
    throw new BadRequestError(
      "If studentId is provided, role must be 'student'."
    );
  }

  // Infer role from IDs if not explicitly provided
  if (!validatedRole) {
    if (instructorId) {
      validatedRole = UserRole.INSTRUCTOR;
    } else if (studentId) {
      validatedRole = UserRole.STUDENT;
    }
  }

  // Handle avatar upload if provided - use Cloudinary URL if available
  const avatar =
    req.cloudUrls && req.cloudUrls.length > 0 ? req.cloudUrls[0] : "";

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
    program,
    specialization,
    yearLevel,
    avatar,
  };

  const activationToken = createActivationToken(user);
  const activationCode = activationToken.activationCode;
  const data = { user, activationCode };

  const projectRoot = process.cwd();
  const candidateAssetDirs = [
    path.join(projectRoot, "assets"),
    path.join(projectRoot, "src", "assets"),
    path.join(projectRoot, "dist", "assets"),
  ];
  const assetsDir =
    candidateAssetDirs.find((p) => fs.existsSync(p)) || candidateAssetDirs[0];

  await sendMail({
    email: user.email,
    subject: "Activate your account",
    template: "activation-mail.ejs",
    data,
    attachments: [
      {
        filename: "logo.png",
        path: path.join(assetsDir, "logo.png"),
        cid: "logo",
      },
    ],
  });

  res.status(StatusCodes.OK).json({
    success: true,
    message: `Please check your email: ${user.email} to activate your account`,
    activationToken: activationToken.token,
  });
};

export const activateUserController = async (req: Request, res: Response) => {
  const { activation_token, activation_code } = req.body as IActivationRequest;

  const newUser: { user: User; activationCode: string } = jwt.verify(
    activation_token,
    process.env.ACTIVATION_SECRET as string
  ) as { user: User; activationCode: string };

  if (newUser.activationCode !== activation_code) {
    throw new BadRequestError("Activation code did not match.");
  }

  const {
    firstName,
    lastName,
    middleName,
    phone,
    email,
    age,
    password,
    gender,
    avatar,
    role,
    address,
    bio,
    studentId,
    instructorId,
    departmentId,
    program,
    specialization,
    yearLevel,
  } = newUser.user as any;

  const user = await createUserData({
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
    program,
    specialization,
    yearLevel,
  });

  res.status(StatusCodes.CREATED).json(user);
};

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

export const loginController = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  const userResult = await login({ email, password });

  // Check requirement login restriction for students (defense in depth)
  if (userResult.role === UserRole.STUDENT) {
    await checkStudentLoginRequirements(userResult.id);
  }

  sendToken(userResult, StatusCodes.OK, res);
};

export const forgotPasswordController = async (req: Request, res: Response) => {
  const { email } = req.body as { email?: string };

  if (!email) {
    throw new BadRequestError("Email is required");
  }

  const user = await User.findOne({ where: { email } });

  // Do not reveal whether user exists
  if (!user) {
    res.status(StatusCodes.OK).json({
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
    path.join(projectRoot, "assets"),
    path.join(projectRoot, "src", "assets"),
    path.join(projectRoot, "dist", "assets"),
  ];
  const assetsDir =
    candidateAssetDirs.find((p) => fs.existsSync(p)) || candidateAssetDirs[0];

  await sendMail({
    email,
    subject: "Reset your password",
    template: "activation-mail.ejs",
    data: { user, activationCode: code },
    attachments: [
      {
        filename: "logo.png",
        path: path.join(assetsDir, "logo.png"),
        cid: "logo",
      },
    ],
  });

  res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Verification code sent" });
};

export const resetPasswordController = async (req: Request, res: Response) => {
  const { email, activation_code, password } = req.body as {
    email?: string;
    activation_code?: string;
    password?: string;
  };

  if (!email || !activation_code || !password) {
    throw new BadRequestError("Email, code and new password are required");
  }

  const entry = passwordResetStore.get(email);
  if (!entry) {
    throw new BadRequestError("Invalid or expired code");
  }

  if (Date.now() > entry.expiresAt) {
    passwordResetStore.delete(email);
    throw new BadRequestError("Code expired");
  }

  if (entry.code !== activation_code) {
    throw new BadRequestError("Invalid code");
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  user.password = password;
  await user.save();

  passwordResetStore.delete(email);

  res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Password has been reset" });
};

export const getUserDetailsController = async (req: Request, res: Response) => {
  const { access_token } = req.cookies;

  if (!access_token) {
    throw new UnauthorizedError("No token provided");
  }

  const decoded = jwt.verify(
    access_token,
    process.env.ACCESS_TOKEN_SECRET as string
  ) as JwtPayload;

  if (!decoded) throw new UnauthorizedError("Invalid token");

  const user = await findUserByID(decoded.id);

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  res.status(StatusCodes.OK).json(user);
};

export const refreshTokenController = async (req: Request, res: Response) => {
  const refresh_token = req.cookies.refresh_token as string;

  if (!refresh_token) {
    throw new UnauthorizedError("Refresh token not provided");
  }

  let decoded: JwtPayload;

  try {
    decoded = jwt.verify(
      refresh_token,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as JwtPayload;
  } catch (error) {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }

  const userSession = await findUserByID(decoded.id);

  if (!userSession) {
    throw new NotFoundError("User not found.");
  }

  const accessToken = jwt.sign(
    { id: userSession.id },
    process.env.ACCESS_TOKEN_SECRET as string,
    {
      expiresIn: "1h",
    }
  );

  const refreshToken = jwt.sign(
    { id: userSession.id },
    process.env.REFRESH_TOKEN_SECRET as string,
    {
      expiresIn: "3d",
    }
  );

  req.user = userSession;

  // Use getter functions to ensure correct cookie configuration
  const accessOptions = getAccessTokenOptions();
  const refreshOptions = getRefreshTokenOptions();

  res.cookie("access_token", accessToken, accessOptions);
  res.cookie("refresh_token", refreshToken, refreshOptions);

  res.status(StatusCodes.OK).json({ success: true });
};

export const logoutController = async (req: Request, res: Response) => {
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
      sameSite: isProd ? ("none" as const) : ("lax" as const),
      secure: isProd,
      path: "/",
      // Include domain if it was set when creating cookies
      ...(cookieDomain ? { domain: cookieDomain } : {}),
    };

    console.log("[Logout] Clearing cookies with options:", clearOptions);

    res.clearCookie("access_token", clearOptions);
    res.clearCookie("refresh_token", clearOptions);

    res.status(StatusCodes.OK).json({
      success: true,
      message: "Logged out succesfully",
    });
  } catch (error) {
    throw new ConflictError("Something went wrong.");
  }
};

export const editUserController = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    firstName,
    lastName,
    middleName,
    email,
    phone,
    age,
    gender,
    address,
    bio,
    studentId,
    instructorId,
    role,
    password,
    departmentId,
    program,
    specialization,
    yearLevel,
  } = req.body;

  if (!id) {
    throw new BadRequestError("User ID is required.");
  }

  // Handle avatar upload if provided - use Cloudinary URL if available
  const avatar =
    req.cloudUrls && req.cloudUrls.length > 0 ? req.cloudUrls[0] : undefined;

  const updateData: Partial<CreateUserParams> = {
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
    ...(departmentId !== undefined && { departmentId }),
    ...(program !== undefined && { program }),
    ...(specialization !== undefined && { specialization }),
    ...(yearLevel !== undefined && { yearLevel }),
    ...(avatar && { avatar }),
  };

  const updatedUser = await updateUserData(id, updateData);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "User updated successfully",
    user: updatedUser,
  });
};

export const changePasswordController = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };

  if (!currentPassword || !newPassword) {
    throw new BadRequestError("Current password and new password are required");
  }

  if (newPassword.length < 6) {
    throw new BadRequestError(
      "New password must be at least 6 characters long"
    );
  }

  // Get user ID from authenticated user (set by auth middleware)
  console.log("req.user:", req.user);
  console.log("req.user?.id:", req.user?.id);
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError("User not authenticated");
  }

  await changePasswordData(userId, currentPassword, newPassword);

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Password changed successfully",
  });
};

export const updateAllowLoginWithoutRequirementsController = async (
  req: Request,
  res: Response
) => {
  const { allowLoginWithoutRequirements } = req.body as {
    allowLoginWithoutRequirements?: boolean;
  };

  if (typeof allowLoginWithoutRequirements !== "boolean") {
    throw new BadRequestError(
      "allowLoginWithoutRequirements must be a boolean"
    );
  }

  // Get user ID from authenticated user (set by auth middleware)
  const userId = req.user?.id;
  if (!userId) {
    throw new UnauthorizedError("User not authenticated");
  }

  const user = await findUserByID(userId);

  // Verify user is an instructor
  if (user.role !== UserRole.INSTRUCTOR) {
    throw new UnauthorizedError("Only instructors can update this setting");
  }

  // Update the setting
  user.allowLoginWithoutRequirements = allowLoginWithoutRequirements;
  await user.save();

  res.status(StatusCodes.OK).json({
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
