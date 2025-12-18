"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayAttendanceController = exports.getAttendanceStatsController = exports.getStudentAttendanceController = exports.clockOutController = exports.clockInController = exports.getAttendanceController = exports.listInstructorAttendanceController = exports.listAttendanceController = void 0;
const http_status_codes_1 = require("http-status-codes");
const sequelize_1 = require("sequelize");
const error_1 = require("../../utils/error.js");
const attendance_1 = require("../../data/attendance.js");
const student_enrollment_1 = __importDefault(require("../../db/models/student-enrollment.js"));
const section_1 = __importDefault(require("../../db/models/section.js"));
const user_1 = __importDefault(require("../../db/models/user.js"));
const requirement_1 = __importDefault(require("../../db/models/requirement.js"));
const practicum_1 = __importDefault(require("../../db/models/practicum.js"));
const agency_1 = __importDefault(require("../../db/models/agency.js"));
const audit_logger_1 = require("../../utils/audit-logger.js");
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
const checkStudentCanClockIn = async (studentId) => {
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
            throw new error_1.UnauthorizedError("You must submit at least one requirement before you can clock in/out. Please contact your instructor for assistance.");
        }
    }
};
const listAttendanceController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all", approvalStatus = "all", studentId, practicumId, date, startDate, endDate, } = req.query;
    const result = await (0, attendance_1.getAttendanceListData)({
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
        .status(http_status_codes_1.StatusCodes.OK)
        .json({
        success: true,
        message: "Attendance records retrieved",
        data: result,
    });
};
exports.listAttendanceController = listAttendanceController;
const listInstructorAttendanceController = async (req, res) => {
    const { page = 1, limit = 10, search = "", status = "all", approvalStatus = "all", studentId, practicumId, date, startDate, endDate, } = req.query;
    const result = await (0, attendance_1.getAttendanceListData)({
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
        .status(http_status_codes_1.StatusCodes.OK)
        .json({
        success: true,
        message: "Instructor attendance retrieved",
        data: result,
    });
};
exports.listInstructorAttendanceController = listInstructorAttendanceController;
const getAttendanceController = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new error_1.BadRequestError("Attendance ID is required");
    const record = await (0, attendance_1.findAttendanceByIdData)(id);
    if (!record)
        throw new error_1.NotFoundError("Attendance record not found");
    res.status(http_status_codes_1.StatusCodes.OK).json({ success: true, data: record });
};
exports.getAttendanceController = getAttendanceController;
const clockInController = async (req, res) => {
    const studentId = req.user?.id;
    if (!studentId)
        throw new error_1.BadRequestError("Missing authenticated user context");
    const { practicumId, date = undefined, day = undefined, latitude = null, longitude = null, address = null, locationType = undefined, deviceType = undefined, deviceUnit = null, macAddress = null, remarks = undefined, sessionType = "morning", // Default to morning for backward compatibility
     } = req.body || {};
    let photoUrl = null;
    const file = req.file;
    if (file) {
        photoUrl = `/uploads/${file.filename}`;
    }
    if (!practicumId)
        throw new error_1.BadRequestError("practicumId is required");
    // Check if student can clock in based on requirements
    await checkStudentCanClockIn(studentId);
    // Fetch agency data from practicum for validation
    let agency = null;
    try {
        const practicum = await practicum_1.default.findByPk(practicumId, {
            include: [
                {
                    model: agency_1.default,
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
        agency = practicum?.agency || null;
    }
    catch (error) {
        // If agency fetch fails, continue without validation
    }
    // Nullify incomplete sessions from previous day if needed
    const now = new Date();
    const today = new Date(now.toISOString().slice(0, 10));
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    await (0, attendance_1.nullifyIncompleteSessions)(studentId, practicumId, yesterday);
    const record = await (0, attendance_1.clockInData)({
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
        sessionType: sessionType,
        agency,
    });
    // Log audit event
    await (0, audit_logger_1.logStudentAction)(req, {
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
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ success: true, message: "Clock-in successful", data: record });
};
exports.clockInController = clockInController;
const clockOutController = async (req, res) => {
    const studentId = req.user?.id;
    if (!studentId)
        throw new error_1.BadRequestError("Missing authenticated user context");
    const { practicumId, date = undefined, latitude = null, longitude = null, address = null, locationType = undefined, deviceType = undefined, deviceUnit = null, macAddress = null, remarks = undefined, sessionType = "morning", // Default to morning for backward compatibility
     } = req.body || {};
    let photoUrl = null;
    const file = req.file;
    if (file) {
        photoUrl = `/uploads/${file.filename}`;
    }
    if (!practicumId)
        throw new error_1.BadRequestError("practicumId is required");
    // Check if student can clock out based on requirements
    await checkStudentCanClockIn(studentId);
    // Fetch agency data from practicum for validation
    let agency = null;
    try {
        const practicum = await practicum_1.default.findByPk(practicumId, {
            include: [
                {
                    model: agency_1.default,
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
        agency = practicum?.agency || null;
    }
    catch (error) {
        // If agency fetch fails, continue without validation
    }
    const record = await (0, attendance_1.clockOutData)({
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
        sessionType: sessionType,
        agency,
    });
    // Log audit event
    await (0, audit_logger_1.logStudentAction)(req, {
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
        .status(http_status_codes_1.StatusCodes.OK)
        .json({ success: true, message: "Clock-out successful", data: record });
};
exports.clockOutController = clockOutController;
// Student-specific attendance endpoints
const getStudentAttendanceController = async (req, res) => {
    const { studentId } = req.params;
    const { page = 1, limit = 10, startDate, endDate } = req.query;
    if (!studentId)
        throw new error_1.BadRequestError("Student ID is required");
    const result = await (0, attendance_1.getAttendanceListData)({
        page: Number(page),
        limit: Number(limit),
        studentId,
        date: startDate || undefined,
    });
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({
        success: true,
        message: "Student attendance records retrieved",
        data: result,
    });
};
exports.getStudentAttendanceController = getStudentAttendanceController;
const getAttendanceStatsController = async (req, res) => {
    const { studentId } = req.query;
    const { startDate, endDate } = req.query;
    if (!studentId)
        throw new error_1.BadRequestError("Student ID is required");
    // Get all attendance records for the student
    const allRecords = await (0, attendance_1.getAttendanceListData)({
        page: 1,
        limit: 1000, // Get all records for stats calculation
        studentId,
    });
    const records = allRecords.attendance || [];
    // Calculate stats
    const totalDays = records.length;
    const presentDays = records.filter((r) => r.status === "present").length;
    const absentDays = records.filter((r) => r.status === "absent").length;
    // Note: "late" status is deprecated but included for backward compatibility with existing data
    const lateDays = records.filter((r) => r.status === "late").length;
    const excusedDays = records.filter((r) => r.status === "excused").length;
    // Count "late" as "present" for attendance percentage (backward compatibility)
    const attendancePercentage = totalDays > 0
        ? Math.round(((presentDays + lateDays + excusedDays) / totalDays) * 100)
        : 0;
    // Calculate current streak (consecutive present/excused days from most recent)
    // Note: "late" is included for backward compatibility
    let currentStreak = 0;
    for (let i = records.length - 1; i >= 0; i--) {
        if (["present", "excused"].includes(records[i].status) || records[i].status === "late") {
            currentStreak++;
        }
        else {
            break;
        }
    }
    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    for (const record of records) {
        if (["present", "excused"].includes(record.status) || record.status === "late") {
            tempStreak++;
            longestStreak = Math.max(longestStreak, tempStreak);
        }
        else {
            tempStreak = 0;
        }
    }
    const stats = {
        totalDays,
        presentDays,
        absentDays,
        lateDays, // Kept for backward compatibility
        excusedDays,
        attendancePercentage,
        currentStreak,
        longestStreak,
    };
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({
        success: true,
        message: "Attendance stats retrieved",
        data: stats,
    });
};
exports.getAttendanceStatsController = getAttendanceStatsController;
const getTodayAttendanceController = async (req, res) => {
    const { studentId } = req.params;
    if (!studentId)
        throw new error_1.BadRequestError("Student ID is required");
    const today = new Date().toISOString().split("T")[0];
    const result = await (0, attendance_1.getAttendanceListData)({
        page: 1,
        limit: 1,
        studentId,
        date: today,
    });
    const todayRecord = result.attendance?.[0] || null;
    res
        .status(http_status_codes_1.StatusCodes.OK)
        .json({
        success: true,
        message: "Today's attendance retrieved",
        data: todayRecord,
    });
};
exports.getTodayAttendanceController = getTodayAttendanceController;
// Approval/Decline removed per product decision
