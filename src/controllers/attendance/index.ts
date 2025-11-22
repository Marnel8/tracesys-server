import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { Op } from "sequelize";
import {
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
} from "@/utils/error";
import {
  clockInData,
  clockOutData,
  findAttendanceByIdData,
  getAttendanceListData,
  nullifyIncompleteSessions,
} from "@/data/attendance";
import StudentEnrollment from "@/db/models/student-enrollment";
import Section from "@/db/models/section";
import User from "@/db/models/user";
import Requirement from "@/db/models/requirement";
import Practicum from "@/db/models/practicum";
import Agency from "@/db/models/agency";
import { logStudentAction } from "@/utils/audit-logger";

/**
 * Helper function to check if student can clock in/out based on requirements.
 *
 * This function:
 * 1. Checks if any of the student's instructors have enabled the bypass setting
 * 2. If no instructor allows bypass, verifies the student has at least one submitted/approved requirement
 * 3. Throws UnauthorizedError if requirements are not met
 *
 * @param studentId - The ID of the student to check
 * @throws {UnauthorizedError} If student cannot clock in/out due to missing requirements
 */
const checkStudentCanClockIn = async (studentId: string): Promise<void> => {
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
        "You must submit at least one requirement before you can clock in/out. Please contact your instructor for assistance."
      );
    }
  }
};

export const listAttendanceController = async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    status = "all",
    approvalStatus = "all",
    studentId,
    practicumId,
    date,
    startDate,
    endDate,
  } = req.query as any;

  const result = await getAttendanceListData({
    page: Number(page),
    limit: Number(limit),
    search: search || "",
    status: status || "all",
    approvalStatus: approvalStatus || "all",
    studentId: studentId || undefined,
    practicumId: practicumId || undefined,
    date: date || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    instructorId: req.user?.role === "instructor" ? req.user.id : undefined,
  });

  res
    .status(StatusCodes.OK)
    .json({
      success: true,
      message: "Attendance records retrieved",
      data: result,
    });
};

export const listInstructorAttendanceController = async (
  req: Request,
  res: Response
) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    status = "all",
    approvalStatus = "all",
    studentId,
    practicumId,
    date,
    startDate,
    endDate,
  } = req.query as any;

  const result = await getAttendanceListData({
    page: Number(page),
    limit: Number(limit),
    search: search || "",
    status: status || "all",
    approvalStatus: approvalStatus || "all",
    studentId: studentId || undefined,
    practicumId: practicumId || undefined,
    date: date || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    instructorId: req.user?.id,
  });

  res
    .status(StatusCodes.OK)
    .json({
      success: true,
      message: "Instructor attendance retrieved",
      data: result,
    });
};

export const getAttendanceController = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequestError("Attendance ID is required");
  const record = await findAttendanceByIdData(id);
  if (!record) throw new NotFoundError("Attendance record not found");
  res.status(StatusCodes.OK).json({ success: true, data: record });
};

export const clockInController = async (req: Request, res: Response) => {
  const studentId = req.user?.id;
  if (!studentId)
    throw new BadRequestError("Missing authenticated user context");
  const {
    practicumId,
    date = undefined,
    day = undefined,
    latitude = null,
    longitude = null,
    address = null,
    locationType = undefined,
    deviceType = undefined,
    deviceUnit = null,
    macAddress = null,
    remarks = undefined,
    sessionType = "morning", // Default to morning for backward compatibility
  } = req.body || {};

  let photoUrl: string | null = null;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (file) {
    photoUrl = `/uploads/${file.filename}`;
  }

  if (!practicumId) throw new BadRequestError("practicumId is required");

  // Check if student can clock in based on requirements
  await checkStudentCanClockIn(studentId);

  // Fetch agency data from practicum for validation
  let agency: Agency | null = null;
  try {
    const practicum = await Practicum.findByPk(practicumId, {
      include: [
        {
          model: Agency,
          as: "agency",
          attributes: [
            "id",
            "name",
            "openingTime",
            "closingTime",
            "operatingDays",
            "lunchStartTime",
            "lunchEndTime",
          ],
        },
      ],
    });
    agency = (practicum as any)?.agency || null;
  } catch (error) {
    // If agency fetch fails, continue without validation
  }

  // Nullify incomplete sessions from previous day if needed
  const now = new Date();
  const today = new Date(now.toISOString().slice(0, 10));
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  await nullifyIncompleteSessions(studentId, practicumId, yesterday);

  const record = await clockInData({
    studentId,
    practicumId,
    date,
    day,
    latitude,
    longitude,
    address,
    locationType,
    deviceType,
    deviceUnit,
    macAddress,
    remarks,
    photoUrl,
    sessionType: sessionType as "morning" | "afternoon",
    agency,
  });

  // Log audit event
  await logStudentAction(req, {
    action: "Clock In",
    resource: "Attendance",
    resourceId: record.id,
    details: `Student clocked in for ${sessionType} session${practicumId ? ` (Practicum: ${practicumId})` : ""}`,
    category: "attendance",
    severity: "low",
    status: "success",
    metadata: {
      sessionType,
      practicumId,
      date: date || new Date().toISOString().split("T")[0],
    },
  });

  res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Clock-in successful", data: record });
};

