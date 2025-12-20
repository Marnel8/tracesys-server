"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clockOutData = exports.clockInData = exports.nullifyIncompleteSessions = exports.calculateHoursWithLunchExclusion = exports.calculateLunchDuration = exports.calculateRemarks = exports.determineSessionType = exports.checkOperatingHours = exports.checkOperatingDay = exports.findAttendanceByIdData = exports.getAttendanceListData = void 0;
const sequelize_1 = require("sequelize");
const attendance_record_1 = __importDefault(require("../db/models/attendance-record.js"));
const detailed_attendance_log_1 = __importDefault(require("../db/models/detailed-attendance-log.js"));
const user_1 = __importDefault(require("../db/models/user.js"));
const practicum_1 = __importDefault(require("../db/models/practicum.js"));
const agency_1 = __importDefault(require("../db/models/agency.js"));
const student_enrollment_1 = __importDefault(require("../db/models/student-enrollment.js"));
const section_1 = __importDefault(require("../db/models/section.js"));
const getAttendanceListData = async (params) => {
    const { page, limit, search, status, approvalStatus, studentId, practicumId, date, startDate, endDate, instructorId, } = params;
    const offset = (page - 1) * limit;
    const where = {};
    if (search?.trim()) {
        where[sequelize_1.Op.or] = [
            { day: { [sequelize_1.Op.like]: `%${search}%` } },
            { "$student.firstName$": { [sequelize_1.Op.like]: `%${search}%` } },
            { "$student.lastName$": { [sequelize_1.Op.like]: `%${search}%` } },
            { "$student.studentId$": { [sequelize_1.Op.like]: `%${search}%` } },
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
                attributes: [
                    "id",
                    "firstName",
                    "lastName",
                    "email",
                    "studentId",
                    "gender",
                ],
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
                        attributes: [
                            "id",
                            "name",
                            "address",
                            "branchType",
                            "openingTime",
                            "closingTime",
                            "operatingDays",
                            "lunchStartTime",
                            "lunchEndTime",
                            "contactPerson",
                            "contactRole",
                            "contactPhone",
                            "contactEmail",
                        ],
                    },
                ],
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
            {
                model: user_1.default,
                as: "student",
                attributes: [
                    "id",
                    "firstName",
                    "lastName",
                    "email",
                    "studentId",
                    "gender",
                ],
            },
            {
                model: practicum_1.default,
                as: "practicum",
                include: [
                    {
                        model: agency_1.default,
                        as: "agency",
                        attributes: [
                            "id",
                            "name",
                            "address",
                            "branchType",
                            "openingTime",
                            "closingTime",
                            "operatingDays",
                            "lunchStartTime",
                            "lunchEndTime",
                            "contactPerson",
                            "contactRole",
                            "contactPhone",
                            "contactEmail",
                        ],
                    },
                ],
            },
            {
                model: detailed_attendance_log_1.default,
                as: "detailedLogs",
                attributes: ["id", "sessionType", "photoIn", "photoOut"],
                required: false,
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
    // Ensure we have a valid date object
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        return true; // If invalid date, allow (fail open)
    }
    // Use "en-US" locale with server's local timezone to match client-side formatting
    // This ensures we get the correct day name in the server's timezone (Philippines = UTC+8)
    const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const dayName = date.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: serverTimeZone,
    });
    // Parse and normalize operating days (case-insensitive comparison)
    const operatingDaysRaw = String(agency.operatingDays).trim();
    // Split by comma and clean up each day name
    const operatingDays = operatingDaysRaw
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d.length > 0)
        .map((d) => d.toLowerCase());
    const normalizedDayName = dayName.toLowerCase().trim();
    // Debug: Log the comparison (remove in production if needed)
    console.log("[checkOperatingDay]", {
        date: date.toISOString(),
        localDate: date.toLocaleDateString("en-US", { timeZone: serverTimeZone }),
        dayName,
        normalizedDayName,
        operatingDaysRaw,
        operatingDays,
        serverTimeZone,
        isMatch: operatingDays.includes(normalizedDayName),
    });
    // Check if the normalized day name is in the operating days list
    return operatingDays.includes(normalizedDayName);
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
/**
 * Helper function to parse time string to minutes since midnight
 */
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr)
        return null;
    const parts = timeStr.split(":");
    if (parts.length < 2)
        return null;
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
};
/**
 * Determine session type based on server time and agency settings
 * This ensures session determination cannot be manipulated by client device time
 */
