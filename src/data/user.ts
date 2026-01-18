import { CreateUserParams } from "@/@types/user";
import sequelize from "@/db";
import User, { UserRole, Gender } from "@/db/models/user";
import Department from "@/db/models/department";
import Section from "@/db/models/section";
import StudentEnrollment from "@/db/models/student-enrollment";
import Requirement from "@/db/models/requirement";
import RequirementComment from "@/db/models/requirement-comment";
import Report from "@/db/models/report";
import ReportView from "@/db/models/report-view";
import AttendanceRecord from "@/db/models/attendance-record";
import Practicum from "@/db/models/practicum";
import Announcement from "@/db/models/announcement";
import AnnouncementComment from "@/db/models/announcement-comment";
import Achievement from "@/db/models/achievement";
import FileAttachment from "@/db/models/file-attachment";
import Agency from "@/db/models/agency";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "@/utils/error";
import {
  deleteFromCloudinary,
  extractKeyFromUrl,
} from "@/utils/cloudinary-uploader";
import { Op } from "sequelize";

export const findUserByID = async (id: string) => {
  const user = await User.findByPk(id);

  if (!user) throw new NotFoundError("User not found.");

  return user;
};

export const createUserData = async (userData: CreateUserParams) => {
  const t = await sequelize.transaction();

  // Handle avatar - ensure it's a string (Cloudinary URL or empty string)
  const avatar = userData?.avatar || "";

  try {
    // Uniqueness pre-checks to provide clear errors before attempting insert
    // Check email uniqueness
    if (userData.email) {
      const existingByEmail = await User.findOne({
        where: { email: userData.email },
        transaction: t,
      });
      if (existingByEmail) {
        await t.rollback();
        throw new ConflictError("Email already exists.");
      }
    }

    // Check studentId uniqueness if provided
    if (userData.studentId) {
      const existingByStudentId = await User.findOne({
        where: { studentId: userData.studentId },
        transaction: t,
      });
      if (existingByStudentId) {
        await t.rollback();
        throw new ConflictError("Student ID already exists.");
      }
    }

    // Check instructorId uniqueness if provided
    if (userData.instructorId) {
      const existingByInstructorId = await User.findOne({
        where: { instructorId: userData.instructorId },
        transaction: t,
      });
      if (existingByInstructorId) {
        await t.rollback();
        throw new ConflictError("Instructor ID already exists.");
      }
    }

    // Determine role: validate consistency and infer if needed
    let finalRole: UserRole;

    // If role is explicitly provided, validate it
    if (userData.role) {
      finalRole = userData.role;

      // Validate role consistency with IDs
      if (userData.instructorId && finalRole !== UserRole.INSTRUCTOR) {
        await t.rollback();
        throw new BadRequestError(
          "If instructorId is provided, role must be 'instructor'."
        );
      }
      if (userData.studentId && finalRole !== UserRole.STUDENT) {
        await t.rollback();
        throw new BadRequestError(
          "If studentId is provided, role must be 'student'."
        );
      }
    } else {
      // Infer role from IDs if not explicitly provided
      if (userData.instructorId) {
        finalRole = UserRole.INSTRUCTOR;
      } else if (userData.studentId) {
        finalRole = UserRole.STUDENT;
      } else {
        // Default to USER if no role or ID provided
        finalRole = UserRole.USER;
      }
    }

    const user = await User.create(
      {
        firstName: userData.firstName,
        lastName: userData.lastName,
        middleName: userData.middleName,
        phone: userData.phone,
        email: userData.email,
        password: userData.password,
        age: userData?.age as number,
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
      },
      { transaction: t }
    );

    if (!user) {
      await t.rollback();
      throw new ConflictError("Failed to create user.");
    }

    await t.commit();
    return user;
  } catch (error: any) {
    // Safely rollback only if the transaction is not already finished
    try {
      // @ts-expect-error - Sequelize Transaction has runtime 'finished' flag
      if (!t.finished) {
        await t.rollback();
      }
    } catch (rollbackError) {
      console.error(
        "Rollback failed or transaction already finished during user creation:",
        rollbackError
      );
    }

    // If user creation failed and we have an avatar, clean it up from Cloudinary
    if (avatar) {
      try {
        const avatarKey = extractKeyFromUrl(avatar);
        if (avatarKey) {
          await deleteFromCloudinary(avatarKey);
        }
      } catch (cleanupError) {
        console.error(
          "Failed to cleanup avatar from Cloudinary during user creation failure:",
          cleanupError
        );
        // Don't throw here as the main error is more important
      }
    }

    // Normalize unique constraint errors into domain-specific ConflictError
    if (error?.name === "SequelizeUniqueConstraintError") {
      const fields = (error as any).fields || {};
      const message = ((): string => {
        if (fields.email) return "Email already exists.";
        if (fields.studentId) return "Student ID already exists.";
        if (fields.instructorId) return "Instructor ID already exists.";
        // Fallback by inspecting message string
        const raw = String(error.message || "").toLowerCase();
        if (raw.includes("email")) return "Email already exists.";
        if (raw.includes("student")) return "Student ID already exists.";
        if (raw.includes("instructor")) return "Instructor ID already exists.";
        return "Duplicate value violates a unique constraint.";
      })();
      throw new ConflictError(message);
    }

    throw error;
  }
};

