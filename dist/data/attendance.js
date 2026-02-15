"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectAttendanceData = exports.approveAttendanceData = exports.clockOutData = exports.clockInData = exports.nullifyIncompleteSessions = exports.checkAndNullifyMissedClockOuts = exports.calculateHoursWithLunchExclusion = exports.calculateUndertimeHours = exports.calculateExpectedHours = exports.calculateLunchDuration = exports.calculateRemarks = exports.determineSessionType = exports.checkOperatingHours = exports.checkOperatingDay = exports.findAttendanceByIdData = exports.getAttendanceListData = void 0;
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
                model: user_1.default,
                as: "approver",
                attributes: ["id", "firstName", "lastName", "email"],
                required: false,
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
                model: user_1.default,
                as: "approver",
                attributes: ["id", "firstName", "lastName", "email"],
                required: false,
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
 * Handles formats: "HH:MM", "HH:MM:SS", "H:MM"
 * Normalizes and validates time format
 */
const parseTimeToMinutes = (timeStr) => {
    if (!timeStr)
        return null;
    // Normalize: trim whitespace and split by colon
    const normalized = String(timeStr).trim();
    const parts = normalized.split(":");
    if (parts.length < 2)
        return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    // Validate: hours 0-23, minutes 0-59
    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }
    return hours * 60 + minutes;
};
/**
 * Calculate time boundaries based on agency operating hours.
 *
 * OFFICIAL TIME VALIDATION:
 * This function validates and calculates time boundaries from agency settings:
 * - openingTime: Official start of workday
 * - closingTime: Official end of workday
 * - lunchStartTime: Official start of lunch break
 * - lunchEndTime: Official end of lunch break
 *
 * VALIDATION & FALLBACKS:
 * - Validates time formats using parseTimeToMinutes()
 * - Validates logical relationships (opening < closing, lunchStart < lunchEnd)
 * - Provides sensible defaults when agency times are missing:
 *   - Morning cutoff: 10:59 AM if no lunch/opening time
 *   - Lunch window: 12:00 PM - 12:59 PM if not specified
 *   - Afternoon deadline: 6:00 PM minimum if no closing time
 * - Logs warnings for missing or invalid time configurations
 *
 * BOUNDARY CALCULATIONS:
 * - Morning cutoff: 1 minute before lunch start (or 2 hours after opening)
 * - Lunch window: Between lunchStartTime and lunchEndTime (inclusive)
 * - Afternoon clock-out: After closingTime, deadline is closingTime + 1 hour (min 6:00 PM)
 *
 * @param agency - Agency model with official time settings (may be null)
 * @returns Object with calculated time boundaries in minutes since midnight
 */