export const clockOutController = async (req: Request, res: Response) => {
  const studentId = req.user?.id;
  if (!studentId)
    throw new BadRequestError("Missing authenticated user context");
  const {
    practicumId,
    date = undefined,
    latitude = null,
    longitude = null,
    address = null,
    locationType = undefined,
    deviceType = undefined,
    deviceUnit = null,
    macAddress = null,
    remarks = undefined,
    sessionType = "morning", // Default to morning for backward compatibility
  } = req.body || {};

  let photoUrl: string | null = null;
  const file = (req as any).file as Express.Multer.File | undefined;
  if (file) {
    photoUrl = `/uploads/${file.filename}`;
  }

  if (!practicumId) throw new BadRequestError("practicumId is required");

  // Check if student can clock out based on requirements
  await checkStudentCanClockIn(studentId);

  // Fetch agency data from practicum for validation
  let agency: Agency | null = null;
  try {
    const practicum = await Practicum.findByPk(practicumId, {
      include: [
        {
          model: Agency,
          as: "agency",
          attributes: [
            "id",
            "name",
            "openingTime",
            "closingTime",
            "operatingDays",
            "lunchStartTime",
            "lunchEndTime",
          ],
        },
      ],
    });
    agency = (practicum as any)?.agency || null;
  } catch (error) {
    // If agency fetch fails, continue without validation
  }

  const record = await clockOutData({
    studentId,
    practicumId,
    date,
    latitude,
    longitude,
    address,
    locationType,
    deviceType,
    deviceUnit,
    macAddress,
    remarks,
    photoUrl,
    sessionType: sessionType as "morning" | "afternoon",
    agency,
  });

  // Log audit event
  await logStudentAction(req, {
    action: "Clock Out",
    resource: "Attendance",
    resourceId: record.id,
    details: `Student clocked out from ${sessionType} session${practicumId ? ` (Practicum: ${practicumId})` : ""}`,
    category: "attendance",
    severity: "low",
    status: "success",
    metadata: {
      sessionType,
      practicumId,
      date: date || new Date().toISOString().split("T")[0],
    },
  });

  res
    .status(StatusCodes.OK)
    .json({ success: true, message: "Clock-out successful", data: record });
};

// Student-specific attendance endpoints
export const getStudentAttendanceController = async (
  req: Request,
  res: Response
) => {
  const { studentId } = req.params;
  const { page = 1, limit = 10, startDate, endDate } = req.query as any;

  if (!studentId) throw new BadRequestError("Student ID is required");

  const result = await getAttendanceListData({
    page: Number(page),
    limit: Number(limit),
    studentId,
    date: startDate || undefined,
  });

  res
    .status(StatusCodes.OK)
    .json({
      success: true,
      message: "Student attendance records retrieved",
      data: result,
    });
};

export const getAttendanceStatsController = async (
  req: Request,
  res: Response
) => {
  const { studentId } = req.query as any;
  const { startDate, endDate } = req.query as any;

  if (!studentId) throw new BadRequestError("Student ID is required");

  // Get all attendance records for the student
  const allRecords = await getAttendanceListData({
    page: 1,
    limit: 1000, // Get all records for stats calculation
    studentId,
  });

  const records = allRecords.attendance || [];

  // Calculate stats
  const totalDays = records.length;
  const presentDays = records.filter((r) => r.status === "present").length;
  const absentDays = records.filter((r) => r.status === "absent").length;
  const lateDays = records.filter((r) => r.status === "late").length;
  const excusedDays = records.filter((r) => r.status === "excused").length;

  const attendancePercentage =
    totalDays > 0
      ? Math.round(((presentDays + lateDays + excusedDays) / totalDays) * 100)
      : 0;

  // Calculate current streak (consecutive present/late/excused days from most recent)
  let currentStreak = 0;
  for (let i = records.length - 1; i >= 0; i--) {
    if (["present", "late", "excused"].includes(records[i].status)) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  for (const record of records) {
    if (["present", "late", "excused"].includes(record.status)) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  const stats = {
    totalDays,
    presentDays,
    absentDays,
    lateDays,
    excusedDays,
    attendancePercentage,
    currentStreak,
    longestStreak,
  };

  res
    .status(StatusCodes.OK)
    .json({
      success: true,
      message: "Attendance stats retrieved",
      data: stats,
    });
};

export const getTodayAttendanceController = async (
  req: Request,
  res: Response
) => {
  const { studentId } = req.params;

  if (!studentId) throw new BadRequestError("Student ID is required");

  const today = new Date().toISOString().split("T")[0];

  const result = await getAttendanceListData({
    page: 1,
    limit: 1,
    studentId,
    date: today,
  });

  const todayRecord = result.attendance?.[0] || null;

  res
    .status(StatusCodes.OK)
    .json({
      success: true,
      message: "Today's attendance retrieved",
      data: todayRecord,
    });
};

// Approval/Decline removed per product decision