const determineSessionType = (agency, currentTime, existingRecord) => {
    // Check if regular sessions are complete (for overtime)
    const morningComplete = existingRecord?.morningTimeIn && existingRecord?.morningTimeOut;
    const afternoonComplete = existingRecord?.afternoonTimeIn && existingRecord?.afternoonTimeOut;
    // If both regular sessions are complete, allow overtime
    if (morningComplete && afternoonComplete) {
        // Check if overtime is already in progress or complete
        if (existingRecord?.overtimeTimeIn && !existingRecord?.overtimeTimeOut) {
            throw new Error("Overtime session is already in progress. Please clock out first.");
        }
        if (existingRecord?.overtimeTimeIn && existingRecord?.overtimeTimeOut) {
            throw new Error("Overtime session is already complete for today.");
        }
        return "overtime";
    }
    // Check for in-progress sessions
    const morningInProgress = existingRecord?.morningTimeIn && !existingRecord?.morningTimeOut;
    const afternoonInProgress = existingRecord?.afternoonTimeIn && !existingRecord?.afternoonTimeOut;
    // If any session is in progress, cannot clock in (must clock out first)
    if (morningInProgress || afternoonInProgress) {
        const inProgressSession = morningInProgress ? "morning" : "afternoon";
        throw new Error(`You have an active ${inProgressSession} session. Please clock out before clocking in again.`);
    }
    // If there's no morning clock-in yet, treat any clock-in as afternoon
    // This allows students to clock in early (e.g., 11 AM) as afternoon if they missed morning
    const hasMorningClockIn = !!existingRecord?.morningTimeIn;
    if (!hasMorningClockIn) {
        return "afternoon";
    }
    // Determine session based on lunch times (primary) or operating hours midpoint (fallback)
    const lunchStart = parseTimeToMinutes(agency?.lunchStartTime);
    const lunchEnd = parseTimeToMinutes(agency?.lunchEndTime);
    const opening = parseTimeToMinutes(agency?.openingTime);
    const closing = parseTimeToMinutes(agency?.closingTime);
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    if (lunchStart !== null) {
        // Use lunch start time as the divider between morning and afternoon
        // Handle lunch break that might span midnight
        if (lunchEnd !== null && lunchEnd < lunchStart) {
            // Lunch spans midnight (e.g., 11:00 PM - 1:00 AM)
            // Morning: between lunch end and lunch start
            // Afternoon: at/after lunch start OR before/at lunch end
            if (currentTimeMinutes > lunchEnd && currentTimeMinutes < lunchStart) {
                return "morning";
            }
            else {
                return "afternoon";
            }
        }
        else {
            // Normal lunch break
            // Morning: before lunch start
            // Afternoon: at/after lunch start (includes during lunch break)
            if (currentTimeMinutes < lunchStart) {
                return "morning";
            }
            else {
                return "afternoon";
            }
        }
    }
    else if (opening !== null && closing !== null) {
        // No lunch times, use midpoint of operating hours
        // Handle case where operating hours span midnight
        if (closing < opening) {
            // Operating hours span midnight (e.g., 12:00 AM - 5:00 AM)
            const totalMinutes = 24 * 60 - opening + closing;
            const midPoint = opening + totalMinutes / 2;
            // Adjust midpoint if it wraps past midnight
            if (midPoint >= 24 * 60) {
                const adjustedMidPoint = midPoint - 24 * 60;
                // Morning: from opening to adjusted midpoint (wrapping past midnight)
                // Afternoon: after adjusted midpoint to closing
                if (currentTimeMinutes >= opening ||
                    currentTimeMinutes <= adjustedMidPoint) {
                    return "morning";
                }
                else {
                    return "afternoon";
                }
            }
            else {
                // Midpoint doesn't wrap
                if (currentTimeMinutes >= opening && currentTimeMinutes < midPoint) {
                    return "morning";
                }
                else {
                    return "afternoon";
                }
            }
        }
        else {
            // Normal case: operating hours within same day
            const midPoint = opening + (closing - opening) / 2;
            return currentTimeMinutes < midPoint ? "morning" : "afternoon";
        }
    }
    // Default to morning if no time constraints
    return "morning";
};
exports.determineSessionType = determineSessionType;
/**
 * Calculate remarks (Late/Early Departure) based on server time
 * This ensures remarks cannot be manipulated by client device time
 */