export const login = async ({
  email,
  password,
}: {
  email: string;
  password: string;
}) => {
  const user = await User.findOne({
    where: {
      email,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const isPasswordMatch = await user.comparePassword(password);

  if (!isPasswordMatch) throw new BadRequestError("Invalid Credentials.");

  if (!user.isActive) {
    throw new UnauthorizedError(
      "Your account has been deactivated. Please contact your administrator."
    );
  }

  return user;
};

export const updateUserData = async (
  id: string,
  userData: Partial<CreateUserParams>
) => {
  const t = await sequelize.transaction();

  const user = await User.findByPk(id);
  if (!user) {
    await t.rollback();
    throw new NotFoundError("User not found.");
  }

  // Check if email is being updated and if it already exists
  if (userData.email && userData.email !== user.email) {
    const existingUser = await User.findOne({
      where: { email: userData.email },
    });
    if (existingUser) {
      await t.rollback();
      throw new ConflictError("Email already exists.");
    }
  }

  // Check if studentId is being updated and if it already exists
  if (userData.studentId && userData.studentId !== user.studentId) {
    const existingStudent = await User.findOne({
      where: { studentId: userData.studentId },
    });
    if (existingStudent) {
      await t.rollback();
      throw new ConflictError("Student ID already exists.");
    }
  }

  // Check if instructorId is being updated and if it already exists
  if (userData.instructorId && userData.instructorId !== user.instructorId) {
    const existingInstructor = await User.findOne({
      where: { instructorId: userData.instructorId },
    });
    if (existingInstructor) {
      await t.rollback();
      throw new ConflictError("Instructor ID already exists.");
    }
  }

  // Handle avatar update - delete old avatar from Cloudinary if new one is provided
  let oldAvatarKey: string | null = null;
  if (userData.avatar !== undefined && userData.avatar !== user.avatar) {
    // Extract the public key from the old avatar URL if it exists
    if (user.avatar) {
      oldAvatarKey = extractKeyFromUrl(user.avatar);
    }
  }

  // Update user fields
  const updatedUser = await user.update(
    {
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
    },
    { transaction: t }
  );

  await t.commit();

  // Delete old avatar from Cloudinary after successful update
  if (oldAvatarKey) {
    try {
      await deleteFromCloudinary(oldAvatarKey);
    } catch (error) {
      console.error("Failed to delete old avatar from Cloudinary:", error);
      // Don't throw error here as the user update was successful
    }
  }

  return updatedUser;
};

export const changePasswordData = async (
  userId: string,
  currentPassword: string,
  newPassword: string
) => {
  const t = await sequelize.transaction();

  try {
    console.log("Looking for user with ID:", userId);
    const user = await User.findByPk(userId);
    console.log("Found user:", user ? "Yes" : "No");
    if (!user) {
      await t.rollback();
      throw new NotFoundError("User not found.");
    }

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      await t.rollback();
      throw new BadRequestError("Current password is incorrect");
    }

    // Update password
    user.password = newPassword;
    await user.save({ transaction: t });

    await t.commit();
    return user;
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export interface GetUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  status?: string;
}

export const getUsersData = async (filters: GetUsersFilters = {}) => {
  const page = filters.page || 1;
  const limit = filters.limit || 1000;
  const offset = (page - 1) * limit;

  const where: any = {};

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
    where[Op.or] = [
      { firstName: { [Op.iLike]: `%${filters.search}%` } },
      { lastName: { [Op.iLike]: `%${filters.search}%` } },
      { email: { [Op.iLike]: `%${filters.search}%` } },
    ];
  }

  const { count, rows: users } = await User.findAndCountAll({
    where,
    limit,
    offset,
    order: [["createdAt", "DESC"]],
    include: [
      {
        model: Department,
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

export const deleteUserData = async (userId: string) => {
  const t = await sequelize.transaction();

  try {
    const user = await User.findByPk(userId, { transaction: t });
    if (!user) {
      await t.rollback();
      throw new NotFoundError("User not found.");
    }

    const userRole = user.role;

    // Delete student-related records
    if (userRole === UserRole.STUDENT) {
      // Delete student enrollments
      await StudentEnrollment.destroy({
        where: { studentId: userId },
        transaction: t,
      });

      // Delete requirements and their comments
      const requirementIds = await Requirement.findAll({
        where: { studentId: userId },
        attributes: ["id"],
        transaction: t,
      });
      if (requirementIds.length > 0) {
        await RequirementComment.destroy({
          where: {
            requirementId: { [Op.in]: requirementIds.map((r) => r.id) },
          },
          transaction: t,
        });
      }
      await Requirement.destroy({
        where: { studentId: userId },
        transaction: t,
      });

      // Delete reports (clear report views first to satisfy FK constraint)
      const reportIds = await Report.findAll({
        where: { studentId: userId },
        attributes: ["id"],
        transaction: t,
      });

      if (reportIds.length > 0) {
        await ReportView.destroy({
          where: { reportId: { [Op.in]: reportIds.map((r) => r.id) } },
          transaction: t,
        });
      }

      await Report.destroy({
        where: { studentId: userId },
        transaction: t,
      });

      // Delete attendance records
      await AttendanceRecord.destroy({
        where: { studentId: userId },
        transaction: t,
      });

      // Delete practicums
      await Practicum.destroy({
        where: { studentId: userId },
        transaction: t,
      });

      // Delete achievements where user is the student
      await Achievement.destroy({
        where: { studentId: userId },
        transaction: t,
      });
    }

    // Delete instructor-related records
    if (userRole === UserRole.INSTRUCTOR) {
      // Set NULL for sections where user is instructor
      await Section.update(
        { instructorId: null },
        { where: { instructorId: userId }, transaction: t }
      );

      // Set NULL for departments where user is head
      await Department.update(
        { headId: null },
        { where: { headId: userId }, transaction: t }
      );

      // Set NULL for agencies where user is instructor
      await Agency.update(
        { instructorId: null },
        { where: { instructorId: userId }, transaction: t }
      );

      // Delete announcements authored by user
      const announcementIds = await Announcement.findAll({
        where: { authorId: userId },
        attributes: ["id"],
        transaction: t,
      });
      if (announcementIds.length > 0) {
        await AnnouncementComment.destroy({
          where: {
            announcementId: { [Op.in]: announcementIds.map((a) => a.id) },
          },
          transaction: t,
        });
      }
      await Announcement.destroy({
        where: { authorId: userId },
        transaction: t,
      });
    }

    // Delete admin-related records (if any)
    if (userRole === UserRole.ADMIN) {
      // Set NULL for departments where admin is head
      await Department.update(
        { headId: null },
        { where: { headId: userId }, transaction: t }
      );
    }

    // Delete records that apply to all roles
    // Delete file attachments
    await FileAttachment.destroy({
      where: { uploadedBy: userId },
      transaction: t,
    });

    // Set NULL for approvedBy fields in requirements
    await Requirement.update(
      { approvedBy: null },
      { where: { approvedBy: userId }, transaction: t }
    );

    // Set NULL for approvedBy fields in reports
    await Report.update(
      { approvedBy: null },
      { where: { approvedBy: userId }, transaction: t }
    );

    // Set NULL for approvedBy fields in attendance records
    await AttendanceRecord.update(
      { approvedBy: null },
      { where: { approvedBy: userId }, transaction: t }
    );

    // Set NULL for awardedBy fields in achievements
    await Achievement.update(
      { awardedBy: null },
      { where: { awardedBy: userId }, transaction: t }
    );

    // Delete comments by user
    await RequirementComment.destroy({
      where: { userId: userId },
      transaction: t,
    });

    await AnnouncementComment.destroy({
      where: { userId: userId },
      transaction: t,
    });

    // Delete avatar from Cloudinary if exists
    if (user.avatar) {
      try {
        const avatarKey = extractKeyFromUrl(user.avatar);
        if (avatarKey) {
          await deleteFromCloudinary(avatarKey);
        }
      } catch (error) {
        console.error("Failed to delete avatar from Cloudinary:", error);
        // Don't throw - continue with user deletion
      }
    }

    // Finally, delete the user account
    await user.destroy({ transaction: t });

    await t.commit();

    return { success: true };
  } catch (error) {
    await t.rollback();
    throw error;
  }
};

export const toggleUserStatusData = async (
  userId: string,
  isActive: boolean
) => {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  await user.update({ isActive });

  return user;
};

export const seedAdminData = async () => {
  // Check if an active admin already exists
  const existingActiveAdmin = await User.findOne({
    where: { 
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  if (existingActiveAdmin) {
    throw new ConflictError("An active admin account already exists.");
  }

  // Check if admin email already exists (might be inactive)
  const defaultEmail = "admin@tracesys.com";
  const existingAdminByEmail = await User.findOne({
    where: { email: defaultEmail },
  });

  let admin;
  const defaultPassword = "Admin@123";

  if (existingAdminByEmail) {
    // If admin exists but is inactive, reactivate and reset password
    if (existingAdminByEmail.role === UserRole.ADMIN && !existingAdminByEmail.isActive) {
      existingAdminByEmail.password = defaultPassword;
      existingAdminByEmail.isActive = true;
      existingAdminByEmail.emailVerified = true;
      await existingAdminByEmail.save();
      admin = existingAdminByEmail;
    } else {
      throw new ConflictError(`Email ${defaultEmail} is already in use by another account.`);
    }
  } else {
    // Create new default admin account
    admin = await createUserData({
      firstName: "Admin",
      lastName: "User",
      email: defaultEmail,
      password: defaultPassword,
      phone: "0000000000",
      role: UserRole.ADMIN,
      gender: Gender.MALE,
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
