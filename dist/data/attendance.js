"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clockOutData = exports.clockInData = exports.nullifyIncompleteSessions = exports.calculateHoursWithLunchExclusion = exports.checkOperatingHours = exports.checkOperatingDay = exports.findAttendanceByIdData = exports.getAttendanceListData = void 0;
const sequelize_1 = require("sequelize");
const attendance_record_1 = __importDefault(require("../db/models/attendance-record.js"));
const detailed_attendance_log_1 = __importDefault(require("../db/models/detailed-attendance-log.js"));
const user_1 = __importDefault(require("../db/models/user.js"));
const practicum_1 = __importDefault(require("../db/models/practicum.js"));
const agency_1 = __importDefault(require("../db/models/agency.js"));
const student_enrollment_1 = __importDefault(require("../db/models/student-enrollment.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
const getAttendanceListData = async (params) => {
    const { page, limit, search, status, approvalStatus, studentId, practicumId, date, startDate, endDate, instructorId } = params;
    const offset = (page - 1) * limit;
    const where = {};
    if (search?.trim()) {
        where[sequelize_1.Op.or] = [
            { day: { [sequelize_1.Op.like]: `%${search}%` } },
            { '$student.firstName$': { [sequelize_1.Op.like]: `%${search}%` } },
            { '$student.lastName$': { [sequelize_1.Op.like]: `%${search}%` } },
            { '$student.studentId$': { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    if (status && status !== "all") {
        where.status = status;
    }
    if (approvalStatus && approvalStatus !== "all") {
        where.approvalStatus = approvalStatus;
    }
    if (studentId) {
        where.studentId = studentId;
    }
    if (practicumId) {
        where.practicumId = practicumId;
    }
    if (date) {
        where.date = date;
    }
    else if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) {
            dateFilter[sequelize_1.Op.gte] = startDate;
        }
        if (endDate) {
            dateFilter[sequelize_1.Op.lte] = endDate;
        }
        where.date = dateFilter;
    }
    // instructor scoping handled via include-level where below
    const { count, rows } = await attendance_record_1.default.findAndCountAll({
        where,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
        subQuery: false,
        distinct: true,
        include: [
            {
                model: user_1.default,
                as: "student",
                attributes: ["id", "firstName", "lastName", "email", "studentId"],
                required: true,
                include: [
                    {
                        model: student_enrollment_1.default,
                        as: "enrollments",
                        attributes: [],
                        required: !!instructorId,
                        include: [
                            {
                                model: section_1.default,
                                as: "section",
                                attributes: [],
                                required: !!instructorId,
                                where: instructorId ? { instructorId } : undefined,
                            },
                        ],
                    },
                ],
            },
            {
                model: practicum_1.default,
                as: "practicum",
                include: [
                    {
                        model: agency_1.default,
                        as: "agency",
                        attributes: ["id", "name", "address", "branchType", "openingTime", "closingTime", "operatingDays", "lunchStartTime", "lunchEndTime", "contactPerson", "contactRole", "contactPhone", "contactEmail"]
                    }
                ]
            },
        ],
    });
    return {
        attendance: rows,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            totalItems: count,
            itemsPerPage: limit,
        },
    };
};
exports.getAttendanceListData = getAttendanceListData;
const findAttendanceByIdData = async (id) => {
    const record = await attendance_record_1.default.findByPk(id, {
        include: [
            { model: user_1.default, as: "student", attributes: ["id", "firstName", "lastName", "email", "studentId"] },
            {
                model: practicum_1.default,
                as: "practicum",
                include: [
                    {
                        model: agency_1.default,
                        as: "agency",
                        attributes: ["id", "name", "address", "branchType", "openingTime", "closingTime", "operatingDays", "lunchStartTime", "lunchEndTime", "contactPerson", "contactRole", "contactPhone", "contactEmail"]
                    }
                ]
            },
        ],
    });
    return record;
};
exports.findAttendanceByIdData = findAttendanceByIdData;
// Helper function to check if a date is an operating day
const checkOperatingDay = (agency, date) => {
    if (!agency?.operatingDays)
        return true; // If no operating days set, allow all days
    const dayName = date.toLocaleDateString(undefined, { weekday: "long" });
    const operatingDays = agency.operatingDays.split(",").map(d => d.trim());
    return operatingDays.includes(dayName);
};
exports.checkOperatingDay = checkOperatingDay;
// Helper function to check if time is within operating hours for a session
// Note: Time-based restrictions are handled by the frontend, which marks late/early clock-ins in remarks.
// This function now allows all clock-ins regardless of time, as early and late clock-ins are permitted.
const checkOperatingHours = (agency, currentTime, sessionType) => {
    // Allow all clock-ins regardless of time
    // The frontend handles time-based logic and marks late/early clock-ins in the remarks field
    // Operating day validation is handled separately by checkOperatingDay
    return { valid: true };
};
exports.checkOperatingHours = checkOperatingHours;
// Helper function to calculate hours excluding lunch time
const calculateHoursWithLunchExclusion = (morningTimeIn, morningTimeOut, afternoonTimeIn, afternoonTimeOut, lunchStartTime, lunchEndTime) => {
    let totalHours = 0;
    // Calculate morning hours
    if (morningTimeIn && morningTimeOut) {
        const morningMs = new Date(morningTimeOut).getTime() - new Date(morningTimeIn).getTime();
        totalHours += Math.max(0, morningMs / (1000 * 60 * 60));
    }
    // Calculate afternoon hours
    if (afternoonTimeIn && afternoonTimeOut) {
        const afternoonMs = new Date(afternoonTimeOut).getTime() - new Date(afternoonTimeIn).getTime();
        totalHours += Math.max(0, afternoonMs / (1000 * 60 * 60));
    }
    // Lunch time is automatically excluded since we calculate morning and afternoon separately
    return Math.round(totalHours * 100) / 100;
};
exports.calculateHoursWithLunchExclusion = calculateHoursWithLunchExclusion;
// Helper function to nullify incomplete sessions at end of day
const nullifyIncompleteSessions = async (studentId, practicumId, date) => {
    const record = await attendance_record_1.default.findOne({
        where: {
            studentId,
            practicumId,
            date: date,
        },
    });
    if (!record)
        return;
    const updates = {};
    // Nullify morning session if clocked in but not out
    if (record.morningTimeIn && !record.morningTimeOut) {
        updates.morningTimeIn = null;
    }
    // Nullify afternoon session if clocked in but not out
    if (record.afternoonTimeIn && !record.afternoonTimeOut) {
        updates.afternoonTimeIn = null;
    }
    if (Object.keys(updates).length > 0) {
        await record.update(updates);
    }
};
exports.nullifyIncompleteSessions = nullifyIncompleteSessions;
const clockInData = async (params) => {
    const now = new Date();
    const recordDate = params.date ? new Date(params.date) : new Date(now.toISOString().slice(0, 10));
    const day = params.day ?? recordDate.toLocaleDateString(undefined, { weekday: "long" });
    const sessionType = params.sessionType || "morning"; // Default to morning for backward compatibility
    // Validate operating day
    if (params.agency) {
        if (!(0, exports.checkOperatingDay)(params.agency, recordDate)) {
            throw new Error(`Today (${day}) is not an operating day. Operating days: ${params.agency.operatingDays || "Not set"}`);
        }
        // Validate operating hours
        const hoursCheck = (0, exports.checkOperatingHours)(params.agency, now, sessionType);
        if (!hoursCheck.valid) {
            throw new Error(hoursCheck.message || "Clock-in time is outside operating hours");
        }
    }
    let record = await attendance_record_1.default.findOne({
        where: {
            studentId: params.studentId,
            practicumId: params.practicumId,
            date: recordDate,
        },
    });
    const updateData = {
        latitude: params.latitude ?? null,
        longitude: params.longitude ?? null,
        address: params.address ?? null,
        timeInLocationType: params.locationType ?? null,
        timeInDeviceType: params.deviceType ?? null,
        timeInDeviceUnit: params.deviceUnit ?? null,
        timeInMacAddress: params.macAddress ?? null,
        timeInRemarks: params.remarks ?? "Normal",
        approvalStatus: "Approved",
        photoIn: params.photoUrl ?? null,
        sessionType: sessionType === "morning" || sessionType === "afternoon" ? sessionType : "full_day",
    };
    if (sessionType === "morning") {
        // Check if already clocked in for morning
        if (record?.morningTimeIn && !record.morningTimeOut) {
            throw new Error("You are already clocked in for the morning session. Please clock out first.");
        }
        updateData.morningTimeIn = now;
        updateData.timeIn = now; // Keep for backward compatibility
    }
    else if (sessionType === "afternoon") {
        // Check if already clocked in for afternoon
        if (record?.afternoonTimeIn && !record.afternoonTimeOut) {
            throw new Error("You are already clocked in for the afternoon session. Please clock out first.");
        }
        // Ensure morning session is completed or nullified
        if (record?.morningTimeIn && !record.morningTimeOut) {
            // Nullify incomplete morning session
            updateData.morningTimeIn = null;
        }
        updateData.afternoonTimeIn = now;
        updateData.timeIn = now; // Keep for backward compatibility
    }
    if (!record) {
        updateData.studentId = params.studentId;
        updateData.practicumId = params.practicumId;
        updateData.date = recordDate;
        updateData.day = day;
        updateData.status = params.remarks === "Late" ? "late" : "present";
        record = await attendance_record_1.default.create(updateData);
    }
    else {
        updateData.status = params.remarks === "Late" ? "late" : record.status ?? "present";
        await record.update(updateData);
    }
    // Create detailed log entry
    await detailed_attendance_log_1.default.create({
        attendanceRecordId: record.id,
        sessionType: sessionType,
        photoIn: params.photoUrl ?? null,
        timeInLocationType: params.locationType ?? "Inside",
        timeInDeviceType: params.deviceType ?? "Desktop",
        timeInDeviceUnit: params.deviceUnit ?? null,
        timeInMacAddress: params.macAddress ?? null,
        timeInRemarks: params.remarks ?? "Normal",
        timeInExactLocation: params.address ?? null,
        status: "Approved",
    });
    return record;
};
exports.clockInData = clockInData;
const clockOutData = async (params) => {
    const now = new Date();
    const recordDate = params.date ? new Date(params.date) : new Date(now.toISOString().slice(0, 10));
    const sessionType = params.sessionType || "morning"; // Default to morning for backward compatibility
    const record = await attendance_record_1.default.findOne({
        where: {
            studentId: params.studentId,
            practicumId: params.practicumId,
            date: recordDate,
        },
    });
    if (!record) {
        throw new Error("No attendance record found for today to clock out");
    }
    // Validate operating hours
    if (params.agency) {
        const hoursCheck = (0, exports.checkOperatingHours)(params.agency, now, sessionType);
        if (!hoursCheck.valid) {
            throw new Error(hoursCheck.message || "Clock-out time is outside operating hours");
        }
    }
    const updateData = {
        timeOutLocationType: params.locationType ?? record.timeOutLocationType ?? null,
        timeOutDeviceType: params.deviceType ?? record.timeOutDeviceType ?? null,
        timeOutDeviceUnit: params.deviceUnit ?? record.timeOutDeviceUnit ?? null,
        timeOutMacAddress: params.macAddress ?? record.timeOutMacAddress ?? null,
        timeOutRemarks: params.remarks ?? record.timeOutRemarks ?? "Normal",
        approvalStatus: "Approved",
        photoOut: params.photoUrl ?? record.photoOut ?? null,
        latitude: params.latitude ?? record.latitude ?? null,
        longitude: params.longitude ?? record.longitude ?? null,
        address: params.address ?? record.address ?? null,
    };
    if (sessionType === "morning") {
        // Check if clocked in for morning
        if (!record.morningTimeIn) {
            throw new Error("You must clock in for the morning session before clocking out");
        }
        if (record.morningTimeOut) {
            throw new Error("You have already clocked out for the morning session");
        }
        updateData.morningTimeOut = now;
        updateData.timeOut = now; // Keep for backward compatibility
    }
    else if (sessionType === "afternoon") {
        // Check if clocked in for afternoon
        if (!record.afternoonTimeIn) {
            throw new Error("You must clock in for the afternoon session before clocking out");
        }
        if (record.afternoonTimeOut) {
            throw new Error("You have already clocked out for the afternoon session");
        }
        updateData.afternoonTimeOut = now;
        updateData.timeOut = now; // Keep for backward compatibility
    }
    // Calculate total hours excluding lunch
    const totalHours = (0, exports.calculateHoursWithLunchExclusion)(record.morningTimeIn || updateData.morningTimeIn || null, updateData.morningTimeOut || record.morningTimeOut || null, record.afternoonTimeIn || updateData.afternoonTimeIn || null, updateData.afternoonTimeOut || record.afternoonTimeOut || null, params.agency?.lunchStartTime, params.agency?.lunchEndTime);
    updateData.hours = totalHours;
    await record.update(updateData);
    // Update detailed log entry
    const detailedLog = await detailed_attendance_log_1.default.findOne({
        where: {
            attendanceRecordId: record.id,
            sessionType: sessionType,
        },
        order: [["createdAt", "DESC"]],
    });
    if (detailedLog) {
        await detailedLog.update({
            photoOut: params.photoUrl ?? null,
            timeOutLocationType: params.locationType ?? null,
            timeOutDeviceType: params.deviceType ?? null,
            timeOutDeviceUnit: params.deviceUnit ?? null,
            timeOutMacAddress: params.macAddress ?? null,
            timeOutRemarks: params.remarks ?? "Normal",
            timeOutExactLocation: params.address ?? null,
        });
    }
    return record;
};
exports.clockOutData = clockOutData;
// approval workflow removed per product decision