const calculateRemarks = (agency, currentTime, sessionType, isClockIn) => {
    if (sessionType === "overtime") {
        return "Normal";
    }
    if (isClockIn) {
        // For clock-in: check if late
        if (sessionType === "morning" && agency?.openingTime) {
            const [hours, minutes] = agency.openingTime.split(":").map(Number);
            const expectedTime = new Date(currentTime);
            expectedTime.setHours(hours, minutes || 0, 0, 0);
            if (currentTime > expectedTime) {
                return "Late";
            }
        }
        else if (sessionType === "afternoon" && agency?.lunchEndTime) {
            // lunchEndTime is a reference point for determining if afternoon clock-in is late
            const [hours, minutes] = agency.lunchEndTime.split(":").map(Number);
            const expectedTime = new Date(currentTime);
            expectedTime.setHours(hours, minutes || 0, 0, 0);
            if (currentTime > expectedTime) {
                return "Late";
            }
        }
        return "Normal";
    }
    else {
        // For clock-out: check if early departure
        if (sessionType === "morning" && agency?.lunchStartTime) {
            // lunchStartTime is a reference point for determining if morning clock-out is early
            const [hours, minutes] = agency.lunchStartTime.split(":").map(Number);
            const expectedTime = new Date(currentTime);
            expectedTime.setHours(hours, minutes || 0, 0, 0);
            if (currentTime < expectedTime) {
                return "Early Departure";
            }
        }
        else if (sessionType === "afternoon" && agency?.closingTime) {
            const [hours, minutes] = agency.closingTime.split(":").map(Number);
            const expectedTime = new Date(currentTime);
            expectedTime.setHours(hours, minutes || 0, 0, 0);
            if (currentTime < expectedTime) {
                return "Early Departure";
            }
        }
        return "Normal";
    }
};
exports.calculateRemarks = calculateRemarks;
/**
 * Calculate the actual lunch break duration based on clock times.
 * Lunch duration is the time between morning clock-out and afternoon clock-in.
 *
 * @param morningTimeOut - Morning session clock-out time
 * @param afternoonTimeIn - Afternoon session clock-in time
 * @returns Lunch duration in hours, or null if either time is missing
 */
const calculateLunchDuration = (morningTimeOut, afternoonTimeIn) => {
    if (!morningTimeOut || !afternoonTimeIn) {
        return null;
    }
    const lunchMs = new Date(afternoonTimeIn).getTime() - new Date(morningTimeOut).getTime();
    const lunchHours = lunchMs / (1000 * 60 * 60);
    return Math.max(0, Math.round(lunchHours * 100) / 100);
};
exports.calculateLunchDuration = calculateLunchDuration;
/**
 * Calculate total work hours excluding lunch break.
 *
 * Lunch is automatically excluded by calculating morning and afternoon sessions separately.
 * The gap between morningTimeOut and afternoonTimeIn is the lunch break and is not included.
 *
 * @param morningTimeIn - Morning session clock-in time
 * @param morningTimeOut - Morning session clock-out time
 * @param afternoonTimeIn - Afternoon session clock-in time
 * @param afternoonTimeOut - Afternoon session clock-out time
 * @returns Total work hours (morning + afternoon), excluding lunch break
 */