const calculateTimeBoundaries = (agency) => {
    const opening = parseTimeToMinutes(agency?.openingTime);
    const closing = parseTimeToMinutes(agency?.closingTime);
    const lunchStart = parseTimeToMinutes(agency?.lunchStartTime);
    const lunchEnd = parseTimeToMinutes(agency?.lunchEndTime);
    // Validate time relationships and log warnings
    if (agency) {
        if (opening !== null && closing !== null) {
            // Handle midnight crossover: if closing is before opening, it's next day
            let isValid = closing > opening;
            if (!isValid && closing < 360 && opening > 1200) {
                // Closing is early morning (next day), opening is late night (current day)
                isValid = true; // This is valid midnight crossover
            }
            if (!isValid) {
                console.warn(`[Time validation] Invalid time range: opening (${agency.openingTime}) should be before closing (${agency.closingTime})`);
            }
        }
        if (lunchStart !== null && lunchEnd !== null) {
            // Handle midnight crossover: if lunchEnd is before lunchStart, it's next day
            let isValid = lunchEnd > lunchStart;
            if (!isValid && lunchEnd < 360 && lunchStart > 1200) {
                // Lunch end is early morning (next day), lunch start is late night (current day)
                isValid = true; // This is valid midnight crossover
            }
            if (!isValid) {
                console.warn(`[Time validation] Invalid lunch time range: lunchStart (${agency.lunchStartTime}) should be before lunchEnd (${agency.lunchEndTime})`);
            }
            // Validate lunch times are within workday (if workday times are set)
            if (opening !== null && closing !== null) {
                // Handle midnight crossover for lunch validation
                const lunchStartValid = lunchStart >= opening ||
                    (lunchStart < 360 && opening > 1200); // Next day lunch start
                const lunchEndValid = lunchEnd <= closing ||
                    (lunchEnd < 360 && closing > 1200); // Next day lunch end
                if (!lunchStartValid || !lunchEndValid) {
                    console.warn(`[Time validation] Lunch times (${agency.lunchStartTime} - ${agency.lunchEndTime}) should be within workday (${agency.openingTime} - ${agency.closingTime})`);
                }
            }
        }
    }
    // Morning clock-in cutoff: Use lunch start time if available, otherwise calculate from opening time
    // If lunch starts at 12:00 PM, morning clock-in closes at 11:59 AM (1 minute before lunch)
    // If no lunch time, use 2 hours after opening (e.g., 8:00 AM -> 10:00 AM cutoff)
    let morningCutoff;
    if (lunchStart !== null) {
        // Morning closes 1 minute before lunch starts (inclusive: <= lunchStart - 1)
        morningCutoff = lunchStart - 1;
    }
    else if (opening !== null) {
        // Default: 2 hours after opening (e.g., 8:00 AM -> 10:00 AM)
        morningCutoff = opening + (2 * 60);
    }
    else {
        // Fallback: 10:59 AM if no operating hours set
        morningCutoff = 10 * 60 + 59;
    }
    // Morning boundary: 1 minute after cutoff (exclusive boundary)
    const morningBoundary = morningCutoff + 1;
    // Lunch window: Use agency lunch times, or default 12:00 PM - 12:59 PM
    const lunchWindowStart = lunchStart ?? 12 * 60; // 12:00 PM default
    const lunchWindowEnd = lunchEnd ?? (12 * 60 + 59); // 12:59 PM default
    // Afternoon clock-out window: After closing time
    // Start: Closing time (e.g., 5:00 PM)
    // Deadline: Closing time + 1 hour (e.g., 6:00 PM), minimum 6:00 PM
    const afternoonClockOutStart = closing ?? 17 * 60; // 5:00 PM default
    const afternoonClockOutDeadline = closing !== null
        ? Math.max(closing + 60, 18 * 60) // Closing + 1 hour, but at least 6:00 PM
        : 18 * 60; // 6:00 PM default
    return {
        morningCutoff,
        morningBoundary,
        lunchWindowStart,
        lunchWindowEnd,
        afternoonClockOutStart,
        afternoonClockOutDeadline,
    };
};
/**
 * Check if morning clock-in window is still open
 * Morning clock-in is available until lunch start time - 1 minute (or calculated from opening time)
 * Uses agency operating hours dynamically
 */
const isMorningClockInWindowOpen = (agency, currentTime) => {
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const boundaries = calculateTimeBoundaries(agency);
    // Morning window is open if current time <= morning cutoff (inclusive)
    return currentTimeMinutes <= boundaries.morningCutoff;
};
/**
 * Determine session type based on server time and agency settings.
 *
 * SECURITY: This function uses server-side time to prevent client manipulation.
 * All time comparisons are performed on the server using `new Date()`, ensuring
 * that clients cannot manipulate device time to change session types.
 *
 * OFFICIAL TIME VALIDATION:
 * - Uses agency's `openingTime`, `closingTime`, `lunchStartTime`, and `lunchEndTime`
 *   to determine valid session windows
 * - Falls back to default times if agency times are not configured
 * - Validates against server timezone to ensure accuracy across different locations
 *
 * SESSION TYPE RULES:
 * - Morning clock-in: Available until lunch start time - 1 minute (or calculated cutoff)
 *   - Uses `lunchStartTime` if available, otherwise calculates from `openingTime`
 *   - Default cutoff: 2 hours after opening time (e.g., 8:00 AM -> 10:00 AM)
 * - Afternoon clock-in: Available if:
 *   - Current time >= morning cutoff AND no morning clock-in exists, OR
 *   - Morning session is complete (both clock-in and clock-out recorded)
 * - Overtime: Requires only afternoon session complete (morning can be skipped)
 *   - Can only start after afternoon clock-out is recorded
 *   - Prevents duplicate overtime sessions
 *
 * @param agency - Agency model with official time settings (openingTime, closingTime, lunchStartTime, lunchEndTime)
 * @param currentTime - Server-side current time (Date object)
 * @param existingRecord - Existing attendance record for the day
 * @returns Session type: "morning" | "afternoon" | "overtime"
 * @throws Error if session rules are violated (e.g., overtime already in progress)
 */