const calculateHoursWithLunchExclusion = (morningTimeIn, morningTimeOut, afternoonTimeIn, afternoonTimeOut) => {
    let totalHours = 0;
    // Calculate morning hours
    if (morningTimeIn && morningTimeOut) {
        const morningMs = new Date(morningTimeOut).getTime() - new Date(morningTimeIn).getTime();
        totalHours += Math.max(0, morningMs / (1000 * 60 * 60));
    }
    // Calculate afternoon hours
    if (afternoonTimeIn && afternoonTimeOut) {
        const afternoonMs = new Date(afternoonTimeOut).getTime() -
            new Date(afternoonTimeIn).getTime();
        totalHours += Math.max(0, afternoonMs / (1000 * 60 * 60));
    }
    // Lunch time is automatically excluded since we calculate morning and afternoon separately
    // The gap between morningTimeOut and afternoonTimeIn is the lunch break
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
    // Nullify overtime session if clocked in but not out
    if (record.overtimeTimeIn && !record.overtimeTimeOut) {
        updates.overtimeTimeIn = null;
    }
    if (Object.keys(updates).length > 0) {
        await record.update(updates);
    }
};
exports.nullifyIncompleteSessions = nullifyIncompleteSessions;
const clockInData = async (params) => {
    const now = new Date();
    // Get server's local timezone
    const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    // SECURITY: Always use server date, ignore client-provided date to prevent manipulation
    // Get the local date components to ensure we're using the correct day
    const localDateStr = now.toLocaleDateString("en-CA", {
        timeZone: serverTimeZone,
    }); // YYYY-MM-DD format
    const [year, month, day] = localDateStr.split("-").map(Number);
    const recordDate = new Date(year, month - 1, day);
    // Use "en-US" locale with server's timezone to get the correct day name
    const dayName = recordDate.toLocaleDateString("en-US", {
        weekday: "long",
        timeZone: serverTimeZone,
    });
    // NOTE: Agency lunch times (lunchStartTime, lunchEndTime) are REFERENCE POINTS ONLY
    // They are used for session determination and remarks calculation,
    // NOT for hours calculation. Actual lunch duration is calculated dynamically as:
    // afternoonTimeIn - morningTimeOut
    // Get existing record first to determine session type
    let record = await attendance_record_1.default.findOne({
        where: {
            studentId: params.studentId,
            practicumId: params.practicumId,
            date: recordDate,
        },
    });
    // SECURITY: Determine session type on server side based on server time
    // This prevents client from manipulating device time to change session
    const sessionType = (0, exports.determineSessionType)(params.agency ?? null, now, record);
    // Validate operating day
    if (params.agency) {
        if (!(0, exports.checkOperatingDay)(params.agency, recordDate)) {
            // Format operating days for error message
            const operatingDaysList = params.agency.operatingDays
                ? String(params.agency.operatingDays)
                    .split(",")
                    .map((d) => d.trim())
                    .join(",")
                : "Not set";
            throw new Error(`Today (${dayName}) is not an operating day. Operating days: ${operatingDaysList}`);
        }
        // Validate operating hours
        const hoursCheck = (0, exports.checkOperatingHours)(params.agency, now, sessionType);
        if (!hoursCheck.valid) {
            throw new Error(hoursCheck.message || "Clock-in time is outside operating hours");
        }
    }
    // SECURITY: Calculate remarks on server side based on server time
    // This prevents client from manipulating device time to change remarks
    const remarks = (0, exports.calculateRemarks)(params.agency ?? null, now, sessionType, true);
    const updateData = {
        latitude: params.latitude ?? null,
        longitude: params.longitude ?? null,
        address: params.address ?? null,
        timeInLocationType: params.locationType ?? null,
        timeInDeviceType: params.deviceType ?? null,
        timeInDeviceUnit: params.deviceUnit ?? null,
        timeInMacAddress: params.macAddress ?? null,
        timeInRemarks: remarks,
        approvalStatus: "Approved",
        photoIn: params.photoUrl ?? null,
        sessionType: sessionType === "morning" ||
            sessionType === "afternoon" ||
            sessionType === "overtime"
            ? sessionType
            : "full_day",
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
    else if (sessionType === "overtime") {
        // Check if already clocked in for overtime
        if (record?.overtimeTimeIn && !record.overtimeTimeOut) {
            throw new Error("You are already clocked in for the overtime session. Please clock out first.");
        }
        // Ensure both morning and afternoon sessions are complete before allowing overtime
        const morningComplete = record?.morningTimeIn && record?.morningTimeOut;
        const afternoonComplete = record?.afternoonTimeIn && record?.afternoonTimeOut;
        if (!morningComplete || !afternoonComplete) {
            throw new Error("You must complete both morning and afternoon sessions before clocking in for overtime.");
        }
        updateData.overtimeTimeIn = now;
        updateData.timeIn = now; // Keep for backward compatibility
    }
    if (!record) {
        updateData.studentId = params.studentId;
        updateData.practicumId = params.practicumId;
        updateData.date = recordDate;
        updateData.day = dayName;
        updateData.status = "present";
        record = await attendance_record_1.default.create(updateData);
    }
    else {
        // Keep existing status if record exists, default to "present" if not set
        updateData.status = record.status ?? "present";
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
        timeInRemarks: remarks,
        timeInExactLocation: params.address ?? null,
        status: "Approved",
    });
    return record;
};
exports.clockInData = clockInData;
const clockOutData = async (params) => {
    const now = new Date();
    // SECURITY: Always use server date, ignore client-provided date to prevent manipulation
    const serverTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const localDateStr = now.toLocaleDateString("en-CA", {
        timeZone: serverTimeZone,
    }); // YYYY-MM-DD format
    const [year, month, day] = localDateStr.split("-").map(Number);
    const recordDate = new Date(year, month - 1, day);
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
    // SECURITY: Determine session type based on which session is in progress
    // This prevents client from manipulating device time to change session
    let sessionType;
    const morningInProgress = record.morningTimeIn && !record.morningTimeOut;
    const afternoonInProgress = record.afternoonTimeIn && !record.afternoonTimeOut;
    const overtimeInProgress = record.overtimeTimeIn && !record.overtimeTimeOut;
    if (overtimeInProgress) {
        sessionType = "overtime";
    }
    else if (afternoonInProgress) {
        sessionType = "afternoon";
    }
    else if (morningInProgress) {
        sessionType = "morning";
    }
    else {
        // Fallback: use client-provided sessionType if no session is in progress
        // This should rarely happen, but provides backward compatibility
        sessionType = params.sessionType || "morning";
    }
    // Validate operating hours
    if (params.agency) {
        const hoursCheck = (0, exports.checkOperatingHours)(params.agency, now, sessionType);
        if (!hoursCheck.valid) {
            throw new Error(hoursCheck.message || "Clock-out time is outside operating hours");
        }
    }
    // SECURITY: Calculate remarks on server side based on server time
    // This prevents client from manipulating device time to change remarks
    const remarks = (0, exports.calculateRemarks)(params.agency ?? null, now, sessionType, false);
    const updateData = {
        timeOutLocationType: params.locationType ?? record.timeOutLocationType ?? null,
        timeOutDeviceType: params.deviceType ?? record.timeOutDeviceType ?? null,
        timeOutDeviceUnit: params.deviceUnit ?? record.timeOutDeviceUnit ?? null,
        timeOutMacAddress: params.macAddress ?? record.timeOutMacAddress ?? null,
        timeOutRemarks: remarks,
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
    else if (sessionType === "overtime") {
        // Check if clocked in for overtime
        if (!record.overtimeTimeIn) {
            throw new Error("You must clock in for the overtime session before clocking out");
        }
        if (record.overtimeTimeOut) {
            throw new Error("You have already clocked out for the overtime session");
        }
        updateData.overtimeTimeOut = now;
        updateData.timeOut = now; // Keep for backward compatibility
    }
    // Calculate total hours excluding lunch
    // Lunch is automatically excluded by calculating morning and afternoon sessions separately
    const totalHours = (0, exports.calculateHoursWithLunchExclusion)(record.morningTimeIn || updateData.morningTimeIn || null, updateData.morningTimeOut || record.morningTimeOut || null, record.afternoonTimeIn || updateData.afternoonTimeIn || null, updateData.afternoonTimeOut || record.afternoonTimeOut || null);
    // Add overtime hours if present
    let overtimeHours = 0;
    const overtimeTimeIn = record.overtimeTimeIn || updateData.overtimeTimeIn || null;
    const overtimeTimeOut = record.overtimeTimeOut || updateData.overtimeTimeOut || null;
    if (overtimeTimeIn && overtimeTimeOut) {
        const overtimeMs = new Date(overtimeTimeOut).getTime() - new Date(overtimeTimeIn).getTime();
        overtimeHours = Math.max(0, overtimeMs / (1000 * 60 * 60));
    }
    updateData.hours = Math.round((totalHours + overtimeHours) * 100) / 100;
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
            timeOutRemarks: remarks,
            timeOutExactLocation: params.address ?? null,
        });
    }
    return record;
};
exports.clockOutData = clockOutData;
// approval workflow removed per product decision