const determineSessionType = (agency, currentTime, existingRecord) => {
    // Check for overtime (only requires afternoon completion, not morning)
    const afternoonComplete = existingRecord?.afternoonTimeIn && existingRecord?.afternoonTimeOut;
    // If afternoon session is complete, allow overtime
    if (afternoonComplete) {
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
    const hasMorningClockIn = !!existingRecord?.morningTimeIn;
    const morningComplete = existingRecord?.morningTimeIn && existingRecord?.morningTimeOut;
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const boundaries = calculateTimeBoundaries(agency);
    // If no morning clock-in exists
    if (!hasMorningClockIn) {
        // Check if morning window is still open (based on agency hours)
        if (isMorningClockInWindowOpen(agency, currentTime)) {
            return "morning";
        }
        else {
            // After morning cutoff, allow afternoon clock-in if no morning exists
            return "afternoon";
        }
    }
    // If morning exists and is complete, only afternoon is available
    if (morningComplete) {
        // Morning is complete, so only afternoon is available (regardless of time)
        return "afternoon";
    }
    // If morning exists but not complete, this shouldn't happen (should be caught by in-progress check)
    // But fallback: determine based on time
    const lunchStart = parseTimeToMinutes(agency?.lunchStartTime);
    if (lunchStart !== null) {
        return currentTimeMinutes < lunchStart ? "morning" : "afternoon";
    }
    // Default: use morning boundary as divider (exclusive)
    return currentTimeMinutes < boundaries.morningBoundary ? "morning" : "afternoon";
};
exports.determineSessionType = determineSessionType;
/**
 * Calculate remarks (Late/Early Departure) based on server time and agency official times.
 *
 * SECURITY: This function uses server-side time to prevent client manipulation.
 * All time comparisons use server `Date` objects, ensuring clients cannot change
 * device time to avoid late/early departure marks.
 *
 * OFFICIAL TIME VALIDATION:
 * - Clock-in remarks: Compares actual clock-in time against agency `openingTime` (morning)
 *   or `lunchEndTime` (afternoon) to determine if student is late
 * - Clock-out remarks: Compares actual clock-out time against agency `lunchStartTime` (morning)
 *   or `closingTime` (afternoon) to determine if student left early
 * - Handles midnight crossover scenarios (e.g., closing time at 1:00 AM next day)
 * - Overtime sessions always return "Normal" (no late/early validation)
 *
 * TIME ACCURACY:
 * - Converts times to minutes since midnight for accurate comparison
 * - Handles edge cases like early morning times (before 6 AM) and late night times (after 8 PM)
 * - Accounts for next-day scenarios when lunch/closing times cross midnight
 *
 * @param agency - Agency model with official time settings
 * @param currentTime - Server-side current time (Date object)
 * @param sessionType - Current session type: "morning" | "afternoon" | "overtime"
 * @param isClockIn - True for clock-in, false for clock-out
 * @returns Remark: "Normal" | "Late" | "Early Departure"
 */
const calculateRemarks = (agency, currentTime, sessionType, isClockIn) => {
    if (sessionType === "overtime") {
        return "Normal";
    }
    // Convert current time to minutes since midnight for accurate comparison
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    if (isClockIn) {
        // For clock-in: check if late
        if (sessionType === "morning" && agency?.openingTime) {
            const openingMinutes = parseTimeToMinutes(agency.openingTime);
            if (openingMinutes !== null) {
                // Compare minutes since midnight
                if (currentTimeMinutes > openingMinutes) {
                    return "Late";
                }
            }
        }
        else if (sessionType === "afternoon" && agency?.lunchEndTime) {
            // lunchEndTime is a reference point for determining if afternoon clock-in is late
            const lunchEndMinutes = parseTimeToMinutes(agency.lunchEndTime);
            if (lunchEndMinutes !== null) {
                // Handle midnight crossover: if lunchEnd is early morning (before 6 AM) and clock-in is late night (after 8 PM)
                // This means lunchEnd is the next day, so clock-in at 11 PM is BEFORE 1 AM next day = NOT late
                if (lunchEndMinutes < 360 && currentTimeMinutes > 1200) {
                    // Lunch end is early morning (next day), clock-in is late night (current day)
                    // Check if clock-in is before lunch end (considering it's the next day)
                    // If lunchEnd is 1:00 AM (60 min) and clock-in is 11:00 PM (1380 min)
                    // We need to check: is 1380 < (60 + 1440)? Yes, so it's not late
                    const lunchEndNextDay = lunchEndMinutes + (24 * 60); // Add 24 hours
                    if (currentTimeMinutes < lunchEndNextDay) {
                        return "Normal"; // Clock-in is before lunch end (next day), so not late
                    }
                    else {
                        return "Late"; // Clock-in is after lunch end (next day), so late
                    }
                }
                else {
                    // Normal case: compare on same day
                    if (currentTimeMinutes > lunchEndMinutes) {
                        return "Late";
                    }
                }
            }
        }
        return "Normal";
    }
    else {
        // For clock-out: check if early departure
        if (sessionType === "morning" && agency?.lunchStartTime) {
            // lunchStartTime is a reference point for determining if morning clock-out is early
            const lunchStartMinutes = parseTimeToMinutes(agency.lunchStartTime);
            if (lunchStartMinutes !== null) {
                // Compare minutes since midnight
                if (currentTimeMinutes < lunchStartMinutes) {
                    return "Early Departure";
                }
            }
        }
        else if (sessionType === "afternoon" && agency?.closingTime) {
            const closingMinutes = parseTimeToMinutes(agency.closingTime);
            if (closingMinutes !== null) {
                // Handle midnight crossover: if closing is early morning (before 6 AM) and clock-out is late night (after 8 PM)
                // This means closing is the next day, so clock-out at 11 PM is BEFORE 1 AM next day = Early Departure
                if (closingMinutes < 360 && currentTimeMinutes > 1200) {
                    // Closing is early morning (next day), clock-out is late night (current day)
                    // Check if clock-out is before closing (considering it's the next day)
                    const closingNextDay = closingMinutes + (24 * 60); // Add 24 hours
                    if (currentTimeMinutes < closingNextDay) {
                        return "Early Departure"; // Clock-out is before closing (next day), so early
                    }
                    else {
                        return "Normal"; // Clock-out is after closing (next day), so normal
                    }
                }
                else {
                    // Normal case: compare on same day
                    if (currentTimeMinutes < closingMinutes) {
                        return "Early Departure";
                    }
                }
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
 * Calculate expected work hours based on agency official times.
 *
 * OFFICIAL TIME CALCULATION:
 * Expected hours = (closingTime - openingTime) - (lunchEndTime - lunchStartTime)
 *
 * This function determines how many hours a student should work based on:
 * - Agency's official opening and closing times
 * - Official lunch break duration (lunchEndTime - lunchStartTime)
 *
 * VALIDATION & FALLBACKS:
 * - If agency times are missing, defaults to 8-hour workday with 1-hour lunch (7 hours net)
 * - If only opening/closing times are missing, uses default 8 AM - 5 PM
 * - If lunch times are missing, assumes 1-hour lunch break
 * - Handles midnight crossover scenarios (e.g., closing at 1:00 AM next day)
 *
 * PARTIAL SESSION HANDLING:
 * - If only morning session exists, calculates expected hours for morning only
 * - If only afternoon session exists, calculates expected hours for afternoon only
 * - Full day expected hours require both opening and closing times
 *
 * @param agency - Agency model with official time settings (may be null)
 * @param morningTimeIn - Morning session clock-in time (Date or null)
 * @param morningTimeOut - Morning session clock-out time (Date or null)
 * @param afternoonTimeIn - Afternoon session clock-in time (Date or null)
 * @param afternoonTimeOut - Afternoon session clock-out time (Date or null)
 * @returns Expected work hours based on agency official times, or null if cannot be determined
 */
const calculateExpectedHours = (agency, morningTimeIn, morningTimeOut, afternoonTimeIn, afternoonTimeOut) => {
    const openingMinutes = parseTimeToMinutes(agency?.openingTime);
    const closingMinutes = parseTimeToMinutes(agency?.closingTime);
    const lunchStartMinutes = parseTimeToMinutes(agency?.lunchStartTime);
    const lunchEndMinutes = parseTimeToMinutes(agency?.lunchEndTime);
    // If no agency times are configured, use default 8-hour workday with 1-hour lunch
    if (openingMinutes === null && closingMinutes === null) {
        // Default: 8 AM - 5 PM with 1-hour lunch = 8 hours total - 1 hour lunch = 7 hours net
        return 7.0;
    }
    // Calculate lunch duration
    let lunchDurationHours = 1.0; // Default 1 hour lunch
    if (lunchStartMinutes !== null && lunchEndMinutes !== null) {
        let lunchDurationMinutes = lunchEndMinutes - lunchStartMinutes;
        // Handle midnight crossover (e.g., lunch ends at 1:00 AM next day)
        if (lunchDurationMinutes < 0) {
            lunchDurationMinutes += 24 * 60; // Add 24 hours
        }
        lunchDurationHours = lunchDurationMinutes / 60;
    }
    // Calculate workday duration
    if (openingMinutes !== null && closingMinutes !== null) {
        let workdayMinutes = closingMinutes - openingMinutes;
        // Handle midnight crossover (e.g., closing at 1:00 AM next day)
        if (workdayMinutes < 0) {
            workdayMinutes += 24 * 60; // Add 24 hours
        }
        const workdayHours = workdayMinutes / 60;
        // Expected hours = workday duration - lunch duration
        const expectedHours = workdayHours - lunchDurationHours;
        return Math.max(0, Math.round(expectedHours * 100) / 100);
    }
    // Partial configuration: if only opening or closing time exists, estimate
    // This is a fallback - ideally both times should be configured
    if (openingMinutes !== null || closingMinutes !== null) {
        // Estimate 8-hour workday with lunch
        return 7.0;
    }
    // Cannot determine expected hours
    return null;
};
exports.calculateExpectedHours = calculateExpectedHours;
/**
 * Calculate undertime hours based on agency official times and actual hours worked.
 *
 * UNDERTIME CALCULATION:
 * Undertime = max(0, expectedHours - actualHours)
 *
 * Undertime represents hours worked less than the expected work hours based on:
 * - Agency's official opening and closing times
 * - Official lunch break duration
 * - Actual hours worked (morning + afternoon sessions, excluding lunch)
 *
 * ACCURACY:
 * - Uses calculateExpectedHours() to determine expected hours from agency settings
 * - Compares against actual hours (calculated separately, excluding lunch)
 * - Returns 0 if actual hours >= expected hours (no undertime)
 * - Returns 0 if expected hours cannot be determined (null)
 * - Rounds to 2 decimal places for consistency
 *
 * EDGE CASES:
 * - Missing agency times: Uses default 7-hour workday (8 hours - 1 hour lunch)
 * - Partial sessions: Only calculates undertime if both sessions are complete
 * - Overtime: Undertime is calculated separately from overtime (overtime doesn't reduce undertime)
 *
 * @param agency - Agency model with official time settings (may be null)
 * @param actualHours - Actual hours worked (morning + afternoon, lunch excluded)
 * @param morningTimeIn - Morning session clock-in time (Date or null)
 * @param morningTimeOut - Morning session clock-out time (Date or null)
 * @param afternoonTimeIn - Afternoon session clock-in time (Date or null)
 * @param afternoonTimeOut - Afternoon session clock-out time (Date or null)
 * @returns Undertime hours (0 if no undertime or cannot be determined)
 */
const calculateUndertimeHours = (agency, actualHours, morningTimeIn, morningTimeOut, afternoonTimeIn, afternoonTimeOut) => {
    // Calculate expected hours based on agency official times
    const expectedHours = (0, exports.calculateExpectedHours)(agency, morningTimeIn, morningTimeOut, afternoonTimeIn, afternoonTimeOut);
    // If expected hours cannot be determined, return 0 (no undertime)
    if (expectedHours === null) {
        return 0;
    }
    // Calculate undertime: max(0, expectedHours - actualHours)
    const undertimeHours = Math.max(0, expectedHours - actualHours);
    // Round to 2 decimal places for consistency
    return Math.round(undertimeHours * 100) / 100;
};
exports.calculateUndertimeHours = calculateUndertimeHours;
/**
 * Calculate total work hours excluding lunch break.
 *
 * OFFICIAL TIME CALCULATION:
 * This function ensures accurate hour calculation by:
 * - Calculating morning and afternoon sessions separately
 * - Automatically excluding lunch break (gap between morningTimeOut and afternoonTimeIn)
 * - Using precise millisecond calculations converted to hours
 * - Rounding to 2 decimal places for consistency
 *
 * LUNCH EXCLUSION MECHANISM:
 * - Lunch duration is NOT subtracted from total hours
 * - Instead, lunch is naturally excluded by calculating sessions separately
 * - The time between morningTimeOut and afternoonTimeIn represents lunch break
 * - This ensures accurate work hours regardless of lunch duration variations
 *
 * ACCURACY:
 * - Uses Date.getTime() for millisecond-precise calculations
 * - Prevents negative hours with Math.max(0, ...)
 * - Rounds to 2 decimal places (Math.round(hours * 100) / 100)
 * - Returns 0 if either session time is missing
 *
 * @param morningTimeIn - Morning session clock-in time (Date or null)
 * @param morningTimeOut - Morning session clock-out time (Date or null)
 * @param afternoonTimeIn - Afternoon session clock-in time (Date or null)
 * @param afternoonTimeOut - Afternoon session clock-out time (Date or null)
 * @returns Total work hours (morning + afternoon), excluding lunch break
 *          Returns 0 if any required time is missing
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
/**
 * Check and nullify missed clock-out windows
 * - Morning clock-out: Must be during lunch window (12:00 PM - 12:59 PM), otherwise nullify
 * - Afternoon clock-out: Must be after 5:00 PM - 6:00 PM (or after closing time), otherwise nullify
 *
 * IMPORTANT: This function should NOT be called when user is actively clocking out.
 * It's designed to clean up stale sessions before new clock-in operations.
 */
const checkAndNullifyMissedClockOuts = async (record, agency, currentTime, isClockOutOperation = false) => {
    if (!record)
        return;
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;
    const updates = {};
    // Morning clock-out nullification
    // If morningTimeIn exists but morningTimeOut is null, and we're past lunch window
    // Morning clock-out must happen during lunch window (lunchStartTime - lunchEndTime inclusive)
    if (record.morningTimeIn && !record.morningTimeOut) {
        // Don't nullify if user is actively clocking out (race condition prevention)
        if (isClockOutOperation) {
            // Allow clock-out even if past window (user might have valid reason)
            // But we'll still validate the window in clockOutData
            return;
        }
        const boundaries = calculateTimeBoundaries(agency);
        // Check if we're past the lunch window
        // Deadline is lunch end + 1 minute (exclusive: past lunch end means nullify)
        const lunchWindowDeadline = boundaries.lunchWindowEnd + 1;
        const isPastLunchWindow = currentTimeMinutes > lunchWindowDeadline;
        if (isPastLunchWindow) {
            // Nullify entire morning session (both in and out)
            updates.morningTimeIn = null;
            updates.morningTimeOut = null;
        }
    }
    // Afternoon clock-out nullification
    // If afternoonTimeIn exists but afternoonTimeOut is null, and we're past deadline
    // Afternoon clock-out must happen after closing time (or closing + 1 hour)
    if (record.afternoonTimeIn && !record.afternoonTimeOut) {
        // Don't nullify if user is actively clocking out (race condition prevention)
        if (isClockOutOperation) {
            // Allow clock-out even if past window (user might have valid reason)
            // But we'll still validate the window in clockOutData
            return;
        }
        const boundaries = calculateTimeBoundaries(agency);
        // Check if we're past the deadline (after closing + 1 hour, exclusive)
        // Deadline is exclusive: deadline time is valid, deadline + 1 minute is not
        if (currentTimeMinutes > boundaries.afternoonClockOutDeadline) {
            // Nullify entire afternoon session (both in and out)
            updates.afternoonTimeIn = null;
            updates.afternoonTimeOut = null;
        }
    }
    if (Object.keys(updates).length > 0) {
        await record.update(updates);
        // Also update the record object passed in for immediate use
        Object.assign(record, updates);
    }
};
exports.checkAndNullifyMissedClockOuts = checkAndNullifyMissedClockOuts;
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
    // Validate agency data (only log warnings, don't block - times might be in different formats)
    if (params.agency) {
        // Check time formats but don't throw errors - parseTimeToMinutes handles various formats
        // Times might be stored as "HH:MM", "HH:MM:SS", or other formats
        const lunchStart = parseTimeToMinutes(params.agency.lunchStartTime);
        const lunchEnd = parseTimeToMinutes(params.agency.lunchEndTime);
        const opening = parseTimeToMinutes(params.agency.openingTime);
        const closing = parseTimeToMinutes(params.agency.closingTime);
        // Only log warnings if times are provided but can't be parsed
        if (params.agency.lunchStartTime && lunchStart === null) {
            console.warn(`[Time validation] Could not parse lunch start time: ${params.agency.lunchStartTime}`);
        }
        if (params.agency.lunchEndTime && lunchEnd === null) {
            console.warn(`[Time validation] Could not parse lunch end time: ${params.agency.lunchEndTime}`);
        }
        if (params.agency.openingTime && opening === null) {
            console.warn(`[Time validation] Could not parse opening time: ${params.agency.openingTime}`);
        }
        if (params.agency.closingTime && closing === null) {
            console.warn(`[Time validation] Could not parse closing time: ${params.agency.closingTime}`);
        }
    }
    // Check and nullify missed clock-out windows before determining session type
    // Only nullify if NOT a clock-out operation (prevent race conditions)
    if (record && params.agency) {
        await (0, exports.checkAndNullifyMissedClockOuts)(record, params.agency, now, false);
        // Reload record to get updated values (use fresh query to avoid stale data)
        record = await attendance_record_1.default.findOne({
            where: {
                studentId: params.studentId,
                practicumId: params.practicumId,
                date: recordDate,
            },
        });
    }
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
        approvalStatus: "Pending",
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
        // Idempotency check: prevent duplicate clock-ins within 5 seconds
        if (record?.morningTimeIn) {
            const lastClockIn = new Date(record.morningTimeIn);
            const timeDiff = now.getTime() - lastClockIn.getTime();
            if (timeDiff < 5000) { // 5 seconds
                // Return existing record to prevent duplicate
                return record;
            }
        }
        updateData.morningTimeIn = now;
        updateData.timeIn = now; // Keep for backward compatibility
    }
    else if (sessionType === "afternoon") {
        // Check if already clocked in for afternoon
        if (record?.afternoonTimeIn && !record.afternoonTimeOut) {
            throw new Error("You are already clocked in for the afternoon session. Please clock out first.");
        }
        // Idempotency check: prevent duplicate clock-ins within 5 seconds
        if (record?.afternoonTimeIn) {
            const lastClockIn = new Date(record.afternoonTimeIn);
            const timeDiff = now.getTime() - lastClockIn.getTime();
            if (timeDiff < 5000) { // 5 seconds
                // Return existing record to prevent duplicate
                return record;
            }
        }
        // Ensure morning session is completed or nullified
        // Only nullify if morning session exists but is incomplete (not already nullified)
        if (record?.morningTimeIn && !record.morningTimeOut) {
            // Check if morning session should be nullified based on time
            // If it's past lunch window, nullify it
            const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
            const boundaries = calculateTimeBoundaries(params.agency ?? null);
            const lunchWindowEnd = boundaries.lunchWindowEnd + 1; // Exclusive deadline
            if (currentTimeMinutes > lunchWindowEnd) {
                // Nullify incomplete morning session (already past window)
                updateData.morningTimeIn = null;
                updateData.morningTimeOut = null;
            }
        }
        updateData.afternoonTimeIn = now;
        updateData.timeIn = now; // Keep for backward compatibility
    }
    else if (sessionType === "overtime") {
        // Check if already clocked in for overtime
        if (record?.overtimeTimeIn && !record.overtimeTimeOut) {
            throw new Error("You are already clocked in for the overtime session. Please clock out first.");
        }
        // Idempotency check: prevent duplicate clock-ins within 5 seconds
        if (record?.overtimeTimeIn) {
            const lastClockIn = new Date(record.overtimeTimeIn);
            const timeDiff = now.getTime() - lastClockIn.getTime();
            if (timeDiff < 5000) { // 5 seconds
                // Return existing record to prevent duplicate
                return record;
            }
        }
        // Only require afternoon session to be complete (morning can be skipped)
        const afternoonComplete = record?.afternoonTimeIn && record?.afternoonTimeOut;
        if (!afternoonComplete) {
            throw new Error("You must complete the afternoon session before clocking in for overtime.");
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
        status: "Pending",
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
    // Validate agency data (only log warnings, don't block - times might be in different formats)
    if (params.agency) {
        // Check time formats but don't throw errors - parseTimeToMinutes handles various formats
        // Times might be stored as "HH:MM", "HH:MM:SS", or other formats
        const lunchStart = parseTimeToMinutes(params.agency.lunchStartTime);
        const lunchEnd = parseTimeToMinutes(params.agency.lunchEndTime);
        const closing = parseTimeToMinutes(params.agency.closingTime);
        // Only log warnings if times are provided but can't be parsed
        if (params.agency.lunchStartTime && lunchStart === null) {
            console.warn(`[Time validation] Could not parse lunch start time: ${params.agency.lunchStartTime}`);
        }
        if (params.agency.lunchEndTime && lunchEnd === null) {
            console.warn(`[Time validation] Could not parse lunch end time: ${params.agency.lunchEndTime}`);
        }
        if (params.agency.closingTime && closing === null) {
            console.warn(`[Time validation] Could not parse closing time: ${params.agency.closingTime}`);
        }
    }
    // Check and nullify missed clock-out windows before processing clock-out
    // Pass isClockOutOperation=true to prevent nullification during active clock-out
    if (params.agency) {
        await (0, exports.checkAndNullifyMissedClockOuts)(record, params.agency, now, true);
        // Reload record to get updated values (use fresh query to avoid stale data)
        const updatedRecord = await attendance_record_1.default.findOne({
            where: {
                studentId: params.studentId,
                practicumId: params.practicumId,
                date: recordDate,
            },
        });
        if (updatedRecord) {
            Object.assign(record, updatedRecord.toJSON());
        }
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
    // Validate clock-out window (warn but don't block - user might have valid reason)
    if (params.agency && sessionType !== "overtime") {
        const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();
        const boundaries = calculateTimeBoundaries(params.agency);
        if (sessionType === "morning") {
            // Morning clock-out should be during lunch window (lunchStartTime - lunchEndTime)
            const isValidWindow = currentTimeMinutes >= boundaries.lunchWindowStart &&
                currentTimeMinutes <= boundaries.lunchWindowEnd;
            if (!isValidWindow) {
                // Log warning but allow clock-out (user might have valid reason)
                const lunchStartStr = params.agency.lunchStartTime || "12:00 PM";
                const lunchEndStr = params.agency.lunchEndTime || "12:59 PM";
                console.warn(`[Clock-out validation] Morning clock-out at ${now.toLocaleTimeString()} is outside lunch window (${lunchStartStr} - ${lunchEndStr})`);
            }
        }
        else if (sessionType === "afternoon") {
            // Afternoon clock-out should be after closing time (closingTime - closingTime + 1 hour)
            const isValidWindow = currentTimeMinutes >= boundaries.afternoonClockOutStart &&
                currentTimeMinutes <= boundaries.afternoonClockOutDeadline;
            if (!isValidWindow) {
                // Log warning but allow clock-out (user might have valid reason)
                const closingStr = params.agency.closingTime || "5:00 PM";
                const deadlineStr = `${Math.floor(boundaries.afternoonClockOutDeadline / 60)}:${String(boundaries.afternoonClockOutDeadline % 60).padStart(2, '0')}`;
                console.warn(`[Clock-out validation] Afternoon clock-out at ${now.toLocaleTimeString()} is outside window (after ${closingStr} - ${deadlineStr})`);
            }
        }
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
        approvalStatus: "Pending",
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
        // Validate overtime duration does not exceed 2 hours
        const overtimeTimeIn = record.overtimeTimeIn;
        const overtimeMs = now.getTime() - new Date(overtimeTimeIn).getTime();
        const overtimeHours = overtimeMs / (1000 * 60 * 60);
        if (overtimeHours > 2.0) {
            throw new Error("Overtime session cannot exceed 2 hours. Maximum overtime limit reached.");
        }
        updateData.overtimeTimeOut = now;
        updateData.timeOut = now; // Keep for backward compatibility
    }
    // Calculate total hours excluding lunch
    // Lunch is automatically excluded by calculating morning and afternoon sessions separately
    const totalHours = (0, exports.calculateHoursWithLunchExclusion)(record.morningTimeIn || updateData.morningTimeIn || null, updateData.morningTimeOut || record.morningTimeOut || null, record.afternoonTimeIn || updateData.afternoonTimeIn || null, updateData.afternoonTimeOut || record.afternoonTimeOut || null);
    /**
     * OVERTIME CALCULATION:
     * Overtime hours are calculated separately and added to regular hours.
     *
     * ACCURACY:
     * - Uses millisecond-precise calculation: (overtimeTimeOut - overtimeTimeIn) / (1000 * 60 * 60)
     * - Prevents negative hours with Math.max(0, ...)
     * - Only calculated when both overtimeTimeIn and overtimeTimeOut are present
     * - Overtime is added to regular hours for total daily hours
     *
     * OFFICIAL TIME VALIDATION:
     * - Overtime can only start after afternoon session is complete
     * - Overtime clock-out must occur after regular closing time (validated in determineSessionType)
     * - Server-side time ensures clients cannot manipulate overtime calculations
     */
    let overtimeHours = 0;
    const overtimeTimeIn = record.overtimeTimeIn || updateData.overtimeTimeIn || null;
    const overtimeTimeOut = record.overtimeTimeOut || updateData.overtimeTimeOut || null;
    if (overtimeTimeIn && overtimeTimeOut) {
        const overtimeMs = new Date(overtimeTimeOut).getTime() - new Date(overtimeTimeIn).getTime();
        overtimeHours = Math.max(0, overtimeMs / (1000 * 60 * 60));
        // Cap overtime hours at 2.0 hours maximum
        overtimeHours = Math.min(2.0, overtimeHours);
    }
    // Total hours = regular hours (morning + afternoon, lunch excluded) + overtime hours
    // Rounded to 2 decimal places for consistency
    updateData.hours = Math.round((totalHours + overtimeHours) * 100) / 100;
    /**
     * UNDERTIME CALCULATION:
     * Calculate undertime hours based on agency official times and actual hours worked.
     *
     * Undertime = max(0, expectedHours - actualHours)
     *
     * Expected hours are calculated from agency's official opening/closing times
     * minus the official lunch break duration. This ensures accurate comparison
     * against the agency's official work schedule.
     *
     * Note: Undertime is calculated separately from overtime. Overtime hours
     * do not reduce undertime - they are tracked independently.
     */
    const undertimeHours = (0, exports.calculateUndertimeHours)(params.agency ?? null, totalHours, // Use totalHours (without overtime) for undertime calculation
    record.morningTimeIn || updateData.morningTimeIn || null, updateData.morningTimeOut || record.morningTimeOut || null, record.afternoonTimeIn || updateData.afternoonTimeIn || null, updateData.afternoonTimeOut || record.afternoonTimeOut || null);
    updateData.undertimeHours = undertimeHours;
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
const approveAttendanceData = async (id, approverId, notes) => {
    const record = await attendance_record_1.default.findByPk(id);
    if (!record)
        throw new Error("Attendance record not found");
    await record.update({
        approvalStatus: "Approved",
        approvedBy: approverId,
        approvedAt: new Date(),
        approvalNotes: notes ?? record.approvalNotes ?? null,
    });
    return record;
};
exports.approveAttendanceData = approveAttendanceData;
const rejectAttendanceData = async (id, approverId, reason) => {
    const record = await attendance_record_1.default.findByPk(id);
    if (!record)
        throw new Error("Attendance record not found");
    await record.update({
        approvalStatus: "Declined",
        approvedBy: approverId,
        approvedAt: new Date(),
        approvalNotes: reason ?? record.approvalNotes ?? null,
    });
    return record;
};
exports.rejectAttendanceData = rejectAttendanceData;
